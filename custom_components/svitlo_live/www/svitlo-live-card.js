console.info('%c SVITLO-LIVE-CARD %c v2.9.8 ', 'color: white; background: #0288d1; font-weight: 700;', 'color: #0288d1; background: white; font-weight: 700;');
// Svitlo Live Card Editor
class SvitloLiveCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
    if (this._initialized) {
      this._updateProperties();
    }
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass || !this._config) return;

    const entities = Object.keys(this._hass.states).filter((eid) => {
      return eid.startsWith("calendar.svitlo_");
    });

    if (!this._initialized) {
      this.innerHTML = `
        <div style="padding: 10px; display: flex; flex-direction: column; gap: 12px; color: var(--primary-text-color);">
          <ha-textfield
              id="title-input"
              label="Назва картки (необов'язково)"
              style="width: 100%;"
          ></ha-textfield>

          <label style="font-weight: bold; font-size: 14px;">Оберіть вашу чергу (календар):</label>
          <select id="entity-selector" style="
            width: 100%; 
            padding: 12px; 
            border-radius: 8px; 
            background: var(--card-background-color, #fff); 
            color: var(--primary-text-color, #212121);
            border: 2px solid var(--primary-color, #03a9f4);
            font-size: 16px;
            cursor: pointer;
            outline: none;
          ">
            <option value="">Завантаження списку...</option>
          </select>

          <label style="font-weight: bold; font-size: 14px; margin-top: 8px;">Сенсор екстрених відключень (необов'язково):</label>
          <div id="emergency-picker-container" style="min-height: 50px; margin: 4px 0;"></div>

          <label style="font-weight: bold; font-size: 14px; margin-top: 8px;">Сенсор повітряної тривоги (необов'язково):</label>
          <div id="air-alert-picker-container" style="min-height: 50px; margin: 4px 0;"></div>

          <ha-formfield label="Вмикати анімацію тривоги" style="display: flex; align-items: center; margin-top: 4px;">
            <ha-switch id="air-alert-animation-switch"></ha-switch>
          </ha-formfield>

          <ha-formfield label="Динамічний таймлайн (показувати наступні 24 години, якщо графік опубліковано)" style="display: flex; align-items: center; margin-top: 8px;">
            <ha-switch id="dynamic-switch"></ha-switch>
          </ha-formfield>

          <ha-formfield label="Показувати попередній графік (історію)" style="display: flex; align-items: center; margin-top: 8px;">
            <ha-switch id="history-switch"></ha-switch>
          </ha-formfield>

          <ha-formfield label="Показувати час ввімкнення/вимкнення" style="display: flex; align-items: center; margin-top: 8px;">
            <ha-switch id="change-time-switch"></ha-switch>
          </ha-formfield>

          <ha-formfield label="Показувати тривалість відключення" style="display: flex; align-items: center; margin-top: 8px;">
            <ha-switch id="duration-switch"></ha-switch>
          </ha-formfield>

          <ha-formfield label="Показувати статистику" style="display: flex; align-items: center; margin-top: 8px;">
            <ha-switch id="stats-switch"></ha-switch>
          </ha-formfield>

          <div id="stat-type-selectors" style="display: none; margin-top: 8px; padding: 10px; background: rgba(127,127,127,0.05); border-radius: 8px;">
            <label style="font-weight: bold; font-size: 13px;">Лівий блок:</label>
            <select id="left-stat-type" style="width: 100%; padding: 8px; border-radius: 6px; margin: 4px 0 10px 0; background: var(--card-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color);">
              <option value="hours_without_light">Години без світла</option>
              <option value="next_change">Світло буде/вимкнуть о:</option>
              <option value="countdown">До включення/вимкнення</option>
              <option value="schedule_updated">Графік оновлено о:</option>
            </select>

            <label style="font-weight: bold; font-size: 13px;">Правий блок:</label>
            <select id="right-stat-type" style="width: 100%; padding: 8px; border-radius: 6px; margin: 4px 0 0 0; background: var(--card-background-color); color: var(--primary-text-color); border: 1px solid var(--divider-color);">
              <option value="hours_without_light">Години без світла</option>
              <option value="next_change">Світло буде/вимкнуть о:</option>
              <option value="countdown">До включення/вимкнення</option>
              <option value="schedule_updated">Графік оновлено о:</option>
            </select>
          </div>

          <label style="font-weight: bold; font-size: 14px; margin-top: 8px;">Сенсор оновлення графіку (необов'язково):</label>
          <div id="schedule-picker-container" style="min-height: 50px; margin: 4px 0;"></div>

          <label style="font-weight: bold; font-size: 14px; margin-top: 8px;">Власний сенсор статусу (напр. розетка):</label>
          <div id="status-picker-container" style="min-height: 50px; margin: 4px 0;"></div>

          <ha-formfield label="Використовувати цей сенсор як основний пріоритет" style="display: flex; align-items: center; margin-top: 8px;">
            <ha-switch id="priority-switch"></ha-switch>
          </ha-formfield>

          <ha-formfield label="Інвертувати сенсор (ON = немає світла)" style="display: flex; align-items: center; margin-top: 4px;">
            <ha-switch id="invert-switch"></ha-switch>
          </ha-formfield>

          <ha-formfield label="Фарбувати минулі слоти по фактичним відключенням" style="display: flex; align-items: center; margin-top: 8px;">
            <ha-switch id="actual-history-switch"></ha-switch>
          </ha-formfield>

          <label style="font-weight: bold; font-size: 14px; margin-top: 16px; display: block; border-top: 1px solid var(--divider-color); padding-top: 12px;">⚡ Сенсори напруги (замість "Є світло"):</label>
          <div style="font-size: 12px; opacity: 0.7; margin: 2px 0 8px 0;">Оберіть сенсор(и) напруги для 1 або 3 фаз. Якщо не обрано — відображатиметься стандартний статус "Є світло".</div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
            <label style="font-weight: 500; font-size: 13px;">Фаза 1:</label>
            <button type="button" id="clear-voltage1" title="Очистити вибір" style="background: none; border: none; color: #ef5350; cursor: pointer; font-size: 12px; font-weight: 600; padding: 2px 4px; display: none;">✕ Очистити</button>
          </div>
          <div id="voltage1-picker-container" style="min-height: 50px; margin: 4px 0;"></div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
            <label style="font-weight: 500; font-size: 13px;">Фаза 2:</label>
            <button type="button" id="clear-voltage2" title="Очистити вибір" style="background: none; border: none; color: #ef5350; cursor: pointer; font-size: 12px; font-weight: 600; padding: 2px 4px; display: none;">✕ Очистити</button>
          </div>
          <div id="voltage2-picker-container" style="min-height: 50px; margin: 4px 0;"></div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 6px;">
            <label style="font-weight: 500; font-size: 13px;">Фаза 3:</label>
            <button type="button" id="clear-voltage3" title="Очистити вибір" style="background: none; border: none; color: #ef5350; cursor: pointer; font-size: 12px; font-weight: 600; padding: 2px 4px; display: none;">✕ Очистити</button>
          </div>
          <div id="voltage3-picker-container" style="min-height: 50px; margin: 4px 0;"></div>

          <label style="font-weight: bold; font-size: 14px; margin-top: 16px; display: block; border-top: 1px solid var(--divider-color); padding-top: 12px;">Зовнішній вигляд:</label>
          <ha-formfield label="Показувати тінь картки" style="display: flex; align-items: center; margin-top: 4px;">
            <ha-switch id="shadow-switch"></ha-switch>
          </ha-formfield>

          <div style="display: flex; gap: 12px; margin-top: 12px;">
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 12px; font-weight: 500;">Колір "є світло"</label>
              <input type="color" id="color-on-picker" style="width: 100%; height: 40px; padding: 0; border: 1px solid var(--divider-color); border-radius: 6px; cursor: pointer; background: none;">
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 12px; font-weight: 500;">Колір "немає світла"</label>
              <input type="color" id="color-off-picker" style="width: 100%; height: 40px; padding: 0; border: 1px solid var(--divider-color); border-radius: 6px; cursor: pointer; background: none;">
            </div>
            <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
              <label style="font-size: 12px; font-weight: 500;">Колір "невідомо"</label>
              <input type="color" id="color-unknown-picker" style="width: 100%; height: 40px; padding: 0; border: 1px solid var(--divider-color); border-radius: 6px; cursor: pointer; background: none;">
            </div>
          </div>

          <button id="reset-colors-btn" style="margin-top: 8px; padding: 6px 12px; border-radius: 6px; border: 1px solid var(--divider-color); background: transparent; color: var(--primary-text-color); cursor: pointer; font-size: 13px;">Скинути кольори</button>

        </div>
      `;

      this._setupPickers();
      this._setupEventListeners();
      this._initialized = true;
    }

    const selector = this.querySelector("#entity-selector");
    if (selector) {
      const currentCount = parseInt(selector.dataset.count || "0");
      if (currentCount !== entities.length || selector.options.length <= 1) {
        const currentVal = this._config.entity || "";
        const optionsHtml = `
          <option value="" ${!currentVal ? "selected" : ""}>--- Оберіть зі списку (${entities.length} знайдено) ---</option>
          ${entities.sort().map(eid => {
          const state = this._hass.states[eid];
          const friendlyName = state?.attributes?.friendly_name || eid;
          return `<option value="${eid}">${friendlyName}</option>`;
        }).join('')}
        `;
        selector.innerHTML = optionsHtml;
        selector.dataset.count = entities.length;
      }
      if (this._config.entity) selector.value = this._config.entity;
    }

    this._updateProperties();
  }

  _setupPickers() {
    const statusContainer = this.querySelector("#status-picker-container");
    if (statusContainer) {
      const selector = document.createElement("ha-selector");
      selector.hass = this._hass;
      selector.selector = { entity: { domain: ['binary_sensor', 'sensor', 'switch', 'input_boolean'] } };
      selector.addEventListener("value-changed", (ev) => {
        this._valueChanged({ target: { configValue: 'status_entity', value: ev.detail.value } });
      });
      statusContainer.innerHTML = "";
      statusContainer.appendChild(selector);
      this._statusSelector = selector;
    }

    const emergencyContainer = this.querySelector("#emergency-picker-container");
    if (emergencyContainer) {
      const selector = document.createElement("ha-selector");
      selector.hass = this._hass;
      selector.selector = { entity: { domain: ['binary_sensor', 'input_boolean', 'switch', 'sensor'] } };
      selector.addEventListener("value-changed", (ev) => {
        this._valueChanged({ target: { configValue: 'emergency_entity', value: ev.detail.value } });
      });
      emergencyContainer.innerHTML = "";
      emergencyContainer.appendChild(selector);
      this._emergencySelector = selector;
    }

    const airAlertContainer = this.querySelector("#air-alert-picker-container");
    if (airAlertContainer) {
      const selector = document.createElement("ha-selector");
      selector.hass = this._hass;
      selector.selector = { entity: { domain: ['binary_sensor', 'input_boolean', 'switch', 'sensor'] } };
      selector.addEventListener("value-changed", (ev) => {
        this._valueChanged({ target: { configValue: 'air_alert_entity', value: ev.detail.value } });
      });
      airAlertContainer.innerHTML = "";
      airAlertContainer.appendChild(selector);
      this._airAlertSelector = selector;
    }

    const scheduleContainer = this.querySelector("#schedule-picker-container");
    if (scheduleContainer) {
      const selector = document.createElement("ha-selector");
      selector.hass = this._hass;
      selector.selector = { entity: { domain: ['sensor'], integration: 'svitlo_live' } };
      selector.addEventListener("value-changed", (ev) => {
        this._valueChanged({ target: { configValue: 'schedule_entity', value: ev.detail.value } });
      });
      scheduleContainer.innerHTML = "";
      scheduleContainer.appendChild(selector);
      this._scheduleSelector = selector;
    }

    const v1Container = this.querySelector("#voltage1-picker-container");
    if (v1Container) {
      const selector = document.createElement("ha-selector");
      selector.hass = this._hass;
      selector.selector = { entity: { domain: ['sensor', 'input_number'] } };
      selector.addEventListener("value-changed", (ev) => {
        this._valueChanged({ target: { configValue: 'voltage_entity', value: ev.detail.value } });
      });
      v1Container.innerHTML = "";
      v1Container.appendChild(selector);
      this._voltage1Selector = selector;
    }

    const v2Container = this.querySelector("#voltage2-picker-container");
    if (v2Container) {
      const selector = document.createElement("ha-selector");
      selector.hass = this._hass;
      selector.selector = { entity: { domain: ['sensor', 'input_number'] } };
      selector.addEventListener("value-changed", (ev) => {
        this._valueChanged({ target: { configValue: 'phase2_entity', value: ev.detail.value } });
      });
      v2Container.innerHTML = "";
      v2Container.appendChild(selector);
      this._voltage2Selector = selector;
    }

    const v3Container = this.querySelector("#voltage3-picker-container");
    if (v3Container) {
      const selector = document.createElement("ha-selector");
      selector.hass = this._hass;
      selector.selector = { entity: { domain: ['sensor', 'input_number'] } };
      selector.addEventListener("value-changed", (ev) => {
        this._valueChanged({ target: { configValue: 'phase3_entity', value: ev.detail.value } });
      });
      v3Container.innerHTML = "";
      v3Container.appendChild(selector);
      this._voltage3Selector = selector;
    }
  }

  _setupEventListeners() {
    const titleInput = this.querySelector("#title-input");
    if (titleInput) titleInput.addEventListener("input", (ev) => this._valueChanged({ target: { configValue: 'title', value: ev.target.value } }));

    const colorOnPicker = this.querySelector("#color-on-picker");
    if (colorOnPicker) {
      colorOnPicker.addEventListener("input", (ev) => {
        this._valueChanged({ target: { configValue: 'color_on', value: ev.target.value } });
      });
    }

    const colorOffPicker = this.querySelector("#color-off-picker");
    if (colorOffPicker) {
      colorOffPicker.addEventListener("input", (ev) => {
        this._valueChanged({ target: { configValue: 'color_off', value: ev.target.value } });
      });
    }

    const colorUnknownPicker = this.querySelector("#color-unknown-picker");
    if (colorUnknownPicker) {
      colorUnknownPicker.addEventListener("input", (ev) => {
        this._valueChanged({ target: { configValue: 'color_unknown', value: ev.target.value } });
      });
    }

    const selector = this.querySelector("#entity-selector");
    if (selector) selector.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'entity', value: ev.target.value } }));

    const prioritySwitch = this.querySelector("#priority-switch");
    if (prioritySwitch) {
      prioritySwitch.addEventListener("change", (ev) => {
        this._valueChanged({ target: { configValue: 'use_status_entity', value: ev.target.checked } });
      });
    }

    const invertSwitch = this.querySelector("#invert-switch");
    if (invertSwitch) invertSwitch.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'invert_status_entity', value: ev.target.checked } }));

    const dynamicSwitch = this.querySelector("#dynamic-switch");
    if (dynamicSwitch) dynamicSwitch.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'dynamic_timeline', value: ev.target.checked } }));

    const historySwitch = this.querySelector("#history-switch");
    if (historySwitch) historySwitch.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'show_history', value: ev.target.checked } }));

    const changeTimeSwitch = this.querySelector("#change-time-switch");
    if (changeTimeSwitch) changeTimeSwitch.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'show_change_time', value: ev.target.checked } }));

    const durationSwitch = this.querySelector("#duration-switch");
    if (durationSwitch) durationSwitch.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'show_duration', value: ev.target.checked } }));

    const statsSwitch = this.querySelector("#stats-switch");
    const statTypeSelectors = this.querySelector("#stat-type-selectors");
    if (statsSwitch) {
      statsSwitch.addEventListener("change", (ev) => {
        this._valueChanged({ target: { configValue: 'show_stats', value: ev.target.checked } });
        if (statTypeSelectors) statTypeSelectors.style.display = ev.target.checked ? 'block' : 'none';
      });
    }

    const leftStatType = this.querySelector("#left-stat-type");
    if (leftStatType) leftStatType.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'left_stat_type', value: ev.target.value } }));

    const rightStatType = this.querySelector("#right-stat-type");
    if (rightStatType) rightStatType.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'right_stat_type', value: ev.target.value } }));

    const ahSwitch = this.querySelector("#actual-history-switch");
    if (ahSwitch) ahSwitch.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'show_actual_history', value: ev.target.checked } }));

    const shadowSwitch = this.querySelector("#shadow-switch");
    if (shadowSwitch) shadowSwitch.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'show_shadow', value: ev.target.checked } }));

    const airAlertAnimSwitch = this.querySelector("#air-alert-animation-switch");
    if (airAlertAnimSwitch) airAlertAnimSwitch.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'air_alert_animation', value: ev.target.checked } }));

    const resetColorsBtn = this.querySelector("#reset-colors-btn");
    if (resetColorsBtn) {
      resetColorsBtn.addEventListener("click", () => {
        const colorOnPicker = this.querySelector("#color-on-picker");
        const colorOffPicker = this.querySelector("#color-off-picker");
        const colorUnknownPicker = this.querySelector("#color-unknown-picker");
        if (colorOnPicker) colorOnPicker.value = '#1b5e20';
        if (colorOffPicker) colorOffPicker.value = '#7f0000';
        if (colorUnknownPicker) colorUnknownPicker.value = '#444444';
        const newConfig = { ...this._config };
        delete newConfig.color_on;
        delete newConfig.color_off;
        delete newConfig.color_unknown;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
      });
    }

    const setupClear = (btnId, selectorProp, configKeys) => {
      const btn = this.querySelector(btnId);
      if (btn) {
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          if (this[selectorProp]) {
            this[selectorProp].value = '';
          }
          const newConfig = { ...this._config };
          configKeys.forEach(k => delete newConfig[k]);
          this._config = newConfig;
          this._updateProperties();
          this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
        });
      }
    };

    setupClear('#clear-voltage1', '_voltage1Selector', ['voltage_entity', 'phase1_entity', 'voltage_entity_l1']);
    setupClear('#clear-voltage2', '_voltage2Selector', ['phase2_entity', 'voltage_entity_l2']);
    setupClear('#clear-voltage3', '_voltage3Selector', ['phase3_entity', 'voltage_entity_l3']);
  }

  _updateProperties() {
    if (!this._hass || !this._config) return;
    const titleInput = this.querySelector("#title-input");
    if (titleInput) titleInput.value = this._config.title || '';

    const colorOnPicker = this.querySelector("#color-on-picker");
    if (colorOnPicker) colorOnPicker.value = this._config.color_on || '#1b5e20';

    const colorOffPicker = this.querySelector("#color-off-picker");
    if (colorOffPicker) colorOffPicker.value = this._config.color_off || '#7f0000';

    const colorUnknownPicker = this.querySelector("#color-unknown-picker");
    if (colorUnknownPicker) colorUnknownPicker.value = this._config.color_unknown || '#444444';

    if (this._statusSelector) {
      this._statusSelector.hass = this._hass;
      this._statusSelector.value = this._config.status_entity || '';
    }

    if (this._emergencySelector) {
      this._emergencySelector.hass = this._hass;
      this._emergencySelector.value = this._config.emergency_entity || '';
    }

    if (this._airAlertSelector) {
      this._airAlertSelector.hass = this._hass;
      this._airAlertSelector.value = this._config.air_alert_entity || '';
    }

    const ps = this.querySelector("#priority-switch");
    if (ps) ps.checked = this._config.use_status_entity || false;

    const invs = this.querySelector("#invert-switch");
    if (invs) invs.checked = this._config.invert_status_entity || false;

    const ds = this.querySelector("#dynamic-switch");
    if (ds) ds.checked = this._config.dynamic_timeline || false;

    const hs = this.querySelector("#history-switch");
    if (hs) hs.checked = this._config.show_history || false;

    const cts = this.querySelector("#change-time-switch");
    if (cts) cts.checked = this._config.show_change_time !== false;

    const durs = this.querySelector("#duration-switch");
    if (durs) durs.checked = this._config.show_duration !== false;

    const ss = this.querySelector("#stats-switch");
    const showStats = this._config.show_stats !== false;
    if (ss) ss.checked = showStats;

    const statTypeSelectors = this.querySelector("#stat-type-selectors");
    if (statTypeSelectors) statTypeSelectors.style.display = showStats ? 'block' : 'none';

    const leftStatType = this.querySelector("#left-stat-type");
    if (leftStatType) leftStatType.value = this._config.left_stat_type || 'hours_without_light';

    const rightStatType = this.querySelector("#right-stat-type");
    if (rightStatType) rightStatType.value = this._config.right_stat_type || 'schedule_updated';

    if (this._scheduleSelector) {
      this._scheduleSelector.hass = this._hass;
      this._scheduleSelector.value = this._config.schedule_entity || '';
    }

    const v1Val = this._config.voltage_entity || this._config.phase1_entity || '';
    if (this._voltage1Selector) {
      this._voltage1Selector.hass = this._hass;
      this._voltage1Selector.value = v1Val;
    }
    const clear1 = this.querySelector("#clear-voltage1");
    if (clear1) clear1.style.display = v1Val ? 'inline-block' : 'none';

    const v2Val = this._config.phase2_entity || this._config.voltage_entity_l2 || '';
    if (this._voltage2Selector) {
      this._voltage2Selector.hass = this._hass;
      this._voltage2Selector.value = v2Val;
    }
    const clear2 = this.querySelector("#clear-voltage2");
    if (clear2) clear2.style.display = v2Val ? 'inline-block' : 'none';

    const v3Val = this._config.phase3_entity || this._config.voltage_entity_l3 || '';
    if (this._voltage3Selector) {
      this._voltage3Selector.hass = this._hass;
      this._voltage3Selector.value = v3Val;
    }
    const clear3 = this.querySelector("#clear-voltage3");
    if (clear3) clear3.style.display = v3Val ? 'inline-block' : 'none';

    const ahs = this.querySelector("#actual-history-switch");
    if (ahs) ahs.checked = this._config.show_actual_history === true;

    const shs = this.querySelector("#shadow-switch");
    if (shs) shs.checked = this._config.show_shadow !== false;

    const aaas = this.querySelector("#air-alert-animation-switch");
    if (aaas) aaas.checked = this._config.air_alert_animation !== false;
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;
    const target = ev.target;
    if (this._config[target.configValue] === target.value) return;
    const newConfig = { ...this._config };
    if (target.value === undefined || target.value === null || target.value === '') {
      delete newConfig[target.configValue];
    } else {
      newConfig[target.configValue] = target.value;
    }
    this._config = newConfig;
    this._updateProperties();
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
  }
}
customElements.define('svitlo-live-card-editor', SvitloLiveCardEditor);


