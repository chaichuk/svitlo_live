"""Data update coordinator for Svitlo UA integration."""
import logging
from datetime import datetime, timedelta
import asyncio

import aiohttp
from bs4 import BeautifulSoup

from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed
from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .const import DOMAIN, YASNO_CITY_CODES, ENERGY_UA_SUBDOMAINS

_LOGGER = logging.getLogger(__name__)

API_YASNO_URL = "https://api.yasno.com.ua/api/v1/pages/home/schedule-turn-off-electricity"

class SvitloUADataUpdateCoordinator(DataUpdateCoordinator):
    """Coordinator to fetch and update outage schedule data."""
    def __init__(self, hass: HomeAssistant, config: dict):
        """Initialize the coordinator with config (region, provider, group)."""
        self.hass = hass
        self.region = config.get("region")
        self.provider = config.get("provider")  # може бути None
        self.group = config.get("group")        # рядок, напр. "2" або "6.2"
        # Інтервал оновлення даних (наприклад, кожні 15 хвилин)
        update_interval = timedelta(minutes=15)
        super().__init__(hass, _LOGGER, name=DOMAIN, update_interval=update_interval)

    async def _async_update_data(self):
        """Fetch latest outage schedule data from appropriate source."""
        # Визначаємо джерело даних: або Yasno API, або парсинг сайту Energy-UA
        try:
            if self._use_yasno_api():
                data = await self._fetch_from_yasno()
            else:
                data = await self._fetch_from_energy_ua()
        except Exception as err:
            _LOGGER.error("Помилка отримання даних для %s: %s", self.region, err)
            raise UpdateFailed(f"Data update failed: {err}")  # повідомляємо координатор про помилку
        if data is None:
            # Якщо дані None – вважаємо, що сталася помилка або даних нема
            raise UpdateFailed("No data fetched")
        return data

    def _use_yasno_api(self) -> bool:
        """Повертає True, якщо для обраного регіону слід використовувати API Yasno."""
        # Використовуємо Yasno API для Києва та Дніпра (DTEK)
        if self.region in YASNO_CITY_CODES:
            if self.region != "Dnipropetrovsk":
                return True
            # Якщо регіон Дніпропетровська обл., то перевіряємо постачальника
            if self.provider == "DTEK":
                return True
        return False

    async def _fetch_from_yasno(self) -> dict:
        """Отримує графік відключень з API Yasno (для підтримуваних регіонів)."""
        city_code = YASNO_CITY_CODES.get(self.region)
        if city_code is None:
            _LOGGER.warning("Регіон %s не підтримується Yasno API", self.region)
            return None
        _LOGGER.debug("Запит даних Yasno для міста: %s (група %s)", city_code, self.group)
        async with aiohttp.ClientSession() as session:
            async with session.get(API_YASNO_URL) as resp:
                if resp.status != 200:
                    raise UpdateFailed(f"Yasno API HTTP {resp.status}")
                result = await resp.json(content_type=None)
        # Парсимо структуру JSON
        components = result.get("components", [])
        schedule_item = None
        for comp in components:
            if comp.get("template_name") == "electricity-outages-daily-schedule":
                schedule_item = comp
                break
        if not schedule_item:
            _LOGGER.error("Не знайдено компонент графіка в даних Yasno")
            return None
        daily_schedule = schedule_item.get("dailySchedule", {}).get(city_code)
        data_out = {
            "events_today": [],
            "events_tomorrow": []
        }
        # Отримуємо список подій (інтервалів) для сьогодні і завтра
        today = dt_util.now().date()
        tomorrow = today + timedelta(days=1)
        if daily_schedule:
            if "today" in daily_schedule:
                events = self._parse_yasno_day(daily_schedule["today"])
                data_out["events_today"] = self._convert_intervals_to_events(events, date=today)
            if "tomorrow" in daily_schedule:
                events = self._parse_yasno_day(daily_schedule["tomorrow"])
                data_out["events_tomorrow"] = self._convert_intervals_to_events(events, date=tomorrow)
        else:
            # Якщо dailySchedule немає, пробуємо weekly schedule (foundItem.schedule)
            city_schedule = schedule_item.get("schedule", {}).get(city_code)
            if city_schedule:
                group_key = f"group_{self.group.replace('.', '_')}"  # приклад ключа: "group_2" або "group_6_2"
                week_schedule = city_schedule.get(group_key)
                if week_schedule:
                    # week_schedule очікується як список або структура з денними інтервалами
                    events_today = week_schedule[dt_util.now().weekday()] if isinstance(week_schedule, list) else []
                    # Для простоти: припускаємо, що week_schedule – список списків (7 елементів)
                    events_tomorrow = week_schedule[(dt_util.now().weekday() + 1) % 7] if isinstance(week_schedule, list) else []
                    data_out["events_today"] = self._convert_intervals_to_events(events_today, date=today)
                    data_out["events_tomorrow"] = self._convert_intervals_to_events(events_tomorrow, date=tomorrow)
        # Визначаємо, чи зараз відключення, та часи наступних подій
        self._augment_data_with_status(data_out)
        _LOGGER.debug("Отримані дані Yasno: %s", data_out)
        return data_out

    def _parse_yasno_day(self, day_data: dict):
        """Розбирає дані дня (сьогодні/завтра) з Yasno у список інтервалів для заданої групи."""
        title = day_data.get("title")  # можливо містить дату, але ми можемо не використовувати
        groups_data = day_data.get("groups", {})
        group_key = self.group
        if group_key not in groups_data:
            # Якщо група в формі 'X.Y', а ключі можуть бути 'X.Y' або 'X.Y' без нулів 
            # (імовірно точний збіг по рядку)
            _LOGGER.warning("Групу %s не знайдено у даних Yasno 'groups'", group_key)
            return []
        intervals = groups_data[group_key]  # список інтервалів {start: float, end: float, type: ...}
        # Об'єднуємо суміжні інтервали
        merged = []
        if not intervals:
            return merged
        # Інтервали вже мають start/end у форматі годин (float), об'єднання:
        current_start = intervals[0]["start"]
        current_end = intervals[0]["end"]
        for inter in intervals[1:]:
            start = inter["start"]
            end = inter["end"]
            if start <= current_end:
                # Якщо інтервал починається впритул або всередині попереднього – зливаємо
                if end > current_end:
                    current_end = end
            else:
                merged.append((current_start, current_end))
                current_start = start
                current_end = end
        # Додати останній інтервал
        merged.append((current_start, current_end))
        return merged

    async def _fetch_from_energy_ua(self) -> dict:
        """Отримує графік відключень шляхом парсингу сайту energy-ua.info."""
        subdomain = ENERGY_UA_SUBDOMAINS.get(self.region)
        if subdomain is None:
            _LOGGER.error("Для регіону %s нема даних Energy-UA", self.region)
            return None
        group_path = self.group.replace(".", "-")  # формат в URL: 2.1 -> 2-1
        url = f"https://{subdomain}.energy-ua.info/grupa/{group_path}"
        _LOGGER.debug("Запит даних з %s для групи %s", url, self.group)
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as resp:
                if resp.status != 200:
                    raise UpdateFailed(f"Energy-UA HTTP {resp.status}")
                html = await resp.text()
        soup = BeautifulSoup(html, "html.parser")
        data_out = {
            "events_today": [],
            "events_tomorrow": []
        }
        # Знайти секцію "Періоди відключень на сьогодні"
        today_section = soup.text.split("Періоди відключень на сьогодні")
        if len(today_section) > 1:
            # Текст після заголовку
            after_today = today_section[1]
            # Обрізати все після "Періоди відключень на завтра" (щоб отримати тільки блок сьогодні)
            if "Періоди відключень на завтра" in after_today:
                after_today = after_today.split("Періоди відключень на завтра")[0]
            # Перевірити, чи є дані або напис "Немає даних"
            if "Немає даних" not in after_today:
                # Знайти всі інтервали формату HH:MM HH:MM
                intervals = []
                for line in after_today.splitlines():
                    line=line.strip()
                    if not line:
                        continue
                    # Очікуємо рядок на зразок "08:00 12:00"
                    parts = line.split()
                    if len(parts) == 2 and ":" in parts[0] and ":" in parts[1]:
                        intervals.append((parts[0], parts[1]))
                if intervals:
                    today_date = dt_util.now().date()
                    data_out["events_today"] = [self._make_datetime_interval(start_str, end_str, today_date) for start_str, end_str in intervals]
        # Аналогічно для завтра
        tomorrow_section = soup.text.split("Періоди відключень на завтра")
        if len(tomorrow_section) > 1:
            after_tomorrow = tomorrow_section[1]
            if "Немає даних" not in after_tomorrow:
                intervals = []
                for line in after_tomorrow.splitlines():
                    line=line.strip()
                    if not line:
                        continue
                    if ":" in line and line.count(":") == 2:  # Простий спосіб знайти "HH:MM HH:MM"
                        parts = line.split()
                        if len(parts) == 2 and ":" in parts[0] and ":" in parts[1]:
                            intervals.append((parts[0], parts[1]))
                if intervals:
                    tomorrow_date = (dt_util.now() + timedelta(days=1)).date()
                    data_out["events_tomorrow"] = [self._make_datetime_interval(s, e, tomorrow_date) for s, e in intervals]
        # Обробка випадку, якщо "Немає даних" для обох днів – залишиться порожній список
        self._augment_data_with_status(data_out)
        _LOGGER.debug("Отримані дані Energy-UA: %s", data_out)
        return data_out

    def _make_datetime_interval(self, start_str: str, end_str: str, date: datetime.date):
        """Допоміжний метод: зі стрічкових 'HH:MM' робить кортеж з datetime (start, end)."""
        try:
            # Парсимо час
            start_time = datetime.strptime(start_str, "%H:%M").time()
            end_time = datetime.strptime(end_str, "%H:%M").time()
        except Exception as e:
            _LOGGER.error("Помилка парсингу часу %s-%s: %s", start_str, end_str, e)
            return None
        tz = dt_util.now().tzinfo  # локальна timezone Home Assistant
        start_dt = datetime.combine(date, start_time, tz)
        end_dt = datetime.combine(date, end_time, tz)
        return (start_dt, end_dt)

    def _convert_intervals_to_events(self, intervals: list, date: datetime.date):
        """Перетворює список інтервалів (початок, кінець у годинах або частках години) у список datetime кортежів."""
        events = []
        tz = dt_util.now().tzinfo
        for start, end in intervals:
            # start, end можуть бути float (години)
            hours = int(start)
            minutes = int((start - hours) * 60) if isinstance(start, float) else 0
            start_dt = datetime.combine(date, datetime.min.time(), tz) + timedelta(hours=hours, minutes=minutes)
            hours_e = int(end)
            minutes_e = int((end - hours_e) * 60) if isinstance(end, float) else 0
            end_dt = datetime.combine(date, datetime.min.time(), tz) + timedelta(hours=hours_e, minutes=minutes_e)
            events.append((start_dt, end_dt))
        return events

    def _augment_data_with_status(self, data: dict):
        """На основі списку подій визначає поточний статус та наступні відключення/включення."""
        now = dt_util.now()
        events = []
        # Об'єднуємо події сьогодні і завтра в один список
        events += data.get("events_today", [])
        events += data.get("events_tomorrow", [])
        # Відфільтруємо події, що закінчилися до "зараз"
        future_events = [ (s, e) for (s, e) in events if e > now ]
        future_events.sort(key=lambda interval: interval[0])  # сортуємо за часом початку
        outage_now = False
        next_outage_start = None
        next_power_on = None
        # Перевіряємо, чи зараз є відключення
        for (start, end) in events:
            if start <= now < end:
                outage_now = True
                # Якщо зараз відключення, час увімкнення = end поточного інтервалу
                next_power_on = end
                break
        # Визначаємо час наступного відключення
        if outage_now:
            # Якщо зараз вже відключено, наступне відключення може бути після поточного (якщо є ще одне)
            if len(future_events) > 0:
                # Перший в списку future_events може бути поточний (якщо зараз outage), або наступний
                # Якщо outage_now, то перший future_event це поточний до кінця? Відфільтровано e > now, 
                # тому поточний також враховується якщо зараз start<=now<end, його e > now. 
                # Отже, перший event = поточний outage, другий = наступний.
                if future_events[0][0] <= now:
                    # Перший event є поточним, беремо другий як наступний
                    if len(future_events) > 1:
                        next_outage_start = future_events[1][0]
                    else:
                        next_outage_start = None
                else:
                    # Якщо перший future_event починається в майбутньому, то це і є наступне відключення (випадок якщо зараз було outage, але вже відфільтровано?)
                    next_outage_start = future_events[0][0]
        else:
            # Якщо зараз електропостачання є (нема outage зараз)
            # Наступне відключення - початок першого майбутнього інтервалу, якщо існує
            if future_events:
                next_outage_start = future_events[0][0]
                next_power_on = future_events[0][1]  # увімкнення світла після наступного відключення
        # Розрахунок time_to_next_outage (в хвилинах)
        time_to_next = None
        if next_outage_start:
            delta = next_outage_start - now
            time_to_next = int(delta.total_seconds() // 60)  # цілі хвилини
        data.update({
            "outage_now": outage_now,
            "next_outage_start": next_outage_start,
            "next_power_on": next_power_on,
            "time_to_next_outage": time_to_next
        })
