"""Diagnostics support for Svitlo Live."""
from __future__ import annotations

from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

from .const import DOMAIN, CONF_REGION, CONF_QUEUE

REDACT_CONFIG = {CONF_REGION, CONF_QUEUE}
REDACT_DATA = {"cpu", "name_ua", "name_en"}

async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: ConfigEntry
) -> dict[str, Any]:
    """Return diagnostics for a config entry."""
    coordinator = hass.data[DOMAIN][entry.entry_id]
    hub = coordinator.hub

    diagnostics_data = {
        "entry": async_redact_data(entry.as_dict(), REDACT_CONFIG),
        "coordinator_data": coordinator.data,
        "hub_stats": {
            "last_fetch_old": hub._last_fetch_old.isoformat() if hub._last_fetch_old else None,
            "last_fetch_new": hub._last_fetch_new.isoformat() if hub._last_fetch_new else None,
            "etags_count": len(hub._etags),
            "last_modified_count": len(hub._last_modified),
            "cache_ttl_seconds": hub._cache_ttl.total_seconds(),
        },
        "api_urls": {
            "is_new_api": coordinator.is_new_api,
            "api_region_key": coordinator.api_region_key,
        }
    }

    return diagnostics_data
