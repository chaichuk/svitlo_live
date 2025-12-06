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
    API_URL,
    DTEK_API_URL,
    POE_WEBSITE_URL,
    CONF_REGION,
    CONF_QUEUE,
    DEFAULT_SCAN_INTERVAL,
)

_LOGGER = logging.getLogger(__name__)

# Таймзона України
TZ_KYIV = dt_util.get_time_zone("Europe/Kyiv")

# Спільний кеш: скільки секунд перевикористовуємо JSON
MIN_REUSE_SECONDS = 600

# Блок оновлень навколо опівночі
MIDNIGHT_BLOCK_MINUTES = 20


class SvitloCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Тягне JSON з API і будує дані для конкретного region/queue."""

    def __init__(self, hass: HomeAssistant, config: dict[str, Any]) -> None:
        self.hass = hass
        self.region: str = config[CONF_REGION]
        self.queue: str = config[CONF_QUEUE]

        scan_seconds = int(config.get("scan_interval_seconds", DEFAULT_SCAN_INTERVAL))

        shared = hass.data.setdefault(DOMAIN, {})
        if "_shared_api" not in shared:
            shared["_shared_api"] = {
                "lock": asyncio.Lock(),
                # Кеш для загального API (svitlo.live)
                "last_json": None,
                "last_json_utc": None,
                # Кеш DTEK API
                "last_json_dtek": None,
                "last_json_utc_dtek": None,
                # Кеш для POE (Полтавська область)
                "last_json_poe": None,
                "last_json_utc_poe": None,
            }
        self._shared_api = shared["_shared_api"]

        self._unsub_precise: Optional[Callable[[], None]] = None

        super().__init__(
            hass=hass,
            logger=_LOGGER,
            name=f"svitlo_live_{self.region}_{self.queue}",
            update_interval=timedelta(seconds=scan_seconds),
        )

    async def _async_update_data(self) -> dict[str, Any]:
        # --- ВИЗНАЧАЄМО РЕЖИМ ---
        # Список регіонів, які ми беремо з ВАШОГО воркера
        # Додано: Львів, Київ (місто), Дніпро (ДнЕМ/ЦЕК)
        dtek_regions = {
            "kiivska-oblast", 
            "odeska-oblast", 
            "dnipropetrovska-oblast",
            "lvivska-oblast",
            "kyiv",
            "dnipro-dnem",
            "dnipro-cek"
        }
        poe_regions = {"poltavska-oblast"}
        
        # Визначаємо режим провайдера та URL
        if self.region in dtek_regions:
            provider_mode = "dtek"
            target_url = DTEK_API_URL
            cache_key_json = "last_json_dtek"
            cache_key_utc = "last_json_utc_dtek"
        elif self.region in poe_regions:
            provider_mode = "poe"
            target_url = POE_WEBSITE_URL
            cache_key_json = "last_json_poe"
            cache_key_utc = "last_json_utc_poe"
        else:
            provider_mode = "standard"
            target_url = API_URL
            cache_key_json = "last_json"
            cache_key_utc = "last_json_utc"

        # 1) Спільний кеш
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
                    # -------- MIDNIGHT GUARD --------
                    now_kyiv = dt_util.now(TZ_KYIV)
                    if now_kyiv.hour == 0 and now_kyiv.minute < MIDNIGHT_BLOCK_MINUTES:
                        if last_json is None:
                            raise UpdateFailed(
                                "Midnight guard active and no cached data available yet"
                            )
                        _LOGGER.debug("Midnight guard active, reusing cached data")
                    else:
                        # -------- ФЕТЧ З ПОТРІБНОГО URL --------
                        try:
                            session = async_get_clientsession(self.hass)
                            _LOGGER.debug("Fetching API: %s (Mode: %s)", target_url, "DTEK+Yasno" if is_dtek_mode else ("POE" if provider_mode == "poe" else "STD"))
                            
                            async with session.get(target_url, timeout=30) as resp:
                                if resp.status != 200:
                                    raise UpdateFailed(f"HTTP {resp.status} for {target_url}")
                                
                                # ОБРОБКА ВІДПОВІДІ залежно від провайдера
                                if provider_mode == "poe":
                                    # POE повертає HTML, треба парсити
                                    html_content = await resp.text()
                                    final_data = self._parse_poe_html(html_content)
                                    
                                elif provider_mode == "dtek":
                                    # DTEK воркер повертає { "body": "stringified_json", ... }
                                    raw_response = await resp.json(content_type=None)
                                    body_str = raw_response.get("body")
                                    if not body_str:
                                        # Фолбек: якщо раптом воркер повернув звичайний JSON (на майбутнє)
                                        if "regions" in raw_response:
                                            final_data = raw_response
                                        else:
                                            raise UpdateFailed("DTEK Worker response missing 'body' field")
                                    else:
                                        try:
                                            final_data = json.loads(body_str)
                                        except json.JSONDecodeError as err:
                                            raise UpdateFailed(f"Failed to parse DTEK body JSON: {err}")
                                else:
                                    # Стандартний API віддає чистий JSON
                                    raw_response = await resp.json(content_type=None)
                                    final_data = raw_response

                                # Зберігаємо в кеш
                                last_json = final_data
                                shared[cache_key_json] = last_json
                                shared[cache_key_utc] = dt_util.utcnow()
                                
                        except Exception as e:
                            raise UpdateFailed(f"Network error ({target_url}): {e}") from e

        # 2) Побудова payload
        try:
            payload = self._build_from_api(last_json)
        except Exception as e:
            raise UpdateFailed(f"Parse/build error: {e}") from e

        # 3) Точний тик
        self._schedule_precise_refresh(payload)
        return payload

    # ---------------------------------------------------------------------
    # POE HTML Parser
    # ---------------------------------------------------------------------

    def _parse_poe_html(self, html: str) -> dict[str, Any]:
        """Parse HTML from POE (poe.pl.ua) and convert to standard API format."""
        from bs4 import BeautifulSoup
        import re
        
        soup = BeautifulSoup(html, 'html.parser')
        
        # Визначаємо дати (сьогодні і завтра)
        now_kyiv = dt_util.now(TZ_KYIV)
        today = now_kyiv.date()
        tomorrow = today + timedelta(days=1)
        
        # Мапа українських місяців
        uk_months = {
            'січня': 1, 'лютого': 2, 'березня': 3, 'квітня': 4,
            'травня': 5, 'червня': 6, 'липня': 7, 'серпня': 8,
            'вересня': 9, 'жовтня': 10, 'листопада': 11, 'грудня': 12
        }
        
        # Шукаємо секції .gpvinfodetail
        sections = soup.find_all(class_='gpvinfodetail')
        
        schedules_by_date = {}  # {date_str: {queue: {time: state}}}
        
        for section in sections:
            # Витягуємо дату з тексту секції
            section_text = section.get_text()
            date_match = re.search(r'(\d+)\s+(\w+)\s+(\d{4})', section_text)
            
            if not date_match:
                continue
            
            day, month_name, year = date_match.groups()
            month_num = uk_months.get(month_name.lower())
            
            if not month_num:
                continue
            
            # Створюємо дату
            try:
                section_date = date(int(year), month_num, int(day))
            except ValueError:
                continue
            
            # Визначаємо чи це сьогодні або завтра
            if section_date != today and section_date != tomorrow:
                continue
            
            date_str = section_date.isoformat()
            
            # Шукаємо таблицю в цій секції
            table = section.find('table')
            if not table:
                continue
            
            rows = table.find_all('tr')
            if len(rows) < 4:  # Потрібно мінімум: заголовок, час "з", час "по", дані
                continue
            
            # Пропускаємо перші 3 рядки (заголовки та часи)
            # Рядок 1: "№ черги / підчерги" | "Години доби"
            # Рядок 2: "з 00:00" | "з 01:00" | ... (24 комірки)
            # Рядок 3: "по 01:00" | "по 02:00" | ... (24 комірки)
            # Рядки 4+: дані по чергах
            
            # Обробляємо рядки з даними (починаючи з 4-го рядка, індекс 3)
            for row in rows[3:]:
                cells = row.find_all(['td', 'th'])
                if len(cells) < 26:  # Мінімум: черга + підчерга + 24 години
                    continue
                
                # Перша комірка: номер черги (може бути "1 черга", "2 черга" і т.д.)
                # Друга комірка: підчерга (1 або 2)
                # Решта 24 комірки: години (по 2 півгодини на кожну)
                
                queue_cell = cells[0].get_text(strip=True)
                subqueue_cell = cells[1].get_text(strip=True)
                
                # Витягуємо номер черги
                queue_match = re.search(r'(\d+)', queue_cell)
                if not queue_match:
                    continue
                
                queue_num = queue_match.group(1)
                subqueue_num = subqueue_cell.strip()
                
                # Формуємо ідентифікатор черги (наприклад, "1.1", "3.2")
                queue_id = f"{queue_num}.{subqueue_num}"
                
                # Ініціалізуємо розклад для цієї черги
                if date_str not in schedules_by_date:
                    schedules_by_date[date_str] = {}
                
                if queue_id not in schedules_by_date[date_str]:
                    schedules_by_date[date_str][queue_id] = {}
                
                # Обробляємо 48 півгодинних слотів (комірки з індексу 2)
                # Кожна комірка = 30 хвилин
                for slot_idx in range(48):
                    cell_idx = 2 + slot_idx
                    if cell_idx >= len(cells):
                        break
                    
                    cell = cells[cell_idx]
                    cell_class = ' '.join(cell.get('class', []))
                    
                    # light_1 = світло є (ON)
                    # light_2 або light_3 = відключення (OFF)
                    is_on = 'light_1' in cell_class
                    is_off = 'light_2' in cell_class or 'light_3' in cell_class
                    
                    state = 1 if is_on else (2 if is_off else 0)
                    
                    # Обчислюємо час для цього слоту
                    hour = slot_idx // 2
                    minute = 30 if (slot_idx % 2) else 0
                    
                    schedules_by_date[date_str][queue_id][f"{hour:02d}:{minute:02d}"] = state
        
        # Формуємо відповідь у стандартному форматі API
        date_today_str = today.isoformat()
        date_tomorrow_str = tomorrow.isoformat()
        
        # Об'єднуємо розклади для всіх черг
        queues_schedule = {}
        
        for queue_id in set(
            list(schedules_by_date.get(date_today_str, {}).keys()) +
            list(schedules_by_date.get(date_tomorrow_str, {}).keys())
        ):
            queues_schedule[queue_id] = {
                date_today_str: schedules_by_date.get(date_today_str, {}).get(queue_id, {}),
                date_tomorrow_str: schedules_by_date.get(date_tomorrow_str, {}).get(queue_id, {}),
            }
        
        return {
            "date_today": date_today_str,
            "date_tomorrow": date_tomorrow_str,
            "regions": [
                {
                    "cpu": self.region,
                    "schedule": queues_schedule
                }
            ]
        }

    # ---------------------------------------------------------------------
    # API -> payload
    # ---------------------------------------------------------------------

    def _build_from_api(self, api: dict[str, Any]) -> dict[str, Any]:
        date_today = api.get("date_today")
        date_tomorrow = api.get("date_tomorrow")

        region_obj = next((r for r in api.get("regions", []) if r.get("cpu") == self.region), None)
        if not region_obj:
            raise ValueError(f"Region {self.region} not found in API response")

        schedule = (region_obj.get("schedule") or {}).get(self.queue) or {}
        slots_today_map: dict[str, int] = schedule.get(date_today) or {}
        slots_tomorrow_map: dict[str, int] = schedule.get(date_tomorrow) or {}

        # >>> ЛОГІКА nosched
        has_any_slots = any(v in (1, 2) for v in slots_today_map.values())
        if not has_any_slots:
            base_day = (
                datetime.fromisoformat(date_today).date()
                if date_today else dt_util.now(TZ_KYIV).date()
            )
            data_nosched: dict[str, Any] = {
                "queue": self.queue,
                "date": base_day.isoformat(),
                "now_status": "nosched",
                "now_halfhour_index": None,
                "next_change_at": None,
                "today_48half": [],
                "updated": dt_util.utcnow().replace(microsecond=0).isoformat(),
                "source": API_URL, # Технічно тут може бути DTEK_URL, але це поле інформативне
                "next_on_at": None,
                "next_off_at": None,
            }
            if date_tomorrow and (schedule.get(date_tomorrow) or {}):
                data_nosched["tomorrow_date"] = date_tomorrow
                data_nosched["tomorrow_48half"] = []
            return data_nosched
        # <<< КІНЕЦЬ nosched

        def build_half_list(slots_map: dict[str, int]) -> list[str]:
            res: list[str] = []
            for h in range(24):
                for m in (0, 30):
                    label = f"{h:02d}:{m:02d}"
                    code = int(slots_map.get(label, 0))
                    if code == 1:
                        res.append("on")
                    elif code == 2:
                        res.append("off")
                    else:
                        res.append("unknown")
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

        nci = self._next_change_idx(today_half, idx) if today_half else None
        next_change_hhmm = None
        if nci is not None:
            h = nci // 2
            m = 30 if (nci % 2) else 0
            next_change_hhmm = f"{h:02d}:{m:02d}"

        next_on_at = self._find_next_at(["on"], base_day, today_half, idx, date_tomorrow, tomorrow_half)
        next_off_at = self._find_next_at(["off"], base_day, today_half, idx, date_tomorrow, tomorrow_half)

        data: dict[str, Any] = {
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
        }

        if date_tomorrow and tomorrow_half:
            data.update(
                {
                    "tomorrow_date": date_tomorrow,
                    "tomorrow_48half": tomorrow_half,
                }
            )

        return data

    # ---------------------------------------------------------------------
    # Планувальник точного оновлення
    # ---------------------------------------------------------------------

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

    # ---------------------------------------------------------------------
    # Утиліти
    # ---------------------------------------------------------------------

    @staticmethod
    def _next_change_idx(series: list[str], idx: int) -> Optional[int]:
        if not series:
            return None
        cur = series[idx]
        n = len(series)
        for step in range(1, n + 1):
            j = (idx + step) % n
            if series[j] != cur:
                return j
        return None

    @staticmethod
    def _find_next_at(
        target_states: list[str],
        base_date: date,
        today_half: list[str],
        idx: int,
        tomorrow_date_iso: Optional[str],
        tomorrow_half: Optional[list[str]],
    ) -> Optional[str]:
        if not today_half:
            return None

        today_tail = today_half[idx + 1 :]
        seq = list(today_tail)

        has_tomorrow = bool(tomorrow_date_iso and tomorrow_half)
        if has_tomorrow:
            seq.extend(tomorrow_half or [])

        pos = next((i for i, s in enumerate(seq) if s in target_states), None)
        if pos is None:
            return None

        if pos < len(today_tail):
            base_local_midnight = datetime.combine(base_date, datetime.min.time(), tzinfo=TZ_KYIV)
            minutes_from_base = (idx + 1 + pos) * 30
            next_local = base_local_midnight + timedelta(minutes=minutes_from_base)
        else:
            if not has_tomorrow:
                return None
            tomorrow_date = datetime.fromisoformat(tomorrow_date_iso).date()
            base_local_midnight = datetime.combine(tomorrow_date, datetime.min.time(), tzinfo=TZ_KYIV)
            minutes_into_tomorrow = (pos - len(today_tail)) * 30
            next_local = base_local_midnight + timedelta(minutes=minutes_into_tomorrow)

        return dt_util.as_utc(next_local).isoformat()
