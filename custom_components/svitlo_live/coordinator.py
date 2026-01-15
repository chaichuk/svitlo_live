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
    API_URL,  # Тепер це ваш dtek-api worker
    CONF_REGION,
    CONF_QUEUE,
    DEFAULT_SCAN_INTERVAL,
    API_REGION_MAP, # <--- Імпортуємо мапу
)

_LOGGER = logging.getLogger(__name__)

TZ_KYIV = dt_util.get_time_zone("Europe/Kyiv")
MIN_REUSE_SECONDS = 600
MIDNIGHT_BLOCK_MINUTES = 20


class SvitloCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Тягне JSON з API і будує дані для конкретного region/queue."""

    def __init__(self, hass: HomeAssistant, config: dict[str, Any]) -> None:
        self.hass = hass
        self.region: str = config[CONF_REGION]  # Це "старий" ключ з конфігу (harkivska...)
        self.queue: str = config[CONF_QUEUE]

        # --- ВИЗНАЧАЄМО КЛЮЧ ДЛЯ ЗАПИТУ В API ---
        # Якщо регіон є в мапі перекладу - беремо нову назву, інакше - стару
        self.api_region_key = API_REGION_MAP.get(self.region, self.region)

        scan_seconds = int(config.get("scan_interval_seconds", DEFAULT_SCAN_INTERVAL))

        shared = hass.data.setdefault(DOMAIN, {})
        if "_shared_api" not in shared:
            shared["_shared_api"] = {
                "lock": asyncio.Lock(),
                "last_json": None,
                "last_json_utc": None,
            }
        self._shared_api = shared["_shared_api"]

        self._unsub_precise: Optional[Callable[[], None]] = None

        super().__init__(
            hass=hass,
            logger=_LOGGER,
            # Ім'я координатора використовує self.region (старий ключ), щоб не плодити нові об'єкти
            name=f"svitlo_live_{self.region}_{self.queue}",
            update_interval=timedelta(seconds=scan_seconds),
        )

    async def _async_update_data(self) -> dict[str, Any]:
        # Використовуємо одну URL для всіх
        target_url = API_URL
        cache_key_json = "last_json"
        cache_key_utc = "last_json_utc"

        now_utc = dt_util.utcnow()
        shared = self._shared_api
        
        last_json = shared.get(cache_key_json)
        last_json_utc: Optional[datetime] = shared.get(cache_key_utc)

        should_reuse = (
            last_json is not None
            and last_json_utc is not None
            and (now_utc - last_json_utc).total_seconds() < MIN_REUSE_SECONDS
        )

        if not should_reuse:
            async with shared["lock"]:
                last_json = shared.get(cache_key_json)
                last_json_utc = shared.get(cache_key_utc)
                
                should_reuse = (
                    last_json is not None
                    and last_json_utc is not None
                    and (dt_util.utcnow() - last_json_utc).total_seconds() < MIN_REUSE_SECONDS
                )

                if not should_reuse:
                    # Midnight guard
                    now_kyiv = dt_util.now(TZ_KYIV)
                    if now_kyiv.hour == 0 and now_kyiv.minute < MIDNIGHT_BLOCK_MINUTES:
                        if last_json is None:
                            raise UpdateFailed("Midnight guard active and no data")
                        _LOGGER.debug("Midnight guard active, reusing cached data")
                    else:
                        # Fetch
                        try:
                            session = async_get_clientsession(self.hass)
                            _LOGGER.debug("Fetching API: %s", target_url)
                            
                            async with session.get(target_url, timeout=30) as resp:
                                if resp.status != 200:
                                    raise UpdateFailed(f"HTTP {resp.status}")
                                
                                raw_response = await resp.json(content_type=None)
                                
                                # Обробка "body" з воркера
                                body_str = raw_response.get("body")
                                if body_str:
                                    try:
                                        final_data = json.loads(body_str)
                                    except json.JSONDecodeError as err:
                                        raise UpdateFailed(f"Failed to parse Worker body: {err}")
                                elif "regions" in raw_response:
                                    # Фолбек, якщо воркер віддав чистий JSON
                                    final_data = raw_response
                                else:
                                    raise UpdateFailed("Response missing 'body' or 'regions'")

                                last_json = final_data
                                shared[cache_key_json] = last_json
                                shared[cache_key_utc] = dt_util.utcnow()
                                
                        except Exception as e:
                            raise UpdateFailed(f"Network error: {e}") from e

        # 2) Parse
        try:
            payload = self._build_from_api(last_json)
        except Exception as e:
            raise UpdateFailed(f"Parse error: {e}") from e

        # 3) Precise tick
        self._schedule_precise_refresh(payload)
        return payload

    def _build_from_api(self, api: dict[str, Any]) -> dict[str, Any]:
        date_today = api.get("date_today")
        date_tomorrow = api.get("date_tomorrow")

        # --- ТУТ ГОЛОВНА ЗМІНА ---
        # Шукаємо за self.api_region_key (правильний ключ з API: kharkivska-oblast),
        # а не self.region (старий ключ з конфігу: harkivska-oblast)
        regions_list = api.get("regions", [])
        region_obj = next((r for r in regions_list if r.get("cpu") == self.api_region_key), None)
        
        if not region_obj:
            # Для діагностики виводимо обидва ключі
            raise ValueError(f"Region '{self.api_region_key}' (cfg: {self.region}) not found in API.")

        # --- Далі все стандартно ---
        is_emergency = region_obj.get("emergency", False)

        schedule = (region_obj.get("schedule") or {}).get(self.queue) or {}
        slots_today_map = schedule.get(date_today) or {}
        slots_tomorrow_map = schedule.get(date_tomorrow) or {}

        # ... (Код обробки nosched та build_half_list без змін) ...
        # (Копіюйте з вашого попереднього робочого варіанту, логіка парсингу не змінюється)
        
        # Для скорочення відповіді, вставляю тільки початок блоку nosched, 
        # решту функції _build_from_api залишаєте як було:
        
        has_any_slots = any(v in (1, 2) for v in slots_today_map.values())
        if not has_any_slots:
             base_day = datetime.fromisoformat(date_today).date() if date_today else dt_util.now(TZ_KYIV).date()
             # ... повертаємо data_nosched ...
             return {
                "queue": self.queue,
                "date": base_day.isoformat(),
                "now_status": "nosched",
                # ... інші поля
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

        now_local = dt_util.now(TZ_KYIV)
        base_day = datetime.fromisoformat(date_today).date() if date_today else now_local.date()
        
        if now_local.date() != base_day:
            idx = 0
        else:
            idx = now_local.hour * 2 + (1 if now_local.minute >= 30 else 0)

        cur = today_half[idx] if today_half else "unknown"
        
        # ... розрахунок next_change ...
        nci = self._next_change_idx(today_half, idx) if today_half else None
        next_change_hhmm = None
        if nci is not None:
            h = nci // 2
            m = 30 if (nci % 2) else 0
            next_change_hhmm = f"{h:02d}:{m:02d}"

        next_on_at = self._find_next_at(["on"], base_day, today_half, idx, date_tomorrow, tomorrow_half)
        next_off_at = self._find_next_at(["off"], base_day, today_half, idx, date_tomorrow, tomorrow_half)

        data = {
            "queue": self.queue,
            "date": base_day.isoformat(),
            "now_status": cur,
            "now_halfhour_index": idx,
            "next_change_at": next_change_hhmm,
            "today_48half": today_half,
            "updated": dt_util.utcnow().replace(microsecond=0).isoformat(),
            "source": API_URL,
            "next_on_at": next_on_at,
            "next_off_at": next_off_at,
            "is_emergency": is_emergency,
        }

        if date_tomorrow and tomorrow_half:
            data["tomorrow_date"] = date_tomorrow
            data["tomorrow_48half"] = tomorrow_half

        return data

    # ... методи _localize_kyiv, _schedule_precise_refresh, _next_change_idx, _find_next_at без змін ...
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
    def _next_change_idx(series: list[str], idx: int) -> Optional[int]:
        if not series: return None
        cur = series[idx]
        n = len(series)
        for step in range(1, n + 1):
            j = (idx + step) % n
            if series[j] != cur: return j
        return None

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
