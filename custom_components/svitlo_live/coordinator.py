# custom_components/svitlo_live/coordinator.py
from __future__ import annotations

import logging
from datetime import datetime, timedelta, date
from typing import Any, Tuple, Optional

import aiohttp
from bs4 import BeautifulSoup

from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.event import async_track_point_in_time
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.util import dt as dt_util

from .const import (
    CONF_REGION,
    CONF_QUEUE,
    CONF_SCAN_INTERVAL,
    CLASS_MAP,
    DEFAULT_SCAN_INTERVAL,
    REGION_QUEUE_MODE,  # <-- важливо
)

_LOGGER = logging.getLogger(__name__)
HEADERS = {"User-Agent": "Mozilla/5.0 (HomeAssistant; svitlo_live)"}


class SvitloCoordinator(DataUpdateCoordinator[dict[str, Any]]):
    """Координатор: тягне HTML svitlo.live, парсить on/off/f4/f5, розкладає у 48 півгодин."""

    def __init__(self, hass: HomeAssistant, config: dict[str, Any]) -> None:
        self.hass = hass
        self.region: str = config[CONF_REGION]
        self.queue: str = config[CONF_QUEUE]
        self.queue_mode: str = REGION_QUEUE_MODE.get(self.region, "DEFAULT")

        scan_seconds = int(config.get(CONF_SCAN_INTERVAL, DEFAULT_SCAN_INTERVAL))
        self._unsub_precise = None  # планувальник точного перемикання

        super().__init__(
            hass=hass,
            logger=_LOGGER,
            name=f"svitlo_live_{self.region}_{self.queue}",
            update_interval=timedelta(seconds=scan_seconds),
        )

    async def _async_update_data(self) -> dict[str, Any]:
        """Основне оновлення: фетч HTML і побудова payload (лише свіжі дані)."""
        url = f"https://svitlo.live/{self.region}"
        polled_at = dt_util.utcnow().replace(microsecond=0).isoformat()

        # 1) HTTP
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, headers=HEADERS, timeout=20) as resp:
                    if resp.status != 200:
                        raise UpdateFailed(f"HTTP {resp.status} for {url}")
                    html = await resp.text()
        except Exception as e:
            raise UpdateFailed(f"Network error: {e}") from e

        # 2) Парсинг
        try:
            today_pack, tomorrow_pack, source_last_modified = self.parse_queue(
                html, self.queue, mode=self.queue_mode
            )
        except Exception as e:
            raise UpdateFailed(f"Parse error: {e}") from e

        # 3) Побудова даних
        payload = self._build_payload(
            today_pack=today_pack,
            tomorrow_pack=tomorrow_pack,
            updated=polled_at,
            source_url=url,
            source_last_modified=source_last_modified,
        )

        # 4) План точного оновлення
        self._schedule_precise_refresh(payload)
        return payload

    # ---------------------------------------------------------------------
    # Helpers
    # ---------------------------------------------------------------------

    def _build_payload(
        self,
        today_pack: Tuple[date, list[str], list[str]],
        tomorrow_pack: Optional[Tuple[date, list[str], list[str]]],
        updated: str,
        source_url: str,
        source_last_modified: Optional[str],
    ) -> dict[str, Any]:
        """Будує словник даних для сенсорів із двох таблиць (сьогодні/завтра)."""
        today_date, hour_classes, halfhours = today_pack

        now_local = dt_util.now()
        if now_local.date() != today_date:
            idx = 0
        else:
            idx = now_local.hour * 2 + (1 if now_local.minute >= 30 else 0)

        cur = halfhours[idx]

        nci = self.next_change_idx(halfhours, idx)
        next_change_hhmm = None
        if nci is not None:
            h = nci // 2
            m = 30 if (nci % 2) else 0
            next_change_hhmm = f"{h:02d}:{m:02d}"

        next_on_at = self.find_next_at(["on"], today_date, halfhours, idx, tomorrow_pack)
        next_off_at = self.find_next_at(["off"], today_date, halfhours, idx, tomorrow_pack)

        data: dict[str, Any] = {
            "queue": self.queue,
            "date": today_date.isoformat(),
            "now_status": cur,                       # "on"/"off"
            "now_halfhour_index": idx,
            "next_change_at": next_change_hhmm,      # "HH:MM" (локальний)
            "today_24h_classes": hour_classes,
            "today_48half": halfhours,
            "updated": updated,                      # UTC ISO
            "source": source_url,
            "source_last_modified": source_last_modified,
            "next_on_at": next_on_at,                # UTC ISO або None
            "next_off_at": next_off_at,              # UTC ISO або None
        }

        if tomorrow_pack:
            d2, hc2, hh2 = tomorrow_pack
            data.update(
                {
                    "tomorrow_date": d2.isoformat(),
                    "tomorrow_24h_classes": hc2,
                    "tomorrow_48half": hh2,
                }
            )

        return data

    def _schedule_precise_refresh(self, data: dict[str, Any]) -> None:
        """Ставимо таймер на наступний півгодинний перехід — лише мережевий refresh."""
        if self._unsub_precise:
            self._unsub_precise()
            self._unsub_precise = None

        next_change_hhmm = data.get("next_change_at")
        base_date_iso = data.get("date")
        if not next_change_hhmm or not base_date_iso:
            return

        try:
            base_day = datetime.fromisoformat(base_date_iso).date()
            hh, mm = [int(x) for x in next_change_hhmm.split(":")]

            now_local = dt_util.now()
            candidate = now_local.replace(
                year=base_day.year,
                month=base_day.month,
                day=base_day.day,
                hour=hh,
                minute=mm,
                second=0,
                microsecond=0,
            )
            if candidate <= now_local:
                candidate = candidate + timedelta(days=1)

            @callback
            def _precise_tick(_now) -> None:
                self.async_request_refresh()

            self._unsub_precise = async_track_point_in_time(self.hass, _precise_tick, candidate)
            _LOGGER.debug(
                "Scheduled precise refresh for %s/%s at %s",
                self.region,
                self.queue,
                candidate.isoformat(),
            )
        except Exception as e:
            _LOGGER.debug("Failed to schedule precise refresh: %s", e)

    # ---------------------- Parsing & time logic ----------------------

    @staticmethod
    def halfhours_from_hour_class(cls: str) -> list[str]:
        """on/off/f4/f5 → два півгодинні стани ('on' або 'off')."""
        if cls == "on":
            return ["on", "on"]
        if cls == "off":
            return ["off", "off"]
        if cls == "f4":  # 00–29 off, 30–59 on
            return ["off", "on"]
        if cls == "f5":  # 00–29 on, 30–59 off
            return ["on", "off"]
        return ["on", "on"]

    @staticmethod
    def parse_queue(html: str, queue_id: str, *, mode: str = "DEFAULT"):
        """
        Повертає (today_pack, tomorrow_pack, source_last_modified) для вказаного queue_id.

        Режими:
        - DEFAULT: шукаємо div#chergra{queue_id} (класичні підчерги X.Y)
        - CHERGA_NUM: Вінницька — шукаємо таблиці з написом "Черга N" (без підчерг)
        - GRUPA_NUM: Чернівецька/Донецька — "Група N"
        """
        soup = BeautifulSoup(html, "html.parser")

        def parse_table(table) -> Tuple[date, list[str], list[str]]:
            rows = table.select("tbody tr")
            if len(rows) < 2:
                raise ValueError("Table structure unexpected (need 2 rows)")

            header_tds = rows[0].find_all("td")
            date_str = header_tds[0].get_text(strip=True)
            day = datetime.strptime(date_str, "%d.%m.%Y").date()

            cells = rows[1].find_all("td")[1:]
            if len(cells) != 24:
                cells = cells[:24]

            hour_classes: list[str] = []
            for td in cells:
                cls = next((c for c in td.get("class", []) if c in CLASS_MAP), "on")
                hour_classes.append(cls)

            halfhours: list[str] = []
            for cls in hour_classes:
                halfhours.extend(SvitloCoordinator.halfhours_from_hour_class(cls))

            return day, hour_classes, halfhours

        tables: list = []

        if mode == "DEFAULT":
            tab = soup.find("div", id=f"chergra{queue_id}")
            if not tab:
                raise ValueError(f"Queue {queue_id} not found (div#chergra{queue_id})")
            tables = tab.select("table.graph")
        else:
            label_prefix = "Черга" if mode == "CHERGA_NUM" else "Група"
            wanted = f"{label_prefix} {queue_id}".strip()

            candidates = soup.select("table.graph")
            found_container = None
            for t in candidates:
                rows = t.select("tbody tr")
                if len(rows) < 2:
                    continue
                first_cell = rows[1].find_all("td")[0].get_text(strip=True)
                if first_cell == wanted:
                    found_container = t.find_parent(attrs={"id": True}) or t.find_parent("div")
                    if found_container:
                        tables = found_container.select("table.graph")
                    else:
                        tables = [t]
                    break

            if not tables:
                raise ValueError(f"{wanted}: table not found")

        if not tables:
            raise ValueError("No tables found for selected queue/group")

        today_pack = parse_table(tables[0])
        tomorrow_pack = parse_table(tables[1]) if len(tables) > 1 else None

        # Діагностика
        try:
            tday, _, thalf = today_pack
            _LOGGER.debug("Parsed TODAY %s: off_count=%s", tday, thalf.count("off"))
            if tomorrow_pack:
                d2, _, h2 = tomorrow_pack
                first_off = next((i for i, v in enumerate(h2) if v == "off"), None)
                _LOGGER.debug("Parsed TOMORROW %s: first_off_idx=%s", d2, first_off)
        except Exception as e:
            _LOGGER.warning("Parse debug log failed: %s", e)

        # last-modified (як є)
        meta = soup.find("meta", attrs={"name": "last-modified"})
        source_last_modified = meta["content"] if meta and meta.has_attr("content") else None
        if source_last_modified and "-" in source_last_modified and ":" in source_last_modified:
            try:
                dt_local = datetime.fromisoformat(source_last_modified.replace(" ", "T"))
                source_last_modified = dt_util.as_utc(dt_local).replace(microsecond=0).isoformat()
            except Exception:
                pass

        return today_pack, tomorrow_pack, source_last_modified

    @staticmethod
    def next_change_idx(series: list[str], idx: int) -> Optional[int]:
        """Знайти індекс наступної зміни стану в 30-хв серії (циклічно в межах доби)."""
        cur = series[idx]
        n = len(series)
        for step in range(1, n + 1):
            j = (idx + step) % n
            if series[j] != cur:
                return j
        return None

    @staticmethod
    def find_next_at(
        target_states: list[str],
        base_date: date,
        today_half: list[str],
        idx: int,
        tomorrow_pack: Optional[Tuple[date, list[str], list[str]]],
    ) -> Optional[str]:
        """
        Повертає UTC ISO час НАСТУПНОГО target-стану ("on"/"off"),
        і точно прив’язує дату: якщо позиція у залишку СЬОГОДНІ — беремо дату сьогодні,
        якщо перелізло у ЗАВТРА — беремо дату завтра.
        """
        # послідовність пошуку
        today_tail = today_half[idx + 1:]  # залишок сьогоднішнього дня
        seq = list(today_tail)
        tomorrow_date = None
        if tomorrow_pack:
            tomorrow_date, _, tomorrow_half = tomorrow_pack
            seq.extend(tomorrow_half)

        # знайти першу позицію потрібного стану
        pos = next((i for i, s in enumerate(seq) if s in target_states), None)
        if pos is None:
            return None

        # визначаємо, у якій даті знаходиться ця позиція
        if pos < len(today_tail):
            # всередині сьогодні
            base_local_midnight = dt_util.start_of_local_day(
                datetime.combine(base_date, datetime.min.time())
            )
            minutes_from_base = (idx + 1 + pos) * 30
            next_local = base_local_midnight + timedelta(minutes=minutes_from_base)
        else:
            # це вже завтра
            if not tomorrow_date:
                return None
            base_local_midnight = dt_util.start_of_local_day(
                datetime.combine(tomorrow_date, datetime.min.time())
            )
            minutes_into_tomorrow = (pos - len(today_tail)) * 30
            next_local = base_local_midnight + timedelta(minutes=minutes_into_tomorrow)

        return dt_util.as_utc(next_local).isoformat()
