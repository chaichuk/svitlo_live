from __future__ import annotations
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.components.binary_sensor import (
    BinarySensorEntity,
    BinarySensorDeviceClass,
)
from homeassistant.config_entries import ConfigEntry
from homeassistant.helpers.entity_platform import AddEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .const import DOMAIN


async def async_setup_entry(
    hass: HomeAssistant, entry: ConfigEntry, async_add_entities: AddEntitiesCallback
) -> None:
    coordinator = hass.data[DOMAIN][entry.entry_id]
    async_add_entities([
        SvitloElectricityStatusBinary(coordinator, entry),
        SvitloEmergencyBinary(coordinator, entry)
    ])


class SvitloBaseEntity(CoordinatorEntity):
    _attr_has_entity_name = True

    def __init__(self, coordinator) -> None:
        super().__init__(coordinator)

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

    @property
    def available(self) -> bool:
        return True


class SvitloElectricityStatusBinary(SvitloBaseEntity, BinarySensorEntity):
    """Бінарний сенсор: On = світло є; Off = відключення."""
    _attr_name = "Electricity status"
    _attr_device_class = BinarySensorDeviceClass.POWER

    def __init__(self, coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        # ❗ ПОВЕРНУЛИ СТАРИЙ ID (з entry_id, як було раніше)
        self._attr_unique_id = f"{entry.entry_id}_power_{coordinator.region}_{coordinator.queue}"

    @property
    def is_on(self) -> bool | None:
        data = getattr(self.coordinator, "data", None)
        if not data or not getattr(self.coordinator, "last_update_success", False):
            return None
        val = data.get("now_status")
        if val == "off":
            return False
        if val in ("on", "nosched"):
            return True
        return None

    @property
    def extra_state_attributes(self) -> dict[str, Any]:
        d = getattr(self.coordinator, "data", {}) or {}
        return {
            "next_change_at": d.get("next_change_at"),
            "queue": d.get("queue"),
            "status_raw": d.get("now_status"),
        }


class SvitloEmergencyBinary(SvitloBaseEntity, BinarySensorEntity):
    """Сенсор аварійних відключень."""
    _attr_name = "Emergency outages"
    # Без device_class

    def __init__(self, coordinator, entry: ConfigEntry) -> None:
        super().__init__(coordinator)
        # Цей ID теж робимо по аналогії з Power, щоб було консистентно
        self._attr_unique_id = f"{entry.entry_id}_emergency_{coordinator.region}_{coordinator.queue}"
    
    @property
    def is_on(self) -> bool | None:
        data = getattr(self.coordinator, "data", None)
        if not data:
            return None
        return data.get("is_emergency", False)

    @property
    def icon(self):
        return "mdi:alert-octagon" if self.is_on else "mdi:shield-check"
