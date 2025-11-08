from __future__ import annotations

import logging
from typing import Any, Optional

from homeassistant.core import HomeAssistant
from homeassistant.components.sensor import SensorEntity, SensorDeviceClass
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from homeassistant.util import dt as dt_util

from .const import DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = hass.data[DOMAIN][entry.entry_id]
    _LOGGER.debug(
        "svitlo_live: setting up sensor platform for %s/%s",
        getattr(coordinator, "region", "?"),
        getattr(coordinator, "queue", "?"),
    )

    entities: list[SensorEntity] = [
        SvitloStatusSensor(coordinator),              # Grid ON / Grid OFF / Unknown
        SvitloNextGridConnectionSensor(coordinator),  # timestamp коли з'явиться
        SvitloNextOutageSensor(coordinator),          # timestamp коли зникне
        SvitloScheduleUpdatedSensor(coordinator),     # timestamp опитування
    ]
    async_add_entities(entities, update_before_add=True)


class SvitloBaseEntity(CoordinatorEntity):
    """Базовий ентиті з device_info та available."""

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)

    @property
    def available(self) -> bool:
        return bool(self.coordinator.last_update_success)

    @property
    def device_info(self) -> dict[str, Any]:
        region = getattr(self.coordinator, "region", "region")
        queue = getattr(self.coordinator, "queue", "queue")
        return {
            "identifiers": {(DOMAIN, f"{region}_{queue}")},
            "manufacturer": "svitlo.live",
            "model": f"Queue {queue}",
            "name": f"Svitlo • {region} / {queue}",
        }


class SvitloStatusSensor(SvitloBaseEntity, SensorEntity):
    """Текстовий сенсор: Grid ON / Grid OFF / Unknown."""

    _attr_icon = "mdi:transmission-tower"
    _attr_translation_key = "svitlo_status"

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_status_{coordinator.region}_{coordinator.queue}"
        self._attr_name = "Electricity"

    @property
    def native_value(self) -> Optional[str]:
        if not self.available:
            return None
        val = self.coordinator.data.get("now_status")  # "on"/"off"/"unknown"
        if val == "on":
            return "Grid ON"
        if val == "off":
            return "Grid OFF"
        return "Unknown"


class SvitloNextGridConnectionSensor(SvitloBaseEntity, SensorEntity):
    """TIMESTAMP: якщо зараз off/unknown → показує next_on_at; якщо on → None."""

    _attr_icon = "mdi:clock-check"
    _attr_translation_key = "svitlo_next_on_at"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_next_grid_{coordinator.region}_{coordinator.queue}"
        self._attr_name = "Next grid connection"

    @property
    def native_value(self):
        if not self.available:
            return None
        now = self.coordinator.data.get("now_status")
        if now == "on":
            return None
        iso_val = self.coordinator.data.get("next_on_at")
        return dt_util.parse_datetime(iso_val) if iso_val else None


class SvitloNextOutageSensor(SvitloBaseEntity, SensorEntity):
    """TIMESTAMP: якщо зараз on → показує next_off_at; інакше → None."""

    _attr_icon = "mdi:clock-alert"
    _attr_translation_key = "svitlo_next_off_at"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_next_off_{coordinator.region}_{coordinator.queue}"
        self._attr_name = "Next Outage"

    @property
    def native_value(self):
        if not self.available:
            return None
        now = self.coordinator.data.get("now_status")
        if now != "on":
            return None
        iso_val = self.coordinator.data.get("next_off_at")
        return dt_util.parse_datetime(iso_val) if iso_val else None


class SvitloScheduleUpdatedSensor(SvitloBaseEntity, SensorEntity):
    """Час останнього опитування як timestamp (UTC ISO у coordinator.data['updated'])."""

    _attr_icon = "mdi:update"
    _attr_translation_key = "svitlo_schedule_updated"
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)
        self._attr_unique_id = f"svitlo_updated_{coordinator.region}_{coordinator.queue}"
        self._attr_name = "Schedule Updated"

    @property
    def native_value(self):
        if not self.available:
            return None
        iso_val = self.coordinator.data.get("updated")
        return dt_util.parse_datetime(iso_val) if iso_val else None
