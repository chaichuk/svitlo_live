from __future__ import annotations
from typing import Any, Optional
from datetime import timedelta

from homeassistant.core import HomeAssistant, callback
from homeassistant.components.sensor import SensorEntity, SensorDeviceClass, SensorStateClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import UnitOfTime
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.helpers.event import async_track_time_interval
from homeassistant.util import dt as dt_util

from .const import DOMAIN


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = hass.data[DOMAIN][entry.entry_id]
    entities: list[SensorEntity] = [
        SvitloStatusSensor(coordinator),
        SvitloNextGridConnectionSensor(coordinator),
        SvitloNextOutageSensor(coordinator),
        SvitloMinutesToGridConnection(coordinator),
        SvitloMinutesToOutage(coordinator),
        # Нові класи з новими ID згідно з PR
        SvitloNextPowerOn(coordinator),
        SvitloNextPowerOff(coordinator),
        SvitloScheduleUpdatedSensor(coordinator),
        SvitloOutageHoursToday(coordinator),
        SvitloOutageHoursTomorrow(coordinator),
        SvitloLongestOutage(coordinator),
    ]
    async_add_entities(entities)


class SvitloBaseEntity(CoordinatorEntity, SensorEntity):
    _attr_has_entity_name = True

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)

    @property
    def available(self) -> bool:
        return True

    @property
    def device_info(self) -> dict[str, Any]:
        region = getattr(self.coordinator, "region", "region")
        queue = getattr(self.coordinator, "queue", "queue")
        return {
            "identifiers": {(DOMAIN, f"{region}_{queue}")},
            "manufacturer": "Serhii Chaichuk",
            "model": f"Queue {queue}",
            "name": f"Svitlo • {region} / {queue}",
            "configuration_url": "https://github.com/chaichuk",
        }


class SvitloStatusSensor(SvitloBaseEntity):
    """Головний сенсор статусу."""
    _attr_translation_key = "svitlo_status"
    _attr_icon = "mdi:transmission-tower"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_status_{coordinator.region}_{coordinator.queue}"

    @property
    def native_value(self) -> str | None:
        data = getattr(self.coordinator, "data", None)
        if not data or not getattr(self.coordinator, "last_update_success", False):
            return "No data"
        
        if data.get("is_emergency"):
            return "Emergency"

        val = data.get("now_status")
        if val == "on":
            return "Grid ON"
        if val == "off":
            return "Grid OFF"
        return "No data"
    
    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        """Return the state attributes."""
        data = getattr(self.coordinator, "data", {}) or {}
        return {
            "region": getattr(self.coordinator, "region", ""),
            "queue": getattr(self.coordinator, "queue", ""),
            "now_status": data.get("now_status"),
            "today_48half": data.get("today_48half", []),
            "tomorrow_48half": data.get("tomorrow_48half", []),
            "next_change_at": data.get("next_change_at"),
            "today_outage_hours": data.get("today_outage_hours"),
            "tomorrow_outage_hours": data.get("tomorrow_outage_hours"),
            "longest_outage_hours": data.get("longest_outage_hours"),
            "history_today_48half": data.get("history_today_48half", []),
            "history_tomorrow_48half": data.get("history_tomorrow_48half", []),
            "updated": data.get("updated"),
        }


# ---------- TIMESTAMP сенсори ----------

class SvitloNextGridConnectionSensor(SvitloBaseEntity):
    _attr_translation_key = "svitlo_next_grid"
    _attr_icon = "mdi:clock-check"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_next_grid_{coordinator.region}_{coordinator.queue}"

    @property
    def native_value(self):
        d = getattr(self.coordinator, "data", None)
        if not d or not getattr(self.coordinator, "last_update_success", False):
            return None
        if d.get("now_status") != "off":
            return None
        iso_val = d.get("next_on_at")
        return dt_util.parse_datetime(iso_val) if iso_val else None


class SvitloNextOutageSensor(SvitloBaseEntity):
    _attr_translation_key = "svitlo_next_outage"
    _attr_icon = "mdi:clock-alert"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_next_off_{coordinator.region}_{coordinator.queue}"

    @property
    def native_value(self):
        d = getattr(self.coordinator, "data", None)
        if not d or not getattr(self.coordinator, "last_update_success", False):
            return None
        if d.get("now_status") != "on":
            return None
        iso_val = d.get("next_off_at")
        return dt_util.parse_datetime(iso_val) if iso_val else None


# ---------- DURATION сенсори (Нова логіка з PR) ----------

class SecondsRemainEntity(SvitloBaseEntity):
    _attr_device_class = SensorDeviceClass.DURATION
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = UnitOfTime.SECONDS
    _attr_suggested_unit_of_measurement = UnitOfTime.HOURS
    _attr_suggested_display_precision = 2

    _unsub_timer = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        @callback
        def _tick(now) -> None:
            self.async_write_ha_state()

        self._unsub_timer = async_track_time_interval(
            self.hass, _tick, timedelta(seconds=10)
        )

    async def async_will_remove_from_hass(self) -> None:
        await super().async_will_remove_from_hass()
        if self._unsub_timer:
            self._unsub_timer()
            self._unsub_timer = None

    def _seconds_until(self, iso_utc: Optional[str]) -> Optional[int]:
        if not iso_utc:
            return None
        target = dt_util.parse_datetime(iso_utc)
        if not target:
            return None
        now_utc = dt_util.utcnow()
        delta_s = (target - now_utc).total_seconds()
        if delta_s <= 0:
            return 0
        seconds = int(delta_s + 0.5)
        return seconds


