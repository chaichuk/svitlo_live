"""Модуль датчиків (часові сенсори) інтеграції «Світло»."""
from homeassistant.components.sensor import SensorEntity, SensorDeviceClass
from homeassistant.helpers.update_coordinator import CoordinatorEntity
from . import const

async def async_setup_entry(hass, entry, async_add_entities):
    coordinator = hass.data[const.DOMAIN][entry.entry_id]
    entities = []
    entities.append(TimeToNextOutageSensor(coordinator))
    entities.append(NextOutageStartSensor(coordinator))
    entities.append(NextPowerOnSensor(coordinator))
    async_add_entities(entities)

class SvitloBaseSensor(CoordinatorEntity, SensorEntity):
    """Базовий клас для сенсорів інтеграції 'Світло'."""
    def __init__(self, coordinator):
        super().__init__(coordinator)
        # Визначення ідентифікатора девайсу (регіон+група)
        region = coordinator.region
        group = coordinator.group
        self._attr_device_info = {
            "identifiers": {(const.DOMAIN, f"{region}-{group}")},
            "name": f"Світло - {region} черга {group}",
            "manufacturer": "Світло UA",
            "model": "Outage Schedule"
        }

class TimeToNextOutageSensor(SvitloBaseSensor):
    """Датчик часу до наступного відключення."""
    def __init__(self, coordinator):
        super().__init__(coordinator)
        self._attr_name = "Час до наступного відключення"
        self._attr_unique_id = f"{coordinator.region}_{coordinator.group}_time_to_next"

    @property
    def native_value(self):
        # Обчислення хвилин до найближчого відключення
        events = self.coordinator.data.get("events", [])
        if not events:
            return None
        now = datetime.utcnow()
        # Шукаємо найближчий івент ще не почався
        next_event = None
        for ev in events:
            start = ev.get("start")
            end = ev.get("end")
            if start and start > now:
                next_event = ev
                break
            if start and end and start <= now < end:
                # якщо зараз евент в процесі - наступне відключення вже триває
                return 0
        if not next_event:
            return None
        # Розрахуємо різницю в хвилинах
        diff = next_event["start"] - now
        return int(diff.total_seconds() // 60)

class NextOutageStartSensor(SvitloBaseSensor):
    """Датчик часу початку наступного відключення."""
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator):
        super().__init__(coordinator)
        self._attr_name = "Початок наступного відключення"
        self._attr_unique_id = f"{coordinator.region}_{coordinator.group}_next_outage_start"

    @property
    def native_value(self):
        events = self.coordinator.data.get("events", [])
        if not events:
            return None
        now = datetime.utcnow()
        for ev in events:
            start = ev.get("start")
            end = ev.get("end")
            if start and end and start <= now < end:
                # Початок вже є, наступне відключення вже розпочалося
                continue
            if start and start > now:
                return start
        return None

class NextPowerOnSensor(SvitloBaseSensor):
    """Датчик часу відновлення електропостачання."""
    _attr_device_class = SensorDeviceClass.TIMESTAMP

    def __init__(self, coordinator):
        super().__init__(coordinator)
        self._attr_name = "Кінець наступного відключення"
        self._attr_unique_id = f"{coordinator.region}_{coordinator.group}_next_power_on"

    @property
    def native_value(self):
        events = self.coordinator.data.get("events", [])
        if not events:
            return None
        now = datetime.utcnow()
        # якщо зараз є відключення, покажіть час його завершення
        for ev in events:
            start = ev.get("start")
            end = ev.get("end")
            if start and end and start <= now < end:
                return end
        # якщо зараз світло є, визначити кінець наступного відключення
        for ev in events:
            start = ev.get("start")
            end = ev.get("end")
            if start and start > now:
                return end
        return None