class SvitloLiveCard extends HTMLElement {
  constructor() {
    super();
    this._selectedDay = 'today';
  }

  _isStateOff(s) {
    if (!s) return false;
    const val = String(s).toLowerCase();
    return ['off', 'grid off', 'grid-off', 'unavailable', '0', 'false'].includes(val);
  }

  _isStateUnknown(s) {
    if (!s) return true;
    const val = String(s).toLowerCase();
    return ['unknown', 'none', 'null', 'undefined'].includes(val);
  }

  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `
        <ha-card id="svitlo-card" style="overflow: hidden; position: relative; box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 40px rgba(0,0,0,0.1);">
          <div id="container" style="padding: 16px; position: relative;">
            
            <div id="header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; gap: 8px;">
              <div style="display: flex; flex-direction: column; gap: 0px; flex: 1; min-width: 0;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <ha-icon id="power-icon" icon="mdi:power-plug-off" style="display: none; color: #ef5350; --mdc-icon-size: 32px; flex-shrink: 0; margin-top: -4px;"></ha-icon>
                  <div id="title" style="font-size: 20px; font-weight: 700; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.3px;">Svitlo.live</div>
                </div>
                <div id="history-label" style="font-size: 12px; opacity: 0.55; white-space: nowrap; font-weight: 500; overflow: hidden; text-overflow: ellipsis;"></div>
                <div id="duration-label" style="font-size: 11px; opacity: 0.45; white-space: nowrap; font-weight: 500; display: none;"></div>
              </div>

              <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex: 0 0 auto;">
                <div id="status" style="font-size: 12px; padding: 4px 14px; border-radius: 8px; font-weight: 700; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15); text-transform: uppercase; letter-spacing: 0.3px; text-align: center;"></div>
                <div id="emergency-banner" style="display: none; background: linear-gradient(135deg, #c62828 0%, #8e0000 100%); color: rgba(255,255,255,0.9); padding: 3px 14px; border-radius: 6px; font-size: 10px; font-weight: 600; text-align: center; animation: pulse 2s infinite; box-shadow: 0 2px 8px rgba(183, 28, 28, 0.4), inset 0 1px 0 rgba(255,255,255,0.1); white-space: nowrap; text-transform: uppercase; letter-spacing: 0.2px;">
                  📢 ЕКСТРЕНІ ВІДКЛЮЧЕННЯ
                </div>
              </div>
            </div>

            <div id="day-switcher" style="display: flex; gap: 4px; border-radius: 10px; background: rgba(127,127,127,0.08); padding: 3px; margin-bottom: 14px; font-size: 12px; width: fit-content; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
              <div class="day-tab active" data-day="today" style="padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: all 0.25s ease; font-weight: 600;">Сьогодні</div>
              <div class="day-tab" data-day="tomorrow" id="tomorrow-tab" style="padding: 6px 14px; border-radius: 8px; cursor: pointer; transition: all 0.25s ease; display: none; font-weight: 600;">Завтра</div>
            </div>
            
            <div style="margin-bottom: 3px;">
              <div id="timeline" style="
                  height: 42px; 
                  display: flex; 
                  border-radius: 12px; 
                  overflow: hidden; 
                  position: relative; !important;
                  background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%); 
                  border: 1px solid rgba(255,255,255,0.08);
                  box-shadow: 0 4px 15px rgba(0,0,0,0.3), inset 0 2px 4px rgba(0,0,0,0.4); 
                  
              ">
                <div id="now-marker" style="
                    position: absolute; 
                    top: 0; bottom: 0; 
                    width: 3px; 
                    background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.8) 100%); 
                    box-shadow: 0 0 12px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5); 
                    border-radius: 2px;
                "></div>
              </div>
              
              <div id="history-timeline" style="
                  display: none; 
                  flex-direction: column; 
                  margin-top: 2px; 
              "></div>

              <div id="ruler" style="position: relative; font-size: 11px; opacity: 0.5; margin-top: 4px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; font-weight: 500;">
              </div>
            </div>

            <div id="stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 3px;">
              <div id="left-stat" class="stat-item" style="
                  background: linear-gradient(180deg, rgba(127,127,127,0.08) 0%, rgba(127,127,127,0.03) 100%); 
                  border: 1px solid rgba(127,127,127,0.12);
                  padding: 3px 6px; 
                  border-radius: 10px; 
                  display: flex; 
                  flex-direction: column; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 40px; 
                  text-align: center;
                  gap: 2px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05);
              ">
                <div id="left-stat-label" style="font-size: 10px; opacity: 0.5; line-height: 1.3; font-weight: 500;">--</div>
                <div id="left-stat-value" style="font-size: 18px; font-weight: 700; color: var(--primary-text-color); line-height: 1.2; letter-spacing: -0.3px;">--</div>
              </div>

              <div id="right-stat" class="stat-item" style="
                  background: linear-gradient(180deg, rgba(127,127,127,0.08) 0%, rgba(127,127,127,0.03) 100%); 
                  border: 1px solid rgba(127,127,127,0.12);
                  padding: 3px 6px; 
                  border-radius: 10px; 
                  display: flex; 
                  flex-direction: column; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 40px; 
                  text-align: center;
                  gap: 2px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05);
              ">
                <div id="right-stat-label" style="font-size: 10px; opacity: 0.5; line-height: 1.3; font-weight: 500;">--</div>
                <div id="right-stat-value" style="font-size: 18px; font-weight: 700; color: var(--primary-text-color); line-height: 1.2; letter-spacing: -0.3px;">--</div>
              </div>
            </div>

          </div>
          <style>
            .day-tab.active { 
              background: var(--primary-color, #03a9f4); 
              color: #fff; 
              box-shadow: 0 2px 8px rgba(3, 169, 244, 0.4);
            }
            .day-tab:not(.active):hover { 
              background: rgba(127,127,127,0.15); 
            }
            @keyframes pulse {
              0% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.92; transform: scale(0.995); }
              100% { opacity: 1; transform: scale(1); }
            }
            @keyframes air-alert-pulse {
              0%, 100% { 
                box-shadow: 0 0 8px 1px rgba(255, 0, 0, 0.6),
                            0 0 12px 2px rgba(255, 0, 0, 0.4);
              }
              50% { 
                box-shadow: 0 0 12px 2px rgba(255, 0, 0, 0.9),
                            0 0 18px 3px rgba(255, 0, 0, 0.6);
              }
            }
            ha-card.air-alert-active {
              animation: air-alert-pulse 2s ease-in-out infinite;
              border: 3px solid rgba(255, 0, 0, 0.8);
            }
            .timeline-block {
               position: relative;
               z-index: 1;
            }
            .timeline-block::after {
               content: "";
               position: absolute;
               top: 0; left: 0; right: 0; bottom: 0;
               background: linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 50%);
               pointer-events: none;
            }
            .stat-item {
               transition: transform 0.2s ease, box-shadow 0.2s ease;
            }
            .stat-item:active {
               transform: scale(0.98);
            }
            ha-card.no-shadows {
               box-shadow: none !important;
            }
            ha-card.no-shadows .stat-item {
               box-shadow: none !important;
            }
            ha-card.no-shadows #status {
               box-shadow: none !important;
            }
            ha-card.no-shadows #timeline {
               box-shadow: none !important;
            }
          </style>
        </ha-card>
      `;
      this.content = this.querySelector('#container');