# Тут нові класи і нові unique_id, як хотів автор PR
class SvitloNextPowerOn(SecondsRemainEntity):
    _attr_translation_key = "svitlo_next_power_on"
    _attr_icon = "mdi:lightbulb-on"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        # Новий ID
        self._attr_unique_id = f"svitlo_next_power_on_{coordinator.region}_{coordinator.queue}"

    @property
    def native_value(self) -> Optional[int]:
        d = getattr(self.coordinator, "data", None)
        if not d or not getattr(self.coordinator, "last_update_success", False):
            return None
        if d.get("now_status") != "off":
            return None
        return self._seconds_until(d.get("next_on_at"))


class SvitloNextPowerOff(SecondsRemainEntity):
    _attr_translation_key = "svitlo_next_power_off"
    _attr_icon = "mdi:lightbulb-off"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        # Новий ID
        self._attr_unique_id = f"svitlo_next_power_off_{coordinator.region}_{coordinator.queue}"

    @property
    def native_value(self) -> Optional[int]:
        d = getattr(self.coordinator, "data", None)
        if not d or not getattr(self.coordinator, "last_update_success", False):
            return None
        if d.get("now_status") != "on":
            return None
        return self._seconds_until(d.get("next_off_at"))


# ---------- Числові сенсори (хвилини - старі) ----------

class _MinutesBase(SvitloBaseEntity):
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = "min"
    _unsub_timer = None

    async def async_added_to_hass(self) -> None:
        await super().async_added_to_hass()
        @callback
        def _tick(now) -> None:
            self.async_write_ha_state()
        self._unsub_timer = async_track_time_interval(
            self.hass, _tick, timedelta(seconds=30)
        )

    async def async_will_remove_from_hass(self) -> None:
        await super().async_will_remove_from_hass()
        if self._unsub_timer:
            self._unsub_timer()
            self._unsub_timer = None

    def _minutes_until(self, iso_utc: Optional[str]) -> Optional[int]:
        if not iso_utc:
            return None
        target = dt_util.parse_datetime(iso_utc)
        if not target:
            return None
        now_utc = dt_util.utcnow()
        delta_s = (target - now_utc).total_seconds()
        if delta_s <= 0:
            return 0
        mins = int((delta_s + 59) // 60)
        return mins


class SvitloMinutesToGridConnection(_MinutesBase):
    _attr_translation_key = "svitlo_min_to_on"
    _attr_icon = "mdi:timer-sand"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_min_to_on_{coordinator.region}_{coordinator.queue}"

    @property
    def native_value(self) -> Optional[int]:
        d = getattr(self.coordinator, "data", None)
        if not d or not getattr(self.coordinator, "last_update_success", False):
            return None
        if d.get("now_status") != "off":
            return None
        return self._minutes_until(d.get("next_on_at"))


class SvitloMinutesToOutage(_MinutesBase):
    _attr_translation_key = "svitlo_min_to_off"
    _attr_icon = "mdi:timer-sand"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_min_to_off_{coordinator.region}_{coordinator.queue}"

    @property
    def native_value(self) -> Optional[int]:
        d = getattr(self.coordinator, "data", None)
        if not d or not getattr(self.coordinator, "last_update_success", False):
            return None
        if d.get("now_status") != "on":
            return None
        return self._minutes_until(d.get("next_off_at"))


class SvitloScheduleUpdatedSensor(SvitloBaseEntity):
    _attr_translation_key = "svitlo_updated"
    _attr_icon = "mdi:update"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_updated_{coordinator.region}_{coordinator.queue}"

    @property
    def native_value(self):
        d = getattr(self.coordinator, "data", None)
        if not d:
            return None
        iso_val = d.get("updated")
        return dt_util.parse_datetime(iso_val) if iso_val else None


# ---------- СТАТИСТИКА ----------

class SvitloOutageHoursToday(SvitloBaseEntity):
    _attr_translation_key = "svitlo_outage_today"
    _attr_icon = "mdi:clock-alert-outline"
    _attr_native_unit_of_measurement = UnitOfTime.HOURS
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_suggested_display_precision = 1

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_outage_today_{coordinator.region}_{coordinator.queue}"

    @property
    def native_value(self) -> Optional[float]:
        d = getattr(self.coordinator, "data", None)
        if not d or not getattr(self.coordinator, "last_update_success", False):
            return None
        return d.get("today_outage_hours")


class SvitloOutageHoursTomorrow(SvitloBaseEntity):
    _attr_translation_key = "svitlo_outage_tomorrow"
    _attr_icon = "mdi:calendar-clock"
    _attr_native_unit_of_measurement = UnitOfTime.HOURS
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_suggested_display_precision = 1

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_outage_tomorrow_{coordinator.region}_{coordinator.queue}"

    @property
    def native_value(self) -> Optional[float]:
        d = getattr(self.coordinator, "data", None)
        if not d or not getattr(self.coordinator, "last_update_success", False):
            return None
        return d.get("tomorrow_outage_hours")


class SvitloLongestOutage(SvitloBaseEntity):
    _attr_translation_key = "svitlo_longest_outage"
    _attr_icon = "mdi:clock-fast"
    _attr_native_unit_of_measurement = UnitOfTime.HOURS
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_suggested_display_precision = 1

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_longest_outage_{coordinator.region}_{coordinator.queue}"

    @property
    def native_value(self) -> Optional[float]:
        d = getattr(self.coordinator, "data", None)
        if not d or not getattr(self.coordinator, "last_update_success", False):
            return None
        return d.get("longest_outage_hours")
