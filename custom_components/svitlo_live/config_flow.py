from __future__ import annotations
from typing import Any, Dict, List, Tuple
import voluptuous as vol

from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.helpers.selector import selector

from .const import DOMAIN, CONF_REGION, CONF_QUEUE, REGIONS, REGION_QUEUE_MODE, CONF_OPERATOR

REGION_SLUG_TO_UI: Dict[str, str] = dict(sorted(REGIONS.items(), key=lambda kv: kv[1]))
REGION_UI_TO_SLUG: Dict[str, str] = {v: k for k, v in REGION_SLUG_TO_UI.items()}
REGION_UI_LIST: List[str] = list(REGION_SLUG_TO_UI.values())
REGION_UI_OPTIONS = [{"label": name, "value": name} for name in REGION_UI_LIST]

def _queue_options_for_region(region_slug: str) -> Tuple[List[str], List[Dict[str, str]], str]:
    mode = REGION_QUEUE_MODE.get(region_slug, "DEFAULT")
    
    if mode == "GRUPA_NUM":
        # Для областей з простими групами (1, 2, 3...)
        max_n = 12 if region_slug == "chernivetska-oblast" else 6
        values = [str(i) for i in range(1, max_n + 1)]
        default = "1"
    elif mode == "CHERGA_NUM":
        values = [str(i) for i in range(1, 7)]
        default = "1"
    else:
        values = [f"{i}.{j}" for i in range(1, 7) for j in (1, 2)]
        default = "1.1"
        
    options = [{"label": v, "value": v} for v in values]
    return values, options, default

class SvitloConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    def __init__(self) -> None:
        self._region_ui: str | None = None
        self._region_slug: str | None = None
        self._operator_slug: str | None = None 

    async def async_step_user(self, user_input: dict[str, Any] | None = None):
        if user_input is not None:
            self._region_ui = user_input[CONF_REGION]
            slug = REGION_UI_TO_SLUG.get(self._region_ui, self._region_ui)
            
            if slug == "dnipro-city":
                return await self.async_step_operator()
            
            self._region_slug = slug
            return await self.async_step_details()

        # дефолтний регіон
        default_region = "м. Київ" if "м. Київ" in REGION_UI_LIST else (REGION_UI_LIST[0] if REGION_UI_LIST else "")
        
        data_schema = vol.Schema({
            vol.Required(CONF_REGION, default=default_region): selector({
                "select": {"options": REGION_UI_OPTIONS, "mode": "dropdown"}
            })
        })
        return self.async_show_form(step_id="user", data_schema=data_schema)

    async def async_step_operator(self, user_input: dict[str, Any] | None = None):
        """Крок вибору оператора для м. Дніпро."""
        if user_input is not None:
            operator = user_input[CONF_OPERATOR]
            # slug на основі вибору
            if operator == "dnem":
                self._region_slug = "dnipro-dnem"
            else:
                self._region_slug = "dnipro-cek"
            return await self.async_step_details()

        # кнопки
        options = [
            {"label": "ДнЕМ (Дніпровські електромережі)", "value": "dnem"},
            {"label": "ЦЕК (Центральна енергетична компанія)", "value": "cek"}
        ]
        
        data_schema = vol.Schema({
            vol.Required(CONF_OPERATOR, default="dnem"): selector({
                "select": {"options": options, "mode": "list"} 
            })
        })

        return self.async_show_form(
            step_id="operator", 
            data_schema=data_schema,
            description_placeholders={"region": self._region_ui}
        )

    async def async_step_details(self, user_input: dict[str, Any] | None = None):
        if not self._region_slug:
            return await self.async_step_user(user_input=None)

        _, queue_options, default_queue = _queue_options_for_region(self._region_slug)

        if user_input is not None:
            queue = user_input[CONF_QUEUE]
            
            # назви для інтеграції
            title_region = self._region_ui
            if self._region_slug == "dnipro-dnem":
                title_region = "Дніпро (ДнЕМ)"
            elif self._region_slug == "dnipro-cek":
                title_region = "Дніпро (ЦЕК)"

            title = f"{title_region} / {queue}"
            
            await self.async_set_unique_id(f"{self._region_slug}_{queue}")
            self._abort_if_unique_id_configured()
            
            return self.async_create_entry(
                title=title,
                data={CONF_REGION: self._region_slug, CONF_QUEUE: queue},
                options={},
            )

        data_schema = vol.Schema({
            vol.Required(CONF_QUEUE, default=default_queue): selector({
                "select": {"options": queue_options, "mode": "dropdown"}
            })
        })
        
        # Динамічний текст для заголовка
        desc_region = self._region_ui
        if self._region_slug == "dnipro-dnem":
            desc_region = "Дніпро (ДнЕМ)"
        elif self._region_slug == "dnipro-cek":
            desc_region = "Дніпро (ЦЕК)"

        return self.async_show_form(
            step_id="details",
            data_schema=data_schema,
            description_placeholders={"region": desc_region},
        )

    @callback
    def async_get_options_flow(self, config_entry):
        return SvitloOptionsFlow(config_entry)

class SvitloOptionsFlow(config_entries.OptionsFlow):
    def __init__(self, entry: config_entries.ConfigEntry):
        self.entry = entry

    async def async_step_init(self, user_input: dict[str, Any] | None = None):
        return self.async_show_menu(step_id="init", menu_options=[])
