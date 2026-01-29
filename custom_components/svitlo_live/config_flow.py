from __future__ import annotations

import voluptuous as vol
from typing import Any, Dict, List

from homeassistant import config_entries
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.selector import selector
from homeassistant.helpers import entity_registry as er

from .api_hub import SvitloApiHub
from .const import (
    DOMAIN, 
    CONF_REGION, 
    CONF_REGION, 
    CONF_QUEUE, 
    CONF_PRESERVE_ID,
    DEFAULT_SCAN_INTERVAL
)

async def _async_get_hub(hass: HomeAssistant) -> SvitloApiHub:
    """Get the API hub from hass data or create it."""
    if "hub" not in hass.data.get(DOMAIN, {}):
        return SvitloApiHub(hass)
    return hass.data[DOMAIN]["hub"]

class SvitloConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    def __init__(self) -> None:
        self._region_id: str | None = None
        self._region_name: str | None = None
        self._catalog: List[Dict[str, Any]] = []

    @staticmethod
    @callback
    def async_get_options_flow(config_entry):
        return SvitloOptionsFlow(config_entry)

    async def async_step_user(self, user_input: dict[str, Any] | None = None):
        hub = await _async_get_hub(self.hass)
        self._catalog = await hub.get_regions_catalog()
        
        if user_input is not None:
            region_name = user_input[CONF_REGION]
            region_node = next((r for r in self._catalog if r["name"] == region_name), None)
            if region_node:
                self._region_id = region_node["id"]
                self._region_name = region_node["name"]
                return await self.async_step_details()

        region_options = [{"label": r["name"], "value": r["name"]} for r in self._catalog]
        
        data_schema = vol.Schema({
            vol.Required(CONF_REGION): selector({
                "select": {"options": region_options, "mode": "dropdown"}
            })
        })
        return self.async_show_form(step_id="user", data_schema=data_schema)

    async def async_step_reconfigure(self, user_input: dict[str, Any] | None = None):
        """Handle reconfiguration of an existing entry."""
        return await self.async_step_user()

    async def async_step_details(self, user_input: dict[str, Any] | None = None):
        if not self._region_id:
            return await self.async_step_user()

        region_node = next((r for r in self._catalog if r["id"] == self._region_id), None)
        if not region_node:
            return await self.async_step_user()
            
        queues = region_node.get("queues", [])
        queue_options = [{"label": q, "value": q} for q in queues]

        if user_input is not None:
            queue = user_input[CONF_QUEUE]
            title = f"{self._region_name} / {queue}"
            
            await self.async_set_unique_id(f"{self._region_id}_{queue}")
            
            if self.context.get("source") == config_entries.SOURCE_RECONFIGURE:
                return self.async_update_reload_and_abort(
                    self._get_reconfigure_entry(),
                    data={CONF_REGION: self._region_id, CONF_QUEUE: queue},
                    title=title
                )

            self._abort_if_unique_id_configured()
            
            return self.async_create_entry(
                title=title,
                data={CONF_REGION: self._region_id, CONF_QUEUE: queue},
            )

        data_schema = vol.Schema({
            vol.Required(CONF_QUEUE): selector({
                "select": {"options": queue_options, "mode": "dropdown"}
            })
        })
        
        return self.async_show_form(
            step_id="details",
            data_schema=data_schema,
            description_placeholders={"region": self._region_name},
        )


class SvitloOptionsFlow(config_entries.OptionsFlow):
    """Handle options flow."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        self._config_entry = config_entry
        self._catalog: List[Dict[str, Any]] = []

    async def async_step_init(self, user_input: dict[str, Any] | None = None):
        """Manage the options."""
        hub = await _async_get_hub(self.hass)
        self._catalog = await hub.get_regions_catalog()
        
        region_id = self._config_entry.data.get(CONF_REGION)
        region_node = next((r for r in self._catalog if r["id"] == region_id), None)
        
        if user_input is not None:
            # We update data for queue, and options for interval
            new_data = dict(self._config_entry.data)
            if CONF_QUEUE in user_input:
                new_data[CONF_QUEUE] = user_input[CONF_QUEUE]
            
            # --- MIGRATION LOGIC START ---
            if user_input.get(CONF_PRESERVE_ID):
                old_region = self._config_entry.data.get(CONF_REGION)
                old_queue = self._config_entry.data.get(CONF_QUEUE)
                new_queue = new_data.get(CONF_QUEUE)
                
                # Only if queue changed and region is present (it should be)
                if old_queue and new_queue and old_queue != new_queue:
                    registry = er.async_get(self.hass)
                    entry_id = self._config_entry.entry_id
                    
                    # List of patterns used in sensor.py and binary_sensor.py
                    # usage: pattern.format(region, queue)
                    patterns = [
                        "svitlo_status_{}_{}",
                        "svitlo_next_grid_{}_{}",
                        "svitlo_next_off_{}_{}",
                        "svitlo_next_power_on_{}_{}",
                        "svitlo_next_power_off_{}_{}",
                        "svitlo_min_to_on_{}_{}",
                        "svitlo_min_to_off_{}_{}",
                        "svitlo_updated_{}_{}",
                        # Binary sensors use entry_id prefix
                        f"{entry_id}_power_{{}}_{{}}",
                        f"{entry_id}_emergency_{{}}_{{}}",
                    ]

                    for pat in patterns:
                        old_uid = pat.format(old_region, old_queue)
                        new_uid = pat.format(old_region, new_queue)
                        
                        # Try to find entity in registry for likely platforms
                        for platform in ["sensor", "binary_sensor"]:
                            entity_id = registry.async_get_entity_id(platform, DOMAIN, old_uid)
                            if entity_id:
                                registry.async_update_entity(entity_id, new_unique_id=new_uid)
                                break
            # --- MIGRATION LOGIC END ---

            new_title = self._config_entry.title
            if region_node:
                new_title = f"{region_node['name']} / {new_data[CONF_QUEUE]}"

            self.hass.config_entries.async_update_entry(
                self._config_entry, 
                data=new_data,
                title=new_title,
                options={
                    "scan_interval_seconds": user_input.get("scan_interval_seconds", DEFAULT_SCAN_INTERVAL)
                }
            )
            return self.async_create_entry(title="", data={})

        queues = region_node.get("queues", []) if region_node else []
        queue_options = [{"label": q, "value": q} for q in queues]
        current_queue = self._config_entry.data.get(CONF_QUEUE)
        current_interval = self._config_entry.options.get("scan_interval_seconds", DEFAULT_SCAN_INTERVAL)

        schema = {}
        
        if queue_options:
            schema[vol.Required(CONF_QUEUE, default=current_queue)] = selector({
                "select": {"options": queue_options, "mode": "dropdown"}
            })
            # Add preserve ID checkbox
            schema[vol.Optional(CONF_PRESERVE_ID, default=False)] = selector({
                "boolean": {}
            })

        return self.async_show_form(
            step_id="init", 
            data_schema=vol.Schema(schema),
            description_placeholders={"region": region_node["name"] if region_node else region_id}
        )
