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
    REVERSE_API_REGION_MAP,
    DNIPRO_REGIONS,
    NEW_API_REGIONS,
)

_LOGGER = logging.getLogger(__name__)

TZ_KYIV = dt_util.get_time_zone("Europe/Kyiv")
MIN_REUSE_SECONDS = 600
MIDNIGHT_BLOCK_MINUTES = 20


class SvitloCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Тягне JSON з API і будує дані для конкретного region/queue з підтримкою fallback."""

    def __init__(self, hass: HomeAssistant, config: dict[str, Any], hub: Any) -> None:
        self.hass = hass
        self.hub = hub
        self.region: str = config[CONF_REGION] 
        self.queue: str = config[CONF_QUEUE]

        self.is_new_api = False
        self.api_region_key = self.region
        self.source_url = OLD_API_URL
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

    def _get_candidate_keys(self, region: str, is_new: bool) -> list[str]:
        """Отримує список можливих ключів регіону для заданого API."""
        candidates: list[str] = []
        if is_new:
            if region in API_REGION_MAP:
                candidates.append(API_REGION_MAP[region])
            candidates.append(region)
        else:
            if region in REVERSE_API_REGION_MAP:
                candidates.append(REVERSE_API_REGION_MAP[region])
            if region in DNIPRO_REGIONS:
                candidates.append("dnipropetrovska-oblast")
            candidates.append(region)
            if region in API_REGION_MAP:
                candidates.append(API_REGION_MAP[region])
        seen: set[str] = set()
        return [x for x in candidates if not (x in seen or seen.add(x))]

    def _find_region_and_schedule(
        self, api_data: Optional[dict[str, Any]], candidate_keys: list[str]
    ) -> tuple[Optional[dict[str, Any]], Optional[str], Optional[dict[str, Any]]]:
        """Знаходить об'єкт регіону, його ключ та розклад для черги."""
        if not api_data:
            return None, None, None
        for r in api_data.get("regions", []):
            cpu = r.get("cpu")
            if cpu in candidate_keys:
                sched = (r.get("schedule") or {}).get(self.queue) or {}
                return r, cpu, sched
        return None, None, None

    def _score_schedule(self, schedule: Optional[dict[str, Any]], date_iso: str) -> int:
        """
        Оцінює якість розкладу на дату:
        2 - є слоти 1 або 2 (світло є / немає)
        1 - є ключ дати (наприклад, 0 - без обмежень)
        0 - відсутні дані на дату
        """
        if not schedule or date_iso not in schedule:
            return 0
        slots = schedule[date_iso]
        if isinstance(slots, dict) and any(v in (1, 2) for v in slots.values()):
            return 2
        return 1

    async def _async_update_data(self) -> dict[str, Any]:
        """Fetch and parse data with automatic fallback between New and Old APIs."""
        # 1) Отримуємо каталог регіонів для визначення пріоритетного API
        catalog = await self.hub.get_regions_catalog()

        target_id = self.region
        mapped_id = API_REGION_MAP.get(self.region)

        region_info = next((r for r in catalog if r["id"] == target_id), None)
        if not region_info and mapped_id:
            region_info = next((r for r in catalog if r["id"] == mapped_id), None)
            if region_info:
                target_id = mapped_id

        if region_info:
            primary_is_new = region_info["is_new_api"]
            primary_key = target_id
        else:
            primary_is_new = (self.region in NEW_API_REGIONS or mapped_id in NEW_API_REGIONS)
            primary_key = mapped_id if mapped_id and primary_is_new else self.region

        today_iso = dt_util.now(TZ_KYIV).date().isoformat()
        tomorrow_iso = (dt_util.now(TZ_KYIV).date() + timedelta(days=1)).isoformat()

        # 2) Завантажуємо первинне джерело
        primary_json = await self.hub.ensure_data(is_new=primary_is_new)
        prim_candidates = self._get_candidate_keys(primary_key, is_new=primary_is_new)
        prim_reg, prim_key, prim_sched = self._find_region_and_schedule(primary_json, prim_candidates)
        prim_score = self._score_schedule(prim_sched, today_iso)
        prim_emergency = bool(prim_reg and prim_reg.get("emergency"))

        # 3) Перевіряємо альтернативне джерело (fallback), якщо в первинному немає повних даних
        # Якщо в первинному джерелі активні екстрені відключення (emergency), графіків може не бути (це норма).
        # Не шукаємо fallback якщо діє emergency у первинному і регіон знайдено.
        fallback_is_new = not primary_is_new
        fallback_json = None
        fall_reg, fall_key, fall_sched = None, None, None
        fall_score = 0

        if (prim_score < 2 and not prim_emergency) or not prim_reg:
            fallback_json = await self.hub.ensure_data(is_new=fallback_is_new)
            fall_candidates = self._get_candidate_keys(primary_key, is_new=fallback_is_new)
            fall_reg, fall_key, fall_sched = self._find_region_and_schedule(fallback_json, fall_candidates)
            fall_score = self._score_schedule(fall_sched, today_iso)

        # Перемикаємося на fallback тільки якщо:
        # 1) fall_score > prim_score
        # 2) І у первинному джерелі НЕМАЄ активного emergency (бо пустий розклад при emergency є штатною ситуацією,
        #    і його не можна замінювати заглушкою з нулями зі старого API).
        if fall_score > prim_score and not prim_emergency:
            _LOGGER.warning(
                "Using fallback API (%s) for %s/%s (primary score=%d vs fallback score=%d)",
                OLD_API_URL if not fallback_is_new else DTEK_API_URL,
                self.region,
                self.queue,
                prim_score,
                fall_score,
            )
            used_is_new = fallback_is_new
            used_reg = fall_reg
            used_key = fall_key
            used_sched = fall_sched
            used_json = fallback_json
            other_sched = prim_sched
            other_is_new = primary_is_new
        else:
            used_is_new = primary_is_new
            used_reg = prim_reg
            used_key = prim_key
            used_sched = prim_sched
            used_json = primary_json
            other_sched = fall_sched
            other_is_new = fallback_is_new

        if not used_reg:
            if fallback_json is None:
                fallback_json = await self.hub.ensure_data(is_new=fallback_is_new)
                fall_candidates = self._get_candidate_keys(primary_key, is_new=fallback_is_new)
                fall_reg, fall_key, fall_sched = self._find_region_and_schedule(fallback_json, fall_candidates)
                if fall_reg:
                    used_is_new = fallback_is_new
                    used_reg = fall_reg
                    used_key = fall_key
                    used_sched = fall_sched
                    used_json = fallback_json

        if not used_reg:
            raise UpdateFailed(f"Region '{self.region}' not found in API response")

        self.is_new_api = used_is_new
        self.api_region_key = used_key or self.region
        self.source_url = DTEK_API_URL if used_is_new else OLD_API_URL

        # Визначаємо слоти на сьогодні та завтра
        slots_today_map = (used_sched or {}).get(today_iso) or {}
        slots_tomorrow_map = (used_sched or {}).get(tomorrow_iso) or {}

        # Якщо на завтра немає графіка в основному джерелі, перевіряємо альтернативне
        # (тільки якщо в основному джерелі не активна аварія без розкладів)
        if self._score_schedule(used_sched, tomorrow_iso) < 2 and not prim_emergency:
            if other_sched is None and fallback_json is None:
                fallback_json = await self.hub.ensure_data(is_new=other_is_new)
                fall_candidates = self._get_candidate_keys(primary_key, is_new=other_is_new)
                _, _, other_sched = self._find_region_and_schedule(fallback_json, fall_candidates)

            if other_sched and self._score_schedule(other_sched, tomorrow_iso) == 2:
                slots_tomorrow_map = other_sched.get(tomorrow_iso) or {}
                _LOGGER.debug(
                    "Augmenting tomorrow schedule for %s from alternative API",
                    self.region
                )

        # Статус екстрених відключень: якщо хоча б одне джерело (особливо первинне) повідомляє про аварію
        is_emergency = bool(
            (used_reg and used_reg.get("emergency"))
            or (prim_reg and prim_reg.get("emergency"))
            or (fall_reg and fall_reg.get("emergency"))
        )

        try:
            payload = self._build_payload(
                used_reg=used_reg,
                slots_today_map=slots_today_map,
                slots_tomorrow_map=slots_tomorrow_map,
                today_iso=today_iso,
                tomorrow_iso=tomorrow_iso,
                source_url=self.source_url,
                is_emergency=is_emergency,
            )
        except Exception as e:
            raise UpdateFailed(f"Parse/Build error for {self.region}: {e}") from e

        # 4) Precise tick
        self._schedule_precise_refresh(payload)
        return payload

    def _build_payload(
        self,
        used_reg: dict[str, Any],
        slots_today_map: dict[str, int],
        slots_tomorrow_map: dict[str, int],
        today_iso: str,
        tomorrow_iso: str,
        source_url: str,
        is_emergency: Optional[bool] = None,
    ) -> dict[str, Any]:
        """Побудова внутрішнього стану координатора."""
        # Check for Day Rollover (Midnight)
        if self.data and self.data.get("date") and today_iso:
            previous_date = self.data["date"]
            if previous_date != today_iso:
                _LOGGER.debug("Day rollover detected: %s -> %s. Clearing history.", previous_date, today_iso)
                self._history_today = []
                self._history_tomorrow = []

        if is_emergency is None:
            is_emergency = bool(used_reg.get("emergency", False))
        has_any_slots = any(v in (1, 2) for v in slots_today_map.values())
        if not has_any_slots:
            base_day = datetime.fromisoformat(today_iso).date()
            return {
                "queue": self.queue,
                "date": base_day.isoformat(),
                "now_status": "nosched",
                "now_halfhour_index": None,
                "next_change_at": None,
                "today_48half": [],
                "updated": dt_util.utcnow().replace(microsecond=0).isoformat(),
                "source": source_url,
                "next_on_at": None,
                "next_off_at": None,
                "is_emergency": is_emergency,
                "today_outage_hours": None,
                "tomorrow_outage_hours": None,
                "longest_outage_hours": None,
                "history_today_48half": [],
                "history_tomorrow_48half": [],
                "tomorrow_date": None,
                "tomorrow_48half": [],
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
        # If all slots are "unknown", there's no real schedule → treat as empty
        if tomorrow_half and all(s == "unknown" for s in tomorrow_half):
            tomorrow_half = []

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
        base_day = datetime.fromisoformat(today_iso).date()
        
        if now_local.date() != base_day:
            idx = 0
        else:
            idx = now_local.hour * 2 + (1 if now_local.minute >= 30 else 0)

        cur = today_half[idx] if today_half else "unknown"

        next_on_at = self._find_next_at(["on"], base_day, today_half, idx, tomorrow_iso, tomorrow_half)
        next_off_at = self._find_next_at(["off"], base_day, today_half, idx, tomorrow_iso, tomorrow_half)

        # Determine next change time based on current status and calculated timestamps
        if cur == "off":
            next_change_iso = next_on_at
        elif cur == "on":
            next_change_iso = next_off_at
        else:
            # For "unknown" status, pick the earliest transition (either on or off)
            if next_on_at and next_off_at:
                next_change_iso = min(next_on_at, next_off_at)
            else:
                next_change_iso = next_on_at or next_off_at

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
            "source": source_url,
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
        if self.data and self.data.get("date") == today_iso:
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

        if tomorrow_iso and tomorrow_half:
            data["tomorrow_date"] = tomorrow_iso
            data["tomorrow_48half"] = tomorrow_half

        return data

    def _build_from_api(self, api: dict[str, Any]) -> dict[str, Any]:
        """Зворотна сумісність для прямих викликів _build_from_api."""
        today_iso = api.get("date_today") or dt_util.now(TZ_KYIV).date().isoformat()
        tomorrow_iso = api.get("date_tomorrow") or (dt_util.now(TZ_KYIV).date() + timedelta(days=1)).isoformat()
        regions_list = api.get("regions", [])
        region_obj = next((r for r in regions_list if r.get("cpu") == self.api_region_key), None)
        if not region_obj:
            raise ValueError(f"Region '{self.api_region_key}' not found in API response")
        schedule = (region_obj.get("schedule") or {}).get(self.queue) or {}
        slots_today_map = schedule.get(today_iso) or {}
        slots_tomorrow_map = schedule.get(tomorrow_iso) or {}
        source_url = DTEK_API_URL if self.is_new_api else OLD_API_URL
        return self._build_payload(
            used_reg=region_obj,
            slots_today_map=slots_today_map,
            slots_tomorrow_map=slots_tomorrow_map,
            today_iso=today_iso,
            tomorrow_iso=tomorrow_iso,
            source_url=source_url,
        )

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
    def _find_next_at(
        target_states: list[str],
        base_date: date,
        today_half: list[str],
        idx: int,
        tomorrow_date_iso: Optional[str],
        tomorrow_half: Optional[list[str]],
    ) -> Optional[str]:
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
