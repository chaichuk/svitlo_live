from __future__ import annotations

from datetime import datetime, timedelta, date
from typing import Any, List, Optional

from homeassistant.components.calendar import CalendarEntity, CalendarEvent
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util
# Імпортуємо slugify для генерації suggested_object_id (якщо знадобиться)
from homeassistant.util import slugify

from .const import DOMAIN

# Таймзона України
TZ_KYIV = dt_util.get_time_zone("Europe/Kyiv")


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([SvitloCalendar(coordinator, entry)])


class SvitloCalendar(CoordinatorEntity, CalendarEntity):
    """Календар відключень світла для конкретного регіону/черги."""
    
    # Використовуємо нову логіку імен (як в сенсорах)
    _attr_has_entity_name = True
    _attr_translation_key = "svitlo_calendar"
    _attr_icon = "mdi:calendar-clock"

    def __init__(self, coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        self._entry = entry
        self._region = getattr(coordinator, "region", "region")
        self._queue = getattr(coordinator, "queue", "queue")
        
        # Залишаємо старий unique_id для сумісності
        self._attr_unique_id = f"svitlo_calendar_{self._region}_{self._queue}"
        self._event: Optional[CalendarEvent] = None

    @property
    def event(self) -> Optional[CalendarEvent]:
        """Поточна або найближча подія (визначає state: On/Off)."""
        return self._event

    @callback
    def _handle_coordinator_update(self) -> None:
        """Викликається, коли координатор отримав нові дані JSON."""
        self._update_event()
        super()._handle_coordinator_update()

    async def async_added_to_hass(self) -> None:
        """Перший запуск."""
        await super().async_added_to_hass()
        self._update_event()

    def _update_event(self) -> None:
        """
        Перераховує self._event (поточна або наступна подія).
        Це синхронний метод, щоб викликати його з колбеку координатора.
        """
        now_utc = dt_util.utcnow()
        # Беремо діапазон: вчора -> післязавтра (щоб точно знайти поточну)
        start = now_utc - timedelta(days=1)
        end = now_utc + timedelta(days=2)
        
        # Отримуємо події синхронно
        events = self._get_events_sync(start, end)
        
        if not events:
            self._event = None
            return

        events.sort(key=lambda e: e.start)
        
        # Шукаємо поточну (active)
        current = next((e for e in events if e.start <= now_utc < e.end), None)
        # Шукаємо найближчу майбутню
        upcoming = next((e for e in events if e.start > now_utc), None)
        
        # Якщо є поточна — state буде ON. Якщо немає — state OFF (і покаже майбутню).
        self._event = current or upcoming

    # ---- Реалізація CalendarEntity ----

    async def async_get_events(
        self, hass: HomeAssistant, start_date: datetime, end_date: datetime
    ) -> List[CalendarEvent]:
        """Метод, який викликає HA для малювання календаря (Month/Week view)."""
        return self._get_events_sync(start_date, end_date)

    def _get_events_sync(self, start_date: datetime, end_date: datetime) -> List[CalendarEvent]:
        """Внутрішня логіка парсингу подій (без async/await)."""
        d = getattr(self.coordinator, "data", {}) or {}
        
        today_half = d.get("today_48half") or []
        tomorrow_half = d.get("tomorrow_48half") or []
        date_today_str = d.get("date")
        date_tomorrow_str = d.get("tomorrow_date")

        if not date_today_str or not today_half:
            return []

        try:
            base_today = date.fromisoformat(date_today_str)
            base_tomorrow = None
            if date_tomorrow_str:
                base_tomorrow = date.fromisoformat(date_tomorrow_str)
        except (ValueError, AttributeError):
            return []

        # Перевіряємо чи дні послідовні
        is_contiguous = False
        if base_tomorrow:
            is_contiguous = (base_tomorrow - base_today).days == 1

        events: List[CalendarEvent] = []

        if is_contiguous and tomorrow_half:
            # Об'єднуємо в безперервний потік: 0..47 (сьогодні), 48..95 (завтра)
            combined_half = today_half + tomorrow_half
            combined_events = self._build_events_from_stream(base_today, combined_half)
            events.extend(combined_events)
        else:
            # Обробляємо окремо
            events.extend(self._build_events_from_stream(base_today, today_half))
            if base_tomorrow and tomorrow_half:
                events.extend(self._build_events_from_stream(base_tomorrow, tomorrow_half))

        # Фільтрація за діапазоном
        filtered: List[CalendarEvent] = []
        for ev in events:
            ev_start = ev.start if ev.start.tzinfo else dt_util.as_utc(ev.start)
            ev_end = ev.end if ev.end.tzinfo else dt_util.as_utc(ev.end)

            if ev_start < end_date and ev_end > start_date:
                filtered.append(ev)

        return filtered

    def _build_events_from_stream(self, start_date_obj: date, stream: list[str]) -> List[CalendarEvent]:
        """
        Парсить безперервний потік напівгодинних слотів починаючи з start_date_obj 00:00.
        Індекси 0..47 належать start_date_obj.
        Індекси 48..95 належать start_date_obj + 1 день, тощо.
        """
        events: List[CalendarEvent] = []
        if not stream:
            return events

        current_state = stream[0]
        start_idx = 0

        for i in range(1, len(stream)):
            if stream[i] != current_state:
                if current_state == "off":
                    events.append(self._make_event_continuous(start_date_obj, start_idx, i))
                current_state = stream[i]
                start_idx = i
        
        # Закриваємо останній інтервал
        if current_state == "off":
            events.append(self._make_event_continuous(start_date_obj, start_idx, len(stream)))

        return events

    def _make_event_continuous(self, base_date: date, start_idx: int, end_idx: int) -> CalendarEvent:
        """
        Створює подію на основі безперервного потоку індексів.
        0 = 00:00 базової дати
        48 = 00:00 базової дати + 1 день
        96 = 00:00 базової дати + 2 дні
        """
        def idx_to_dt(idx):
            # Зсув у днях
            days = idx // 48
            remainder = idx % 48
            hours = remainder // 2
            minutes = 30 if remainder % 2 else 0
            
            # Будуємо локальний час
            d = base_date + timedelta(days=days)
            return datetime.combine(d, datetime.min.time()).replace(
                hour=hours, minute=minutes, tzinfo=TZ_KYIV
            )

        start_local = idx_to_dt(start_idx)
        end_local = idx_to_dt(end_idx)

        return CalendarEvent(
            summary=f"{self._entry.title}: ❌ Відключення",
            start=dt_util.as_utc(start_local),
            end=dt_util.as_utc(end_local),
            description=f"Немає світла {start_local.strftime('%H:%M')}–{end_local.strftime('%H:%M')}",
        )

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return the state attributes."""
        data = getattr(self.coordinator, "data", {}) or {}
        # Визначаємо поточний статус за графіком (у часовій зоні Києва)
        now = dt_util.now(TZ_KYIV)
        index = now.hour * 2 + (1 if now.minute >= 30 else 0)
        today_sch = data.get("today_48half", [])
        now_status = today_sch[index] if index < len(today_sch) else "unknown"

        return {
            "region": getattr(self.coordinator, "region", ""),
            "queue": getattr(self.coordinator, "queue", ""),
            "now_status": now_status,
            "today_48half": today_sch,
            "tomorrow_48half": data.get("tomorrow_48half", []),
            "next_change_at": data.get("next_change_at"),
            "today_outage_hours": data.get("today_outage_hours"),
            "tomorrow_outage_hours": data.get("tomorrow_outage_hours"),
            "longest_outage_hours": data.get("longest_outage_hours"),
            "history_today_48half": data.get("history_today_48half", []),
            "history_tomorrow_48half": data.get("history_tomorrow_48half", []),
            "updated": data.get("updated"),
        }

    @property
    def device_info(self) -> dict[str, Any]:
        return {
            "identifiers": {(DOMAIN, f"{self._region}_{self._queue}")},
            "manufacturer": "Serhii Chaichuk",
            "model": f"Queue {self._queue}",
            "name": f"Svitlo • {self._region} / {self._queue}",
            "configuration_url": "https://github.com/chaichuk",
        }