from __future__ import annotations
import logging
import shutil
from pathlib import Path

from homeassistant.core import HomeAssistant
from homeassistant.config_entries import ConfigEntry
from homeassistant.const import Platform
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import device_registry as dr  # <--- Додано для роботи з девайсами

from .const import (
    DOMAIN,
    PLATFORMS,
    CONF_REGION,
    CONF_QUEUE,
    DEFAULT_SCAN_INTERVAL,
)
from .coordinator import SvitloCoordinator

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    """Set up the Svitlo Live component."""
    await hass.async_add_executor_job(_copy_blueprints, hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up Svitlo.live v2 from a config entry."""
    # Ініціалізація хаба
    if "hub" not in hass.data[DOMAIN]:
        from .api_hub import SvitloApiHub
        hass.data[DOMAIN]["hub"] = SvitloApiHub(hass)
    hub = hass.data[DOMAIN]["hub"]
    
    # Зчитуємо параметри
    scan_interval = entry.data.get("scan_interval_seconds", DEFAULT_SCAN_INTERVAL)
    region = entry.data[CONF_REGION]
    queue = entry.data[CONF_QUEUE]

    config = {
        CONF_REGION: region,
        CONF_QUEUE: queue,
        "scan_interval_seconds": scan_interval,
    }
    
    # --- ОЧИЩЕННЯ СТАРИХ ДАНИХ ---
    # Видаляємо сутності ТА девайси, які не відповідають новій конфігурації
    await _async_cleanup_legacy_items(hass, entry)

    # Ініціалізація координатора
    coordinator = SvitloCoordinator(hass, config, hub)
    await coordinator.async_config_entry_first_refresh()
    
    hass.data[DOMAIN][entry.entry_id] = coordinator
    
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    
    # Слухач змін налаштувань
    entry.async_on_unload(entry.add_update_listener(update_listener))
    
    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Unload Svitlo.live v2 entry."""
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    return unload_ok


async def update_listener(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Handle options update."""
    await hass.config_entries.async_reload(entry.entry_id)


async def _async_cleanup_legacy_items(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Видаляє старі сутності та девайси при зміні черги."""
    
    # 1. Підготовка даних
    ent_reg = er.async_get(hass)
    dev_reg = dr.async_get(hass)
    
    current_region = entry.data[CONF_REGION]
    current_queue = entry.data[CONF_QUEUE]
    
    # Формуємо очікуваний ідентифікатор (як він створюється в sensor.py/coordinator)
    # Зазвичай це: svitlo_live_{region}_{queue}
    expected_unique_part = f"{current_region}_{current_queue}"

    _LOGGER.debug("Cleanup started. Keeping items for: %s", expected_unique_part)

    # --- 2. Очищення СУТНОСТЕЙ (Entities) ---
    entities = ent_reg.entities.get_entries_for_config_entry_id(entry.entry_id)
    for entity in entities:
        # Якщо в unique_id сутності немає поточної черги -> видаляємо
        if expected_unique_part not in entity.unique_id:
            _LOGGER.debug("Removing orphan entity: %s", entity.entity_id)
            ent_reg.async_remove(entity.entity_id)

    # --- 3. Очищення ПРИСТРОЇВ (Devices) ---
    devices = dev_reg.devices.get_devices_for_config_entry_id(entry.entry_id)
    for device in devices:
        # Перевіряємо ідентифікатори пристрою
        # device.identifiers виглядає як {('svitlo_live', 'kyiv_3.1')}
        is_current_device = False
        
        for domain, identifier in device.identifiers:
            if domain == DOMAIN and identifier == expected_unique_part:
                is_current_device = True
                break
        
        # Якщо серед ідентифікаторів немає поточного -> видаляємо девайс
        if not is_current_device:
            _LOGGER.debug("Removing orphan device: %s (id: %s)", device.name, device.id)
            dev_reg.async_remove_device(device.id)


def _copy_blueprints(hass: HomeAssistant) -> None:
    """Copy blueprints to the Home Assistant blueprints directory."""
    try:
        integration_path = Path(__file__).parent
        source_blueprints = integration_path / "blueprints" / "automation"
        
        if not source_blueprints.exists():
            return
        
        config_dir = Path(hass.config.path())
        target_blueprints = config_dir / "blueprints" / "automation" / "svitlo_live"
        target_blueprints.mkdir(parents=True, exist_ok=True)
        
        for blueprint_file in source_blueprints.glob("*.yaml"):
            target_file = target_blueprints / blueprint_file.name
            if not target_file.exists() or blueprint_file.stat().st_mtime > target_file.stat().st_mtime:
                shutil.copy2(blueprint_file, target_file)
            
    except Exception as e:
        _LOGGER.error(f"Failed to copy Svitlo Live blueprints: {e}")
