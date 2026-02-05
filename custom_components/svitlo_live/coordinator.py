from __future__ import annotations

import asyncio
import logging
import json
from datetime import datetime, timedelta, date, time
from typing import Any, Optional, Callable

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_point_in_utc_time
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .const import (
    DOMAIN,
    OLD_API_URL,
    DTEK_API_URL,
    CONF_REGION,
    CONF_QUEUE,
    DEFAULT_SCAN_INTERVAL,
    API_REGION_MAP,
    NEW_API_REGIONS,  # <--- Імпортуємо множину нових регіонів
)

_LOGGER = logging.getLogger(__name__)

TZ_KYIV = dt_util.get_time_zone("Europe/Kyiv")
MIN_REUSE_SECONDS = 600
MIDNIGHT_BLOCK_MINUTES = 20


class SvitloCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Тягне JSON з API і будує дані для конкретного region/queue."""

    def __init__(self, hass: HomeAssistant, config: dict[str, Any], hub: Any) -> None:
        self.hass = hass
        self.hub = hub
        self.region: str = config[CONF_REGION] 
        self.queue: str = config[CONF_QUEUE]

        # We need to know if this region is from New API or Old API.
        # For legacy entries, we'll try to find it in the current catalog.
        self.is_new_api = False
        self.api_region_key = self.region
        self._history_today: list[list[str]] = []
        self._history_tomorrow: list[list[str]] = []

        scan_seconds = int(config.get("scan_interval_seconds", DEFAULT_SCAN_INTERVAL))


        self._unsub_precise: Optional[Callable[[], None]] = None

        super().__init__(
            hass=hass,
            logger=_LOGGER,
            name=f"svitlo_live_{self.region}_{self.queue}",
            update_interval=timedelta(seconds=scan_seconds),
        )

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch and parse data from the appropriate API."""
        # 1) Get regions to find out which API to use and what the actual key is
        catalog = await self.hub.get_regions_catalog()
        
        # Try finding by exact match or mapped match
        target_id = self.region
        mapped_id = API_REGION_MAP.get(self.region)
        
        region_info = next((r for r in catalog if r["id"] == target_id), None)
        if not region_info and mapped_id:
            region_info = next((r for r in catalog if r["id"] == mapped_id), None)
            if region_info:
                target_id = mapped_id
        
        if region_info:
            self.is_new_api = region_info["is_new_api"]
            self.api_region_key = target_id
        else:
            # Fallback for completely unknown regions
            _LOGGER.warning("Region %s not found in dynamic catalog", self.region)
            self.is_new_api = (self.region in NEW_API_REGIONS or mapped_id in NEW_API_REGIONS)
            self.api_region_key = mapped_id if mapped_id and self.is_new_api else self.region

        # 2) Fetch fresh JSON from appropriate API
        last_json = await self.hub.ensure_data(is_new=self.is_new_api)
        if not last_json:
            raise UpdateFailed(f"No data available for {'New' if self.is_new_api else 'Old'} API")

        # 2) Parse
        try:
            payload = self._build_from_api(last_json)
        except Exception as e:
            raise UpdateFailed(f"Parse/Build error for {self.region}: {e}") from e

        # 3) Precise tick
        self._schedule_precise_refresh(payload)
        return payload

    def _build_from_api(self, api: dict[str, Any]) -> dict[str, Any]:
        date_today = api.get("date_today")
        date_tomorrow = api.get("date_tomorrow")

        # Шукаємо регіон.
        # self.api_region_key вже налаштовано в __init__:
        # - для нових областей це правильний ключ (kharkivska...)
        # - для старих областей це старий ключ (mikolaivska...)
        regions_list = api.get("regions", [])
        region_obj = next((r for r in regions_list if r.get("cpu") == self.api_region_key), None)
        
        if not region_obj:
            raise ValueError(f"Region '{self.api_region_key}' not found in API response")

        # --- Стандартна логіка парсингу (без змін) ---
        is_emergency = region_obj.get("emergency", False)
        schedule = (region_obj.get("schedule") or {}).get(self.queue) or {}
        slots_today_map = schedule.get(date_today) or {}
        slots_tomorrow_map = schedule.get(date_tomorrow) or {}

        has_any_slots = any(v in (1, 2) for v in slots_today_map.values())
        if not has_any_slots:
             base_day = datetime.fromisoformat(date_today).date() if date_today else dt_util.now(TZ_KYIV).date()
             return {
                "queue": self.queue,
                "date": base_day.isoformat(),
                "now_status": "nosched",
                "now_halfhour_index": None,
                "next_change_at": None,
                "today_48half": [],
                "updated": dt_util.utcnow().replace(microsecond=0).isoformat(),
                "source": DTEK_API_URL if self.is_new_api else OLD_API_URL,
                "next_on_at": None,
                "next_off_at": None,
                "is_emergency": is_emergency,
             }

        def build_half_list(slots_map: dict[str, int]) -> list[str]:
            res: list[str] = []
            for h in range(24):
                for m in (0, 30):
                    label = f"{h:02d}:{m:02d}"
                    code = int(slots_map.get(label, 0))
                    if code == 1: res.append("on")
                    elif code == 2: res.append("off")
                    else: res.append("unknown")
            return res

        today_half = build_half_list(slots_today_map)
        tomorrow_half = build_half_list(slots_tomorrow_map) if slots_tomorrow_map else []

        # --- Statistics calculation ---
        today_outage_hours = today_half.count("off") * 0.5
        tomorrow_outage_hours = tomorrow_half.count("off") * 0.5 if tomorrow_half else None

        def get_longest_consecutive_off(series: list[str]) -> float:
            max_count = 0
            current_count = 0
            for state in series:
                if state == "off":
                    current_count += 1
                else:
                    max_count = max(max_count, current_count)
                    current_count = 0
            max_count = max(max_count, current_count)
            return max_count * 0.5

        # Longest outage can span across today and tomorrow if available
        combined_half = today_half + (tomorrow_half or [])
        longest_outage = get_longest_consecutive_off(combined_half)

        now_local = dt_util.now(TZ_KYIV)
        base_day = datetime.fromisoformat(date_today).date() if date_today else now_local.date()
        
        if now_local.date() != base_day:
            idx = 0
        else:
            idx = now_local.hour * 2 + (1 if now_local.minute >= 30 else 0)

        cur = today_half[idx] if today_half else "unknown"

        next_on_at = self._find_next_at(["on"], base_day, today_half, idx, date_tomorrow, tomorrow_half)
        next_off_at = self._find_next_at(["off"], base_day, today_half, idx, date_tomorrow, tomorrow_half)

        # Determine next change time based on current status and calculated timestamps
        next_change_iso = next_on_at if cur == "off" else next_off_at
        next_change_hhmm = None
        if next_change_iso:
            try:
                dt_change = dt_util.parse_datetime(next_change_iso)
                if dt_change:
                    # Localize to Kyiv to get the correct HH:MM
                    dt_local = self._localize_kyiv(dt_change)
                    next_change_hhmm = dt_local.strftime("%H:%M")
            except Exception as e:
                _LOGGER.debug("Error formatting next_change_at: %s", e)

        data = {
            "queue": self.queue,
            "date": base_day.isoformat(),
            "now_status": cur,
            "now_halfhour_index": idx,
            "next_change_at": next_change_hhmm,
            "today_48half": today_half,
            "updated": dt_util.utcnow().replace(microsecond=0).isoformat(),
            "source": DTEK_API_URL if self.is_new_api else OLD_API_URL,
            "next_on_at": next_on_at,
            "next_off_at": next_off_at,
            "today_outage_hours": today_outage_hours,
            "tomorrow_outage_hours": tomorrow_outage_hours,
            "longest_outage_hours": longest_outage,
            "history_today_48half": self._history_today,
            "history_tomorrow_48half": self._history_tomorrow,
            "is_emergency": is_emergency,
        }

        # Update "history" (store up to 3 previous versions)
        if self.data:
            old_today = self.data.get("today_48half", [])
            if today_half and old_today and today_half != old_today:
                if not self._history_today or old_today != self._history_today[0]:
                    self._history_today.insert(0, old_today)
                    self._history_today = self._history_today[:3]
                data["history_today_48half"] = self._history_today
            
            old_tomorrow = self.data.get("tomorrow_48half", [])
            if tomorrow_half and old_tomorrow and tomorrow_half != old_tomorrow:
                if not self._history_tomorrow or old_tomorrow != self._history_tomorrow[0]:
                    self._history_tomorrow.insert(0, old_tomorrow)
                    self._history_tomorrow = self._history_tomorrow[:3]
                data["history_tomorrow_48half"] = self._history_tomorrow

        if date_tomorrow and tomorrow_half:
            data["tomorrow_date"] = date_tomorrow
            data["tomorrow_48half"] = tomorrow_half

        return data

    # ... методи _localize_kyiv, _schedule_precise_refresh та статичні методи без змін ...
    def _localize_kyiv(self, d: datetime) -> datetime:
        if d.tzinfo is not None:
            return d.astimezone(TZ_KYIV)
        localize = getattr(TZ_KYIV, "localize", None)
        if callable(localize):
            return localize(d)
        return d.replace(tzinfo=TZ_KYIV)

    def _schedule_precise_refresh(self, data: dict[str, Any]) -> None:
        if data.get("now_status") == "nosched":
            if self._unsub_precise:
                self._unsub_precise()
                self._unsub_precise = None
            return

        if self._unsub_precise:
            self._unsub_precise()
            self._unsub_precise = None

        next_change_hhmm = data.get("next_change_at")
        base_date_iso = data.get("date")
        if not next_change_hhmm or not base_date_iso:
            return

        try:
            hh, mm = [int(x) for x in next_change_hhmm.split(":")]
            base_day = datetime.fromisoformat(base_date_iso).date()
            local_naive = datetime.combine(base_day, time(hour=hh, minute=mm, second=0, microsecond=0))
            candidate_kyiv = self._localize_kyiv(local_naive)
            now_kyiv = dt_util.now(TZ_KYIV)
            if candidate_kyiv <= now_kyiv:
                candidate_kyiv = candidate_kyiv + timedelta(days=1)
            candidate_utc = dt_util.as_utc(candidate_kyiv)

            @callback
            def _tick(_now) -> None:
                self.hass.async_create_task(self.async_request_refresh())

            self._unsub_precise = async_track_point_in_utc_time(self.hass, _tick, candidate_utc)
        except Exception as e:
            _LOGGER.debug("Failed to schedule precise refresh: %s", e)

    @staticmethod
    def _find_next_at(target_states: list[str], base_date: date, today_half: list[str], idx: int, tomorrow_date_iso: Optional[str], tomorrow_half: Optional[list[str]]) -> Optional[str]:
        if not today_half: return None
        today_tail = today_half[idx + 1 :]
        seq = list(today_tail)
        has_tomorrow = bool(tomorrow_date_iso and tomorrow_half)
        if has_tomorrow: seq.extend(tomorrow_half or [])
        
        pos = next((i for i, s in enumerate(seq) if s in target_states), None)
        if pos is None: return None

        if pos < len(today_tail):
            base_local_midnight = datetime.combine(base_date, datetime.min.time(), tzinfo=TZ_KYIV)
            minutes_from_base = (idx + 1 + pos) * 30
            next_local = base_local_midnight + timedelta(minutes=minutes_from_base)
        else:
            if not has_tomorrow: return None
            tomorrow_date = datetime.fromisoformat(tomorrow_date_iso).date()
            base_local_midnight = datetime.combine(tomorrow_date, datetime.min.time(), tzinfo=TZ_KYIV)
            minutes_into_tomorrow = (pos - len(today_tail)) * 30
            next_local = base_local_midnight + timedelta(minutes=minutes_into_tomorrow)

        return dt_util.as_utc(next_local).isoformat()
