from __future__ import annotations

from datetime import datetime, timedelta
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

        events: List[CalendarEvent] = []
        events.extend(self._build_day_events(date_today_str, today_half))
        events.extend(self._build_day_events(date_tomorrow_str, tomorrow_half))

        # Фільтрація за діапазоном
        filtered: List[CalendarEvent] = []
        for ev in events:
            # Приводимо до UTC для порівняння (CalendarEvent тримає dt об'єкти)
            ev_start = ev.start if ev.start.tzinfo else dt_util.as_utc(ev.start)
            ev_end = ev.end if ev.end.tzinfo else dt_util.as_utc(ev.end)
            
            # Перетин діапазонів
            if ev_start < end_date and ev_end > start_date:
                filtered.append(ev)

        return filtered

    def _build_day_events(self, date_str: str | None, halfhours: list[str]) -> List[CalendarEvent]:
        """Генерує події для одного дня."""
        if not date_str or not halfhours or len(halfhours) != 48:
            return []

        base_day = datetime.fromisoformat(date_str).date()
        events: List[CalendarEvent] = []

        current_state = halfhours[0]
        start_idx = 0

        for i in range(1, 48):
            if halfhours[i] != current_state:
                if current_state == "off":
                    events.append(self._make_event(base_day, start_idx, i))
                current_state = halfhours[i]
                start_idx = i

        # Закриваємо день
        if current_state == "off":
            events.append(self._make_event(base_day, start_idx, 48))

        return events

    def _make_event(self, day, start_idx: int, end_idx: int) -> CalendarEvent:
        """Створює об'єкт CalendarEvent."""
        start_h = start_idx // 2
        start_m = 30 if start_idx % 2 else 0
        end_h = end_idx // 2
        end_m = 30 if end_idx % 2 else 0

        start_local = datetime.combine(day, datetime.min.time()).replace(
            hour=start_h, minute=start_m, tzinfo=TZ_KYIV
        )
        
        if end_idx < 48:
            end_local = datetime.combine(day, datetime.min.time()).replace(
                hour=end_h, minute=end_m, tzinfo=TZ_KYIV
            )
        else:
            # Перехід на наступну добу (00:00)
            end_local = datetime.combine(day + timedelta(days=1), datetime.min.time()).replace(
                tzinfo=TZ_KYIV
            )

        # Конвертуємо в UTC
        start_utc = dt_util.as_utc(start_local)
        end_utc = dt_util.as_utc(end_local)

        return CalendarEvent(
            summary=f"{self._entry.title}: ❌ Відключення",
            start=start_utc,
            end=end_utc,
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