      this.querySelectorAll('.day-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          this._selectedDay = tab.dataset.day;
          this._renderWithCurrentDay(hass);
        });
      });
    }

    this._hass = hass;
    if (this.config && this.config.show_actual_history) {
      this._fetchHistoryFromEntity(hass);
    }
    this._renderWithCurrentDay(hass);
  }

  async _fetchHistoryFromEntity(hass) {
    if (!this.config || !this.config.show_actual_history) return;

    let entityId = this.config.status_entity || this.config.entity;
    if (!entityId) return;

    const now = Date.now();
    if (this._lastHistoryFetch && (now - this._lastHistoryFetch < 60000)) return;
    this._lastHistoryFetch = now;

    const startRange = new Date(now - 24 * 60 * 60 * 1000);
    const endRange = new Date(now);

    try {
      const startISO = startRange.toISOString();
      const endISO = endRange.toISOString();

      const response = await hass.callApi(
        'GET',
        `history/period/${startISO}?filter_entity_id=${entityId}&end_time=${endISO}&minimal_response`
      );

      const rawHistory = (response && response[0]) ? response[0] : [];

      const intervals = [];
      let currentStart = null;
      let currentState = null;

      rawHistory.forEach((hItem) => {
        let itemState = 'on';
        if (this._isStateOff(hItem.state)) itemState = 'off';
        else if (this._isStateUnknown(hItem.state)) itemState = 'unknown';

        if (this.config && this.config.invert_status_entity && itemState !== 'unknown') {
          itemState = (itemState === 'on') ? 'off' : 'on';
        }

        const itemTime = new Date(hItem.last_changed).getTime();

        if (currentStart === null) {
          currentStart = itemTime;
          currentState = itemState;
        } else {
          if (itemState !== currentState) {
            intervals.push({ state: currentState, start: currentStart, end: itemTime });
            currentStart = itemTime;
            currentState = itemState;
          }
        }
      });

      if (currentStart !== null) {
        intervals.push({ state: currentState, start: currentStart, end: Date.now() });
      }

      // Фільтрація коротких переключень (<15 хв)
      const MIN_DURATION_MS = 15 * 60 * 1000;
      const filteredIntervals = [];

      for (let i = 0; i < intervals.length; i++) {
        const interval = intervals[i];
        const duration = interval.end - interval.start;

        if (duration >= MIN_DURATION_MS) {
          filteredIntervals.push(interval);
          continue;
        }

        const prevInterval = intervals[i - 1];
        const nextInterval = intervals[i + 1];

        if (prevInterval && nextInterval &&
          prevInterval.state === nextInterval.state &&
          interval.state !== prevInterval.state) {
          continue;
        }

        filteredIntervals.push(interval);
      }

      // Об'єднання сусідніх інтервалів з однаковим станом
      const mergedIntervals = [];
      for (let i = 0; i < filteredIntervals.length; i++) {
        const current = filteredIntervals[i];

        if (mergedIntervals.length === 0) {
          mergedIntervals.push(current);
          continue;
        }

        const last = mergedIntervals[mergedIntervals.length - 1];

        if (last.state === current.state) {
          last.end = current.end;
        } else {
          mergedIntervals.push(current);
        }
      }

      this._actualOutages = mergedIntervals
        .filter(i => i.state === 'off')
        .map(i => ({
          start: { dateTime: new Date(i.start).toISOString() },
          end: { dateTime: new Date(i.end).toISOString() }
        }));

      this._unknownIntervals = mergedIntervals
        .filter(i => i.state === 'unknown')
        .map(i => ({
          start: { dateTime: new Date(i.start).toISOString() },
          end: { dateTime: new Date(i.end).toISOString() }
        }));

      this._renderWithCurrentDay(hass);

    } catch (e) {
      console.warn("SvitloLive: Error fetching entity history", e);
    }
  }

  _getKyivTime() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { timeZone: "Europe/Kyiv", hour12: false, hour: '2-digit', minute: '2-digit' });
    const [h, m] = timeStr.split(':').map(Number);
    return { h, m };
  }

  _renderWithCurrentDay(hass) {
    const config = this.config;
    if (!config || !config.entity || !hass.states[config.entity]) return;

    const card = this.querySelector('#svitlo-card');
    if (card) {
      if (config.show_shadow === false) {
        card.classList.add('no-shadows');
      } else {
        card.classList.remove('no-shadows');
      }
    }

    const stateObj = hass.states[config.entity];
    const attrs = stateObj.attributes;

    const showStats = config.show_stats !== false;
    const showActualHistory = config.show_actual_history === true;
    const customStatusEntity = config.status_entity ? hass.states[config.status_entity] : null;

    const kTime = this._getKyivTime();
    const currentIdx = kTime.h * 2 + (kTime.m >= 30 ? 1 : 0);

    let todayData = attrs.today_48half || [];
    let tomorrowData = attrs.tomorrow_48half || [];
    let todayHistory = attrs.history_today_48half;
    let tomorrowHistory = attrs.history_tomorrow_48half;

    if (attrs.date) {
      const dateStr = attrs.date.split('T')[0];
      const kyivNowStr = new Date().toLocaleString("en-CA", { timeZone: "Europe/Kyiv" }).split(',')[0];

      if (dateStr < kyivNowStr) {
        todayData = tomorrowData;
        tomorrowData = [];
        todayHistory = tomorrowHistory;
        tomorrowHistory = [];
      }
    }

    const tomorrowSch = tomorrowData;
    const hasTomorrow = tomorrowSch.length === 48;
    const isDynamic = config.dynamic_timeline && hasTomorrow;
    const isToday = this._selectedDay === 'today';

    const daySwitcher = this.querySelector('#day-switcher');
    const tomorrowTab = this.querySelector('#tomorrow-tab');
    if (daySwitcher) {
      daySwitcher.style.display = isDynamic ? 'none' : (hasTomorrow ? 'flex' : 'none');
      if (tomorrowTab) tomorrowTab.style.display = hasTomorrow ? 'block' : 'none';
    }
    const tabs = this.querySelectorAll('.day-tab');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.day === this._selectedDay));

    const titleEl = this.querySelector('#title');
    if (titleEl) {
      titleEl.innerText = config.title || (attrs.region && attrs.queue ? `${attrs.region} / ${attrs.queue}` : (attrs.friendly_name || "Svitlo.live").replace("Svitlo • ", "").replace(" Outages Schedule", ""));
    }

    const historyLabelEl = this.querySelector('#history-label');
    const statusEl = this.querySelector('#status');
    const eb = this.querySelector('#emergency-banner');
    const nowMarker = this.querySelector('#now-marker');
    const timelineEl = this.querySelector('#timeline');
    const rulerEl = this.querySelector('#ruler');
    const powerIcon = this.querySelector('#power-icon');
    const durationLabel = this.querySelector('#duration-label');

    const formatTime = (d) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;

    const getBaselineDate = () => {
      const now = new Date();
      const kyivTimeStr = now.toLocaleTimeString("en-US", { timeZone: "Europe/Kyiv", hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const [h, m, s] = kyivTimeStr.split(':').map(Number);
      const msSinceMidnight = (h * 3600 + m * 60 + s) * 1000;
      const kyivMidnightMs = now.getTime() - msSinceMidnight;
      const date = new Date(kyivMidnightMs);
      date.setMilliseconds(0);
      return date;
    };

    const baselineDate = getBaselineDate();

    const toLocalDisplay = (targetIdx) => {
      const targetDate = new Date(baselineDate.getTime() + (targetIdx * 30 * 60 * 1000));
      return { time: formatTime(targetDate), date: targetDate };
    };

    let schedule = [];
    let startOffsetIdx = 0;

    const getLocalDayOffsetSlots = () => {
      const now = new Date();
      const localMidnight = new Date(now);
      localMidnight.setHours(0, 0, 0, 0);
      const kyivTimeStr = localMidnight.toLocaleTimeString("en-US", { timeZone: "Europe/Kyiv", hour12: false, hour: '2-digit', minute: '2-digit' });
      const [kh, km] = kyivTimeStr.split(':').map(Number);
      return kh * 2 + (km >= 30 ? 1 : 0);
    };

    if (isDynamic) {
      startOffsetIdx = Math.max(0, currentIdx - 3);
      schedule = [...todayData.slice(startOffsetIdx), ...tomorrowSch.slice(0, 48 - todayData.slice(startOffsetIdx).length)];
    } else {
      const shift = getLocalDayOffsetSlots();
      const base = isToday ? todayData : tomorrowSch;
      const next = isToday ? tomorrowSch : [];
      startOffsetIdx = shift + (isToday ? 0 : 48);
      const part1 = base.slice(shift);
      const part2 = next.slice(0, 48 - part1.length);
      const padding = Array(48 - (part1.length + part2.length)).fill('unknown');
      schedule = [...part1, ...part2, ...padding];
    }

    let schedState = (todayData && todayData[currentIdx]) || 'unknown';
    let isOffCurrent = (schedState === 'off');
    let isUnknownCurrent = (schedState === 'unknown' || schedState === 'nosched' || !schedState);

    const statsEl = this.querySelector('#stats');
    if (statsEl) {
      if (showStats) statsEl.style.display = 'grid';
      else statsEl.style.display = 'none';
    }

    if (customStatusEntity && config.use_status_entity) {
      const cs = customStatusEntity.state;
      if (this._isStateOff(cs)) {
        isOffCurrent = true;
        isUnknownCurrent = false;
      } else if (this._isStateUnknown(cs)) {
        isUnknownCurrent = true;
        isOffCurrent = false;
      } else {
        isOffCurrent = false;
        isUnknownCurrent = false;
      }

      if (config.invert_status_entity && !isUnknownCurrent) {
        isOffCurrent = !isOffCurrent;
      }
    }

    let currentSlotState = isUnknownCurrent ? 'unknown' : (isOffCurrent ? 'off' : 'on');

    // Обробка сенсорів напруги (Фаза 1, 2, 3)
    const v1Entity = config.voltage_entity || config.phase1_entity || config.voltage_entity_l1;
    const v2Entity = config.phase2_entity || config.voltage_entity_l2;
    const v3Entity = config.phase3_entity || config.voltage_entity_l3;

    const configuredPhases = [];
    if (v1Entity) configuredPhases.push({ id: v1Entity, label: 'L1', name: 'Фаза 1' });
    if (v2Entity) configuredPhases.push({ id: v2Entity, label: 'L2', name: 'Фаза 2' });
    if (v3Entity) configuredPhases.push({ id: v3Entity, label: 'L3', name: 'Фаза 3' });

    let phaseData = [];
    if (configuredPhases.length > 0) {
      phaseData = configuredPhases.map(p => {
        const stateObj = hass.states[p.id];
        if (!stateObj) {
          return { ...p, value: null, text: '—', valRound: '—', isOff: true, raw: null };
        }
        const raw = stateObj.state;
        if (this._isStateUnknown(raw)) {
          return { ...p, value: null, text: '—', valRound: '—', isOff: true, raw };
        }
        const num = parseFloat(raw);
        const unit = stateObj.attributes?.unit_of_measurement || 'В';
        if (isNaN(num)) {
          const isOff = this._isStateOff(raw);
          return { ...p, value: null, text: String(raw), valRound: String(raw), unit, isOff, raw };
        }
        const isOff = num < 40 || this._isStateOff(raw);
        const valRound = Math.round(num);
        return {
          ...p,
          value: num,
          valRound: valRound,
          text: `${valRound} ${unit}`,
          unit,
          isOff,
          raw,
        };
      });
    }

    if (statusEl) {
      const COLOR_ON = config.color_on || '#1b5e20';
      const COLOR_OFF = config.color_off || '#7f0000';

      const openMoreInfo = (eid) => {
        if (!eid) return;
        this.dispatchEvent(new CustomEvent('hass-more-info', {
          detail: { entityId: eid },
          bubbles: true,
          composed: true,
        }));
      };

      if (isUnknownCurrent) {
        statusEl.innerHTML = '';
        statusEl.innerText = 'НЕВІДОМО';
        statusEl.style.background = '#333';
        statusEl.style.color = '#aaa';
        statusEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)';
        statusEl.style.padding = '4px 14px';
        statusEl.style.cursor = 'default';
        statusEl.onclick = null;
      } else if (!isToday && !isDynamic) {
        statusEl.innerHTML = '';
        statusEl.innerText = 'ГРАФІК НА ЗАВТРА';
        statusEl.style.background = '#333';
        statusEl.style.color = '#fff';
        statusEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)';
        statusEl.style.padding = '4px 14px';
        statusEl.style.cursor = 'default';
        statusEl.onclick = null;
      } else if (phaseData.length === 0) {
        // Стандартний режим (якщо сенсори напруги не налаштовано)
        statusEl.innerHTML = '';
        statusEl.innerText = isOffCurrent ? 'НЕМАЄ СВІТЛА' : 'Є СВІТЛО';
        statusEl.style.background = isOffCurrent ? COLOR_OFF : COLOR_ON;
        statusEl.style.color = '#fff';
        statusEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)';
        statusEl.style.padding = '4px 14px';
        statusEl.style.cursor = 'default';
        statusEl.onclick = null;
      } else if (phaseData.length === 1) {
        // Однофазний режим з напругою замість "Є СВІТЛО"
        const p1 = phaseData[0];
        statusEl.innerHTML = '';
        statusEl.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)';
        statusEl.style.padding = '4px 14px';
        statusEl.style.color = '#fff';
        statusEl.style.cursor = 'pointer';
        statusEl.onclick = () => openMoreInfo(p1.id);

        if (p1.valRound !== undefined && p1.valRound !== '—') {
          statusEl.innerText = `⚡ ${p1.valRound} ${p1.unit || 'В'}`;
          statusEl.style.background = p1.isOff ? COLOR_OFF : COLOR_ON;
        } else if (p1.text && p1.text !== '—') {
          statusEl.innerText = `⚡ ${p1.text}`;
          statusEl.style.background = p1.isOff ? COLOR_OFF : COLOR_ON;
        } else {
          statusEl.innerText = isOffCurrent ? 'НЕМАЄ СВІТЛА' : 'Є СВІТЛО';
          statusEl.style.background = isOffCurrent ? COLOR_OFF : COLOR_ON;
        }
      } else {
        // Багатофазний режим (2 або 3 фази) - завжди показуємо бейджі фаз
        statusEl.style.background = 'transparent';
        statusEl.style.boxShadow = 'none';
        statusEl.style.padding = '0';
        statusEl.style.cursor = 'default';
        statusEl.onclick = null;
        statusEl.innerHTML = `
          <div style="display: flex; gap: 4px; align-items: center; justify-content: flex-end; flex-wrap: wrap;">
            ${phaseData.map(p => {
              const isPhaseOff = p.isOff;
              const isUnknown = p.value === null && p.text === '—';
              const bg = isUnknown ? (config.color_unknown || '#444444') : (isPhaseOff ? COLOR_OFF : COLOR_ON);
              const valDisplay = p.valRound !== undefined && p.valRound !== '—' ? `${p.valRound}В` : p.text;
              return `
                <div class="phase-pill" data-entity-id="${p.id}" title="${p.name}: ${p.text}" style="
                  display: inline-flex;
                  align-items: center;
                  gap: 3px;
                  font-size: 11px;
                  padding: 4px 7px;
                  border-radius: 7px;
                  font-weight: 700;
                  white-space: nowrap;
                  background: ${bg};
                  color: #fff;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15);
                  letter-spacing: 0.2px;
                  cursor: pointer;
                ">
                  <span style="opacity: 0.75; font-size: 9px; font-weight: 600;">${p.label}</span>
                  <span>${valDisplay}</span>
                </div>
              `;
            }).join('')}
          </div>
        `;

        // Додаємо кліки на фази для відкриття more-info
        const pills = statusEl.querySelectorAll('.phase-pill');
        pills.forEach(pill => {
          pill.addEventListener('click', (ev) => {
            ev.stopPropagation();
            openMoreInfo(pill.dataset.entityId);
          });
        });
      }
    }

    let isEmergency = false;
    if (config.emergency_entity) {
      const emState = hass.states[config.emergency_entity];
      if (emState && (emState.state === 'on' || emState.state === 'true')) isEmergency = true;
    } else if (attrs.region && attrs.queue) {
      const emEid = Object.keys(hass.states).find(eid => eid.includes('emergency') && hass.states[eid].attributes?.region === attrs.region && hass.states[eid].attributes?.queue === attrs.queue);
      if (emEid && hass.states[emEid].state === 'on') isEmergency = true;
    }
    if (eb) eb.style.display = isEmergency ? 'block' : 'none';

    // ПЕРЕВІРКА ПОВІТРЯНОЇ ТРИВОГИ
    let isAirAlert = false;
    if (config.air_alert_entity && config.air_alert_animation !== false) {
      const airAlertState = hass.states[config.air_alert_entity];
      if (airAlertState && (airAlertState.state === 'on' || airAlertState.state === 'true' || airAlertState.state === 'active')) {
        isAirAlert = true;
      }
    }

    // Додаємо/прибираємо клас анімації
    if (card) {
      if (isAirAlert) {
        card.classList.add('air-alert-active');
      } else {
        card.classList.remove('air-alert-active');
      }
    }

    let rulerChangeTime = null;

    if (config.use_status_entity && !isOffCurrent && !isUnknownCurrent && this._actualOutages) {
      const nowMs = new Date().getTime();
      let lastOutageEnd = null;
      this._actualOutages.forEach(ev => {
        const e = new Date(ev.end.dateTime || ev.end.date);
        const eMs = e.getTime();
        if (eMs <= nowMs + 60000) {
          if (!lastOutageEnd || eMs > lastOutageEnd.getTime()) {
            lastOutageEnd = e;
          }
        }
      });
      if (lastOutageEnd) {
        rulerChangeTime = lastOutageEnd;
      }
    }

    if (!rulerChangeTime) {
      if (config.use_status_entity && customStatusEntity && !isUnknownCurrent) {
        const nowMs = new Date().getTime();
        const allIntervals = [...(this._actualOutages || []), ...(this._unknownIntervals || [])];

        if (allIntervals.length > 0) {
          allIntervals.sort((a, b) => {
            const aEnd = new Date(a.end.dateTime || a.end.date).getTime();
            const bEnd = new Date(b.end.dateTime || b.end.date).getTime();
            return bEnd - aEnd;
          });

          let lastRealChange = null;
          for (const interval of allIntervals) {
            const endMs = new Date(interval.end.dateTime || interval.end.date).getTime();
            if (endMs <= nowMs + 60000) {
              lastRealChange = new Date(interval.end.dateTime || interval.end.date);
              break;
            }
          }

          if (isOffCurrent && this._actualOutages && this._actualOutages.length > 0) {
            const currentOutage = this._actualOutages.find(outage => {
              const startMs = new Date(outage.start.dateTime || outage.start.date).getTime();
              const endMs = new Date(outage.end.dateTime || outage.end.date).getTime();
              return startMs <= nowMs && endMs >= nowMs - 60000;
            });

            if (currentOutage) {
              lastRealChange = new Date(currentOutage.start.dateTime || currentOutage.start.date);
            }
          }

          rulerChangeTime = lastRealChange;
        } else {
          rulerChangeTime = new Date(customStatusEntity.last_changed);
        }
      } else {
        const relativeCurrentIdx = currentIdx - startOffsetIdx;
        const currentPlan = schedule[relativeCurrentIdx] || 'unknown';
        let foundIdx = -1;
        for (let i = relativeCurrentIdx - 1; i >= 0; i--) {
          if (schedule[i] !== currentPlan) {
            foundIdx = i;
            break;
          }
        }
        if (foundIdx !== -1) {
          const changeIdx = startOffsetIdx + foundIdx + 1;
          rulerChangeTime = toLocalDisplay(changeIdx).date;
        } else {
          rulerChangeTime = toLocalDisplay(startOffsetIdx).date;
        }
      }
    }

    if (powerIcon) {
      if (!isUnknownCurrent) {
        powerIcon.style.display = 'inline';
        if (isOffCurrent) {
          powerIcon.setAttribute('icon', 'mdi:lightbulb-off-outline');
          powerIcon.style.color = '#ef5350';
        } else {
          powerIcon.setAttribute('icon', 'mdi:lightbulb-on');
          powerIcon.style.color = '#fdd835';
        }
      } else {
        powerIcon.style.display = 'none';
      }
    }

    let changeSlotIdx = -1;
    if (rulerChangeTime) {
      const diffMs = rulerChangeTime.getTime() - toLocalDisplay(currentIdx).date.getTime();
      const diffSlots = Math.floor(diffMs / 1800000);
      changeSlotIdx = currentIdx + diffSlots;
    }

    const effectiveSchedule = schedule.map((state, i) => {
      const absIdx = startOffsetIdx + i;
      const isPast = absIdx < currentIdx;

      if (isPast && isToday && config.show_actual_history && showActualHistory) {
        const slotStartMs = toLocalDisplay(absIdx).date.getTime();
        const slotEndMs = slotStartMs + 1800000;

        if (this._unknownIntervals) {
          let uOverlap = 0;
          for (const ev of this._unknownIntervals) {
            const s = new Date(ev.start.dateTime || ev.start.date).getTime();
            const e = new Date(ev.end.dateTime || ev.end.date).getTime();
            const oS = Math.max(s, slotStartMs);
            const oE = Math.min(e, slotEndMs);
            if (oE > oS) uOverlap += (oE - oS);
          }
          if (uOverlap > 0) return 'unknown';
        }

        if (!this._actualOutages) return 'on';
        let overlap = 0;
        for (const ev of this._actualOutages) {
          const s = new Date(ev.start.dateTime || ev.start.date).getTime();
          const e = new Date(ev.end.dateTime || ev.end.date).getTime();
          const oS = Math.max(s, slotStartMs);
          const oE = Math.min(e, slotEndMs);
          if (oE > oS) overlap += (oE - oS);
        }
        return (overlap > 0) ? 'off' : 'on';
      }
      return state || 'unknown';
    });

    if (historyLabelEl) {
      if (rulerChangeTime && config.show_change_time !== false) {
        historyLabelEl.innerText = `${isOffCurrent ? 'Світло вимкнули о' : 'Світло ввімкнули о'} ${formatTime(rulerChangeTime)}`;
      } else {
        historyLabelEl.innerText = isToday ? '' : (attrs.tomorrow_date || "");
      }
    }

    if (durationLabel) {
      if (rulerChangeTime && (config.show_duration !== false)) {
        durationLabel.style.display = 'block';
        const updateDuration = () => {
          const diffMins = Math.floor((new Date() - rulerChangeTime) / 60000);
          durationLabel.innerText = `Тривалість: ${Math.floor(diffMins / 60).toString().padStart(2, '0')} год ${(diffMins % 60).toString().padStart(2, '0')} хв`;
        };
        updateDuration();
        if (this._durationInterval) clearInterval(this._durationInterval);
        this._durationInterval = setInterval(updateDuration, 60000);
      } else {
        durationLabel.style.display = 'none';
        if (this._durationInterval) clearInterval(this._durationInterval);
      }
    }

    let histories = isToday ? todayHistory : tomorrowHistory;

    const scheduleKey = `${isDynamic}_${startOffsetIdx}_${JSON.stringify(effectiveSchedule)}_${JSON.stringify(histories)}_${rulerChangeTime?.getTime()}_${isEmergency}_${currentSlotState}`;

    if (timelineEl && this._lastRenderedKey !== scheduleKey) {
      this._lastRenderedKey = scheduleKey;
      timelineEl.querySelectorAll('.timeline-block').forEach(b => b.remove());
      timelineEl.querySelectorAll('.midnight-marker').forEach(b => b.remove());
      rulerEl.innerHTML = '';

      const historyTimelineEl = this.querySelector('#history-timeline');
      if (historyTimelineEl) {
        historyTimelineEl.innerHTML = '';
        historyTimelineEl.style.display = 'none';

        if (config.show_history && histories && Array.isArray(histories) && histories.length > 0) {
          historyTimelineEl.style.display = 'flex';
          const histData = Array.isArray(histories[0]) ? histories : [histories];
          histData.slice(0, 3).forEach(hist => {
            if (!Array.isArray(hist)) return;
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.height = '8px';
            row.style.marginTop = '2px';
            row.style.borderRadius = '2.5px';
            row.style.overflow = 'hidden';

            let historyToShow = hist;
            if (isDynamic) {
              const todayHistoryPart = hist.slice(startOffsetIdx);
              const tomorrowSlotCount = schedule.length - todayHistoryPart.length;
              historyToShow = [...todayHistoryPart, ...Array(tomorrowSlotCount).fill('unknown')];
            }

            historyToShow.forEach(s => {
              const b = document.createElement('div');
              b.style.flex = '1';
              if (s === 'off') b.style.background = 'rgba(127, 0, 0, 0.6)';
              else if (s === 'unknown') b.style.background = (config.color_unknown || '#444444');
              else b.style.background = 'rgba(27, 94, 32, 0.6)';
              b.style.borderRight = '1px solid rgba(0,0,0,0.1)';
              row.appendChild(b);
            });

            historyTimelineEl.appendChild(row);
          });
        }
      }

      // КРОК 1: Спочатку порахуємо скільки буде планових міток
      let plannedLabelCount = 0;
      for (let i = 1; i < effectiveSchedule.length; i++) {
        const absIdx = startOffsetIdx + i;
        const isPlanChange = schedule[i] !== schedule[i - 1];
        const isEffChange = effectiveSchedule[i] !== effectiveSchedule[i - 1];
        const currPlan = schedule[i];
        const currEff = effectiveSchedule[i];
        const isActualChangeHere = (rulerChangeTime && changeSlotIdx === absIdx && config.use_status_entity);
        const showPlanLabel = isPlanChange && !isActualChangeHere && (isEffChange || (currEff !== currPlan));
        if (showPlanLabel) {
          // Якщо ввімкнено фактичні відключення - не рахуємо планові мітки для минулого
          if (config.show_actual_history && showActualHistory && absIdx <= currentIdx && isToday) continue;
          plannedLabelCount++;
        }
      }

      const totalSlots = effectiveSchedule.length;
      const occupiedPositions = [];
      let labelCounter = 0;

      // Обчислюємо позицію пріоритетної мітки (якщо є) - ПЕРЕД вибором режиму
      // ВАЖЛИВО: тільки якщо використовуються фактичні відключення (use_status_entity + show_actual_history)
      let priorityLabelPos = null;
      if (rulerChangeTime && config.use_status_entity && config.show_actual_history) {
        priorityLabelPos = ((rulerChangeTime.getTime() - toLocalDisplay(startOffsetIdx).date.getTime()) / (totalSlots * 1800000)) * 100;
      }

      // Вибір режиму:
      // - Якщо є пріоритетна мітка (фактичні відключення) і багато міток (>8) → два ряди
      // - Якщо немає пріоритетної мітки але ДУЖЕ багато міток (>8) → два ряди  
      // - В іншому випадку → старий зигзаг-режим
      const useTwoRowMode = plannedLabelCount > 8;

      // Завжди встановлюємо висоту 40px, бо обидва режими можуть використовувати другий ряд
      if (rulerEl) {
        rulerEl.style.height = '40px';
      }

      const addLabel = (text, pos, type = 'normal', priority = false) => {
        if (useTwoRowMode) {
          // ЛОГІКА ДЛЯ ДВОХ РЯДІВ (коли багато міток)
          const MIN_DISTANCE = 5.0;

          let hasPriorityConflict = false;
          if (!priority && priorityLabelPos !== null) {
            const dist = Math.abs(priorityLabelPos - pos);
            const isPast = pos < priorityLabelPos;
            if (dist < (isPast ? 30.0 : 16.0)) {
              hasPriorityConflict = true;
            }
          }

          let conflictItem = null;
          let minDist = 999;

          occupiedPositions.forEach(item => {
            if (item.pos < pos || type === 'end') {
              const dist = Math.abs(item.pos - pos);
              if (dist < minDist) {
                minDist = dist;
                conflictItem = item;
              }
            }
          });

          if ((type === 'start' || type === 'end')) {
            let edgeConflict = false;
            occupiedPositions.forEach(item => {
              if (Math.abs(item.pos - pos) < 25.0) edgeConflict = true;
            });
            if (edgeConflict) return null;
          }

          if (priority) {
            for (let i = occupiedPositions.length - 1; i >= 0; i--) {
              const item = occupiedPositions[i];
              if (!item.priority) {
                const dist = Math.abs(item.pos - pos);
                const isPastLabel = item.pos < pos;
                const cleanThreshold = isPastLabel ? 25.0 : 8.0;
                if (dist < cleanThreshold) {
                  if (item.element) item.element.remove();
                  occupiedPositions.splice(i, 1);
                }
              }
            }
          }

          const span = document.createElement('span');
          span.innerText = text;
          span.style.cssText = `position:absolute;color:var(--secondary-text-color);`;

          let useSecondRow = false;
          if (type !== 'start' && type !== 'end' && !priority) {
            // Якщо є конфлікт з пріоритетною - завжди другий ряд
            if (hasPriorityConflict) {
              useSecondRow = true;
            } else if (conflictItem && minDist < MIN_DISTANCE) {
              const isConflictOnSecondRow = (conflictItem.element.style.top === '16px');
              useSecondRow = !isConflictOnSecondRow;
            } else {
              useSecondRow = (labelCounter % 2 === 1);
            }
            labelCounter++;
          }

          span.style.top = useSecondRow ? '16px' : '0';

          if (type === 'start') {
            span.style.left = '0';
            span.style.transform = 'none';
          } else if (type === 'end') {
            span.style.right = '0';
            span.style.left = 'auto';
            span.style.transform = 'none';
          } else {
            span.style.left = `${pos}%`;
            if (pos < 5) {
              span.style.transform = 'translateX(0)';
            } else if (pos > 95) {
              span.style.transform = 'translateX(-100%)';
            } else {
              span.style.transform = 'translateX(-50%)';
            }
          }

          if (priority) {
            span.style.color = '#fff';
            span.style.fontWeight = 'bold';
            span.style.zIndex = '15';
          }

          if (type === 'normal') {
            if (pos > 92) {
              const currentTransform = span.style.transform;
              if (currentTransform && currentTransform.includes('translateX')) {
                const match = currentTransform.match(/translateX\(-?(\d+\.?\d*)%\)/);
                if (match) {
                  const currentTx = parseFloat(match[1]);
                  const safeTx = Math.min(Math.max(currentTx, 50), 98);
                  span.style.transform = `translateX(-${safeTx}%)`;
                }
              } else {
                span.style.transform = 'translateX(-70%)';
              }
            } else if (pos < 8) {
              span.style.transform = 'translateX(0)';
              span.style.left = `${Math.max(pos, 2)}%`;
            }
          }

          rulerEl.appendChild(span);
          occupiedPositions.push({ pos: pos, element: span, priority: priority, type: type });
          return span;

        } else {
          // СТАРА ЛОГІКА (коли мало міток) - РОЗСУВАННЯ ПО ГОРИЗОНТАЛІ + ДРУГИЙ РЯД ДЛЯ КОНФЛІКТІВ З ПРІОРИТЕТНИМИ
          const ZIGZAG_THRESHOLD = 8.0;
          const SPREAD_THRESHOLD = 14.0;
          const edgeThreshold = 17.0;

          let hasPriorityConflict = false;
          if (!priority && priorityLabelPos !== null) {
            const dist = Math.abs(priorityLabelPos - pos);
            const isPast = pos < priorityLabelPos;
            // Якщо конфлікт з пріоритетною міткою - запам'ятовуємо
            // Збільшена відстань праворуч, бо пріоритетні мітки жирні і займають більше місця
            if (dist < (isPast ? 25.0 : 16.0)) {
              hasPriorityConflict = true;
            }
          }

          let conflictItem = null;
          let minDist = 999;

          occupiedPositions.forEach(item => {
            const dist = Math.abs(item.pos - pos);
            if (dist < SPREAD_THRESHOLD && dist < minDist) {
              minDist = dist;
              conflictItem = item;
            }
          });

          if ((type === 'start' || type === 'end')) {
            let edgeConflict = false;
            occupiedPositions.forEach(item => {
              if (Math.abs(item.pos - pos) < edgeThreshold) edgeConflict = true;
            });
            if (edgeConflict) return null;
          }

          if (priority) {
            for (let i = occupiedPositions.length - 1; i >= 0; i--) {
              const item = occupiedPositions[i];
              if (!item.priority) {
                const dist = Math.abs(item.pos - pos);
                const isPastLabel = item.pos < pos;
                const cleanThreshold = isPastLabel ? 18.0 : 5.0;

                if (dist < cleanThreshold) {
                  if (item.element) item.element.remove();
                  occupiedPositions.splice(i, 1);
                }
              }
            }
          }
          else {
            // Для непріоритетних міток - не приховуємо при конфлікті з іншими непріоритетними
            if (conflictItem && !conflictItem.priority) {
              if (minDist < 3.0) return null;
            }
            // Якщо конфлікт з пріоритетною - НЕ приховуємо, а переносимо в другий ряд (це вже оброблено вище)
          }

          const span = document.createElement('span');
          span.innerText = text;
          span.style.cssText = `position:absolute;color:var(--secondary-text-color);`;

          // Якщо є конфлікт з пріоритетною міткою - ставимо в другий ряд
          if (hasPriorityConflict && type !== 'start' && type !== 'end') {
            span.style.top = '16px';
          } else {
            span.style.top = '0';
          }

          if (type === 'start') {
            span.style.left = '0';
            span.style.transform = 'none';
          } else if (type === 'end') {
            span.style.right = '0';
            span.style.left = 'auto';
            span.style.transform = 'none';
          } else {
            span.style.left = `${pos}%`;
            if (pos < 5) {
              span.style.transform = 'translateX(0)';
            } else if (pos > 95) {
              span.style.transform = 'translateX(-100%)';
            } else {
              span.style.transform = 'translateX(-50%)';
            }
          }

          // Розсування застосовуємо тільки якщо немає конфлікту з пріоритетною
          if (!hasPriorityConflict && conflictItem && minDist < SPREAD_THRESHOLD && type !== 'start' && type !== 'end') {
            const isNeighborDown = conflictItem.element.style.top === '14px' || conflictItem.element.style.top === '16px';

            if (minDist < ZIGZAG_THRESHOLD) {
              if (!isNeighborDown && type !== 'start' && type !== 'end') {
                span.style.top = '16px';
              }
            } else {
              const factor = Math.max(0, Math.min(1, (minDist - ZIGZAG_THRESHOLD) / (SPREAD_THRESHOLD - ZIGZAG_THRESHOLD)));

              if (conflictItem.pos < pos) {
                let tx = 20 + (40 * factor);
                if (pos > 90) tx = Math.min(tx, 50);
                span.style.transform = `translateX(-${tx}%)`;

                if (conflictItem.type !== 'start' && conflictItem.type !== 'end') {
                  const neighborTx = 80 - (40 * factor);
                  if (conflictItem.element) conflictItem.element.style.transform = `translateX(-${neighborTx}%)`;
                }
              } else {
                let tx = 80 - (40 * factor);
                if (pos > 90) tx = Math.max(tx, 50);
                span.style.transform = `translateX(-${tx}%)`;

                if (conflictItem.type !== 'start' && conflictItem.type !== 'end') {
                  const neighborTx = 20 + (40 * factor);
                  if (conflictItem.element) conflictItem.element.style.transform = `translateX(-${neighborTx}%)`;
                }
              }
            }
          }

          if (priority) {
            span.style.color = '#fff';
            span.style.fontWeight = 'bold';
            span.style.zIndex = '15';
          }

          if (type === 'normal') {
            if (pos > 92) {
              const currentTransform = span.style.transform;
              if (currentTransform && currentTransform.includes('translateX')) {
                const match = currentTransform.match(/translateX\(-?(\d+\.?\d*)%\)/);
                if (match) {
                  const currentTx = parseFloat(match[1]);
                  const safeTx = Math.min(Math.max(currentTx, 50), 98);
                  span.style.transform = `translateX(-${safeTx}%)`;
                }
              } else {
                span.style.transform = 'translateX(-70%)';
              }
            } else if (pos < 8) {
              span.style.transform = 'translateX(0)';
              span.style.left = `${Math.max(pos, 2)}%`;
            }
          }

          rulerEl.appendChild(span);
          occupiedPositions.push({ pos: pos, element: span, priority: priority, type: type });
          return span;
        }
      };

      if (showActualHistory && this._actualOutages && isToday) {
        const tStartMs = toLocalDisplay(startOffsetIdx).date.getTime();
        const tTotalMs = totalSlots * 1800000;
        const cutoffMs = rulerChangeTime ? rulerChangeTime.getTime() : new Date().getTime();
        this._actualOutages.forEach(ev => {
          const s = new Date(ev.start.dateTime || ev.start.date);
          const e = new Date(ev.end.dateTime || ev.end.date);
          if (s.getTime() >= cutoffMs) return;
          if (s.getTime() > tStartMs) addLabel(formatTime(s), ((s.getTime() - tStartMs) / tTotalMs) * 100, 'normal', true);
          if (e.getTime() > tStartMs && e.getTime() < cutoffMs) addLabel(formatTime(e), ((e.getTime() - tStartMs) / tTotalMs) * 100, 'normal', true);
        });
      }

      if (rulerChangeTime && changeSlotIdx >= 0 && config.use_status_entity && (config.show_actual_history && showActualHistory)) {
        const p = ((rulerChangeTime.getTime() - toLocalDisplay(startOffsetIdx).date.getTime()) / (totalSlots * 1800000)) * 100;
        if (p >= 0 && p <= 100) addLabel(formatTime(rulerChangeTime), p, 'normal', true);
      }

      let lastLabelIndex = -100;
      let lastLabelElement = null;

      const COLOR_ON = config.color_on || '#1b5e20';
      const COLOR_OFF = config.color_off || '#7f0000';
      const COLOR_UNKNOWN = config.color_unknown || '#444444';

      effectiveSchedule.forEach((state, i) => {
        const absIdx = startOffsetIdx + i;
        const isPast = absIdx < currentIdx;
        const b = document.createElement('div');
        b.className = 'timeline-block';
        b.style.flex = '1';
        b.style.height = '100%';
        b.style.position = 'relative';
        b.style.overflow = 'hidden';

        let bg = COLOR_ON;
        if (state === 'off') bg = COLOR_OFF;
        else if (state === 'unknown') bg = COLOR_UNKNOWN;

        const isHistoryMode = (config.show_actual_history) && isPast && isToday;

        if (isHistoryMode) {
          const slotStartMs = toLocalDisplay(absIdx).date.getTime();
          const slotEndMs = slotStartMs + 1800000;
          const slotDuration = 1800000;

          let totalOutageCoverage = 0;
          let totalUnknownCoverage = 0;
          const outageSegments = [];
          const unknownSegments = [];

          if (this._actualOutages) {
            this._actualOutages.forEach(ev => {
              const s = new Date(ev.start.dateTime || ev.start.date).getTime();
              const e = new Date(ev.end.dateTime || ev.end.date).getTime();
              const oS = Math.max(s, slotStartMs);
              const oE = Math.min(e, slotEndMs);
              if (oE > oS) {
                totalOutageCoverage += (oE - oS);
                outageSegments.push({ oS, oE });
              }
            });
          }
          if (this._unknownIntervals) {
            this._unknownIntervals.forEach(ev => {
              const s = new Date(ev.start.dateTime || ev.start.date).getTime();
              const e = new Date(ev.end.dateTime || ev.end.date).getTime();
              const oS = Math.max(s, slotStartMs);
              const oE = Math.min(e, slotEndMs);
              if (oE > oS) {
                totalUnknownCoverage += (oE - oS);
                unknownSegments.push({ oS, oE });
              }
            });
          }

          const outagePct = totalOutageCoverage / slotDuration;
          const unknownPct = totalUnknownCoverage / slotDuration;

          if (outagePct >= 0.95) {
            bg = COLOR_OFF;
            b.style.background = bg;
            b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';
          } else if (unknownPct >= 0.95 && outagePct < 0.05) {
            bg = COLOR_UNKNOWN;
            b.style.background = bg;
            b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';
          } else {
            bg = COLOR_ON;
            b.style.background = bg;
            b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';

            unknownSegments.forEach(seg => {
              const startP = Math.max(0, ((seg.oS - slotStartMs) / slotDuration) * 100);
              const widthP = Math.min(100 - startP, ((seg.oE - seg.oS) / slotDuration) * 100);
              const ov = document.createElement('div');
              ov.style.position = 'absolute';
              ov.style.top = '0';
              ov.style.bottom = '0';
              ov.style.left = `${startP}%`;
              ov.style.width = `${widthP}%`;
              ov.style.zIndex = '1';
              ov.style.background = COLOR_UNKNOWN;

              if (startP + widthP >= 99.9 && b.style.borderRight && b.style.borderRight !== 'none') {
                ov.style.borderRight = b.style.borderRight;
                b.style.borderRight = 'none';
              }
              b.appendChild(ov);
            });

            outageSegments.forEach(seg => {
              const startP = Math.max(0, ((seg.oS - slotStartMs) / slotDuration) * 100);
              const widthP = Math.min(100 - startP, ((seg.oE - seg.oS) / slotDuration) * 100);
              const ov = document.createElement('div');
              ov.style.position = 'absolute';
              ov.style.top = '0';
              ov.style.bottom = '0';
              ov.style.left = `${startP}%`;
              ov.style.width = `${widthP}%`;
              ov.style.zIndex = '2';
              ov.style.background = COLOR_OFF;

              if (startP + widthP >= 99.9 && b.style.borderRight && b.style.borderRight !== 'none') {
                ov.style.borderRight = b.style.borderRight;
                b.style.borderRight = 'none';
              }
              b.appendChild(ov);
            });
          }
        } else {
          b.style.background = bg;
          b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';
        }

        if (absIdx === currentIdx && isToday && config.show_actual_history && showActualHistory && !isUnknownCurrent) {
          const now = new Date();
          const slotStartMs = toLocalDisplay(absIdx).date.getTime();
          const slotDuration = 1800000;

          let overlayStart = 0;
          let overlayWidth = ((now.getTime() - slotStartMs) / slotDuration) * 100;

          if (rulerChangeTime) {
            const changeMs = rulerChangeTime.getTime();
            const slotEndMs = slotStartMs + slotDuration;

            if (changeMs >= slotStartMs && changeMs <= slotEndMs) {
              overlayStart = ((changeMs - slotStartMs) / slotDuration) * 100;
              overlayWidth = ((now.getTime() - changeMs) / slotDuration) * 100;
            }
          }

          const overlay = document.createElement('div');
          overlay.style.position = 'absolute';
          overlay.style.top = '0';
          overlay.style.bottom = '0';
          overlay.style.left = `${overlayStart}%`;
          overlay.style.width = `${overlayWidth}%`;
          overlay.style.background = isOffCurrent ? COLOR_OFF : COLOR_ON;
          overlay.style.zIndex = '2';
          b.appendChild(overlay);
        }

        timelineEl.appendChild(b);

        const slotInfo = toLocalDisplay(absIdx);
        if (i > 0 && slotInfo.date.getHours() === 0 && slotInfo.date.getMinutes() === 0) {
          const m = document.createElement('div');
          m.className = 'midnight-marker';
          m.style.cssText = `position:absolute;left:${(i / totalSlots) * 100}%;top:0;bottom:0;width:2px;background:rgba(0,0,0,0.8);z-index:2;pointer-events:none;transform:translateX(-50%);`;
          timelineEl.appendChild(m);
        }

        if (i > 0) {
          const isPlanChange = schedule[i] !== schedule[i - 1];
          const isEffChange = effectiveSchedule[i] !== effectiveSchedule[i - 1];
          const currPlan = schedule[i];
          const currEff = effectiveSchedule[i];

          const isActualChangeHere = (rulerChangeTime && changeSlotIdx === absIdx && config.use_status_entity);

          const showPlanLabel = isPlanChange && !isActualChangeHere && (isEffChange || (currEff !== currPlan));

          if (showPlanLabel) {
            // Якщо ввімкнено фактичні відключення - не показуємо планові мітки для минулого
            if (config.show_actual_history && showActualHistory && absIdx <= currentIdx && isToday) return;

            const pos = (i / totalSlots) * 100;
            const newLabel = addLabel(slotInfo.time, pos, 'normal', false);
            if (newLabel) {
              lastLabelIndex = i;
              lastLabelElement = newLabel;
            }
          }
        }
      });

      addLabel(toLocalDisplay(startOffsetIdx).time, 0, 'start', false);
      addLabel(toLocalDisplay(startOffsetIdx + totalSlots).time, 100, 'end', false);
    }

    if (nowMarker) {
      const now = new Date();
      if (isDynamic) {
        const pos = (((currentIdx - startOffsetIdx) + (now.getMinutes() % 30) / 30) / schedule.length) * 100;
        nowMarker.style.cssText = `display:block;left:${pos}%;width:3px;position:absolute;top:0;bottom:0;background:linear-gradient(#fff,rgba(255,255,255,0.8));z-index:2;box-shadow:0 0 12px #fff;`;
      } else if (isToday) {
        nowMarker.style.cssText = `display:block;left:${((now.getHours() * 60 + now.getMinutes()) / 1440) * 100}%;width:2px;position:absolute;top:0;bottom:0;background:#fff;z-index:2;box-shadow:0 0 8px #fff;`;
      } else nowMarker.style.display = 'none';
    }

    if (showStats) {
      const getNextChangeInfo = () => {
        let startIndex = isToday ? Math.floor((new Date().getHours() * 60 + new Date().getMinutes()) / 30) + 1 : 0;
        if (isDynamic) startIndex = (currentIdx - startOffsetIdx) + 1;

        const currentState = schedule[startIndex - 1] || schedule[0];
        const targetState = (currentState === 'off') ? 'on' : 'off';
        let found = -1;
        for (let i = startIndex; i < schedule.length; i++) {
          if (schedule[i] === targetState) {
            found = i;
            break;
          }
        }

        if (found !== -1) {
          const local = toLocalDisplay(startOffsetIdx + found);
          let val = local.time;
          if (local.date.getDate() !== new Date().getDate()) val += ` ${local.date.getDate().toString().padStart(2, '0')}.${(local.date.getMonth() + 1).toString().padStart(2, '0')}`;
          return { label: targetState === 'on' ? 'Світло буде о:' : 'Вимкнуть о:', value: val, rawDate: local.date };
        }
        return { label: targetState === 'on' ? 'Світло буде о:' : 'Вимкнуть о:', value: '--:--', rawDate: null };
      };

      const getCountdownInfo = () => {
        const next = getNextChangeInfo();
        if (!next.rawDate) return { label: 'До зміни:', value: '--:--' };
        const diffMs = next.rawDate - new Date();
        if (diffMs < 0) return { label: next.label.replace(' о:', ''), value: '--:--' };
        const h = Math.floor(diffMs / 3600000);
        const m = Math.floor((diffMs % 3600000) / 60000);
        return { label: next.label.includes('буде') ? 'До включення:' : 'До вимкнення:', value: h > 0 ? `${h}г ${m}хв` : `${m} хв` };
      };

      const renderStat = (type, lEl, vEl) => {
        if (!lEl || !vEl) return;
        if (type === 'hours_without_light') {
          let offMins = 0;

          if (config.show_actual_history && showActualHistory && isToday) {
            effectiveSchedule.forEach((s, i) => {
              const absIdx = startOffsetIdx + i;
              const isPast = absIdx < currentIdx;
              const stateToCount = isPast ? s : schedule[i];
              if (stateToCount === 'off') offMins += 30;
            });
          } else {
            schedule.forEach(s => { if (s === 'off') offMins += 30; });
          }

          lEl.innerText = isDynamic ? "У найближчі 24г без світла" : "Всього за добу без світла";
          vEl.innerText = `${parseFloat((offMins / 60).toFixed(1))} год (${Math.round((offMins / (schedule.length * 30)) * 100)}%)`;
        } else if (type === 'next_change') {
          const i = getNextChangeInfo();
          lEl.innerText = i.label;
          vEl.innerText = i.value;
        } else if (type === 'countdown') {
          const i = getCountdownInfo();
          lEl.innerText = i.label;
          vEl.innerText = i.value;
        } else if (type === 'schedule_updated' && config.schedule_entity && hass.states[config.schedule_entity]) {
          const d = new Date(hass.states[config.schedule_entity].last_changed);
          lEl.innerText = 'Графік оновлено о:';
          vEl.innerText = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}${d.getDate() !== new Date().getDate() ? ' ' + d.getDate() + '.' + (d.getMonth() + 1) : ''}`;
        }
      };
      renderStat(config.left_stat_type || 'hours_without_light', this.querySelector('#left-stat-label'), this.querySelector('#left-stat-value'));
      renderStat(config.right_stat_type || 'schedule_updated', this.querySelector('#right-stat-label'), this.querySelector('#right-stat-value'));
    }
  }

  setConfig(config) {
    this.config = config;
    if (this._hass && this.content) {
      this._renderWithCurrentDay(this._hass);
    }
  }

  static getConfigElement() {
    return document.createElement("svitlo-live-card-editor");
  }

  static getStubConfig(hass, entities, entityIds) {
    const e = entityIds.find(id => hass.states[id]?.attributes?.today_48half);
    return { entity: e || '', title: '' };
  }
}

customElements.define('svitlo-live-card', SvitloLiveCard);