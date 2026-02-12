// Svitlo Live Card Editor
class SvitloLiveCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = config;
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

          <label style="font-weight: bold; font-size: 14px; margin-top: 16px; display: block; border-top: 1px solid var(--divider-color); padding-top: 12px;">Налаштування кольорів:</label>
          <div style="display: flex; flex-direction: column; gap: 12px; margin-top: 4px;">
            <div style="display: flex; align-items: center; gap: 12px;">
              <input type="color" id="color-on-picker" style="height: 42px; width: 42px; padding: 0; border: none; background: none; cursor: pointer;">
              <ha-textfield id="color-on-input" label="Колір 'Є світло' (Hex/Name)" style="flex: 1;"></ha-textfield>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
              <input type="color" id="color-off-picker" style="height: 42px; width: 42px; padding: 0; border: none; background: none; cursor: pointer;">
              <ha-textfield id="color-off-input" label="Колір 'Немає світла' (Hex/Name)" style="flex: 1;"></ha-textfield>
            </div>
            <button id="reset-colors-btn" style="
              padding: 8px 16px;
              border-radius: 8px;
              border: 1px solid var(--divider-color, #e0e0e0);
              background: rgba(127,127,127,0.08);
              color: var(--primary-text-color);
              font-size: 13px;
              cursor: pointer;
              transition: background 0.2s;
              align-self: flex-start;
            ">Скинути кольори</button>
          </div>

          <label style="font-weight: bold; font-size: 14px; margin-top: 16px; display: block; border-top: 1px solid var(--divider-color); padding-top: 12px;">Зовнішній вигляд:</label>
          <ha-formfield label="Показувати тіні (об'ємний вигляд)" style="display: flex; align-items: center; margin-top: 4px;">
            <ha-switch id="shadow-switch"></ha-switch>
          </ha-formfield>

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
  }

  _setupEventListeners() {
    const titleInput = this.querySelector("#title-input");
    if (titleInput) titleInput.addEventListener("input", (ev) => this._valueChanged({ target: { configValue: 'title', value: ev.target.value } }));

    const colorOnInput = this.querySelector("#color-on-input");
    const colorOnPicker = this.querySelector("#color-on-picker");
    if (colorOnInput) {
      colorOnInput.addEventListener("input", (ev) => {
        if (colorOnPicker && /^#[0-9A-F]{6}$/i.test(ev.target.value)) colorOnPicker.value = ev.target.value;
        this._valueChanged({ target: { configValue: 'color_on', value: ev.target.value } });
      });
    }
    if (colorOnPicker) {
      colorOnPicker.addEventListener("input", (ev) => {
        if (colorOnInput) colorOnInput.value = ev.target.value;
        this._valueChanged({ target: { configValue: 'color_on', value: ev.target.value } });
      });
    }

    const colorOffInput = this.querySelector("#color-off-input");
    const colorOffPicker = this.querySelector("#color-off-picker");
    if (colorOffInput) {
      colorOffInput.addEventListener("input", (ev) => {
        if (colorOffPicker && /^#[0-9A-F]{6}$/i.test(ev.target.value)) colorOffPicker.value = ev.target.value;
        this._valueChanged({ target: { configValue: 'color_off', value: ev.target.value } });
      });
    }
    if (colorOffPicker) {
      colorOffPicker.addEventListener("input", (ev) => {
        if (colorOffInput) colorOffInput.value = ev.target.value;
        this._valueChanged({ target: { configValue: 'color_off', value: ev.target.value } });
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

    const resetColorsBtn = this.querySelector("#reset-colors-btn");
    if (resetColorsBtn) {
      resetColorsBtn.addEventListener("click", () => {
        const newConfig = { ...this._config };
        delete newConfig.color_on;
        delete newConfig.color_off;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
        const colorOnInput = this.querySelector("#color-on-input");
        const colorOnPicker = this.querySelector("#color-on-picker");
        const colorOffInput = this.querySelector("#color-off-input");
        const colorOffPicker = this.querySelector("#color-off-picker");
        if (colorOnInput) colorOnInput.value = '';
        if (colorOnPicker) colorOnPicker.value = '#1b5e20';
        if (colorOffInput) colorOffInput.value = '';
        if (colorOffPicker) colorOffPicker.value = '#7f0000';
      });
    }
  }

  _updateProperties() {
    if (!this._hass || !this._config) return;
    const titleInput = this.querySelector("#title-input");
    if (titleInput) titleInput.value = this._config.title || '';

    const colorOnInput = this.querySelector("#color-on-input");
    if (colorOnInput) colorOnInput.value = this._config.color_on || '';
    const colorOnPicker = this.querySelector("#color-on-picker");
    if (colorOnPicker && this._config.color_on && /^#[0-9A-F]{6}$/i.test(this._config.color_on)) colorOnPicker.value = this._config.color_on;
    else if (colorOnPicker) colorOnPicker.value = '#1b5e20';

    const colorOffInput = this.querySelector("#color-off-input");
    if (colorOffInput) colorOffInput.value = this._config.color_off || '';
    const colorOffPicker = this.querySelector("#color-off-picker");
    if (colorOffPicker && this._config.color_off && /^#[0-9A-F]{6}$/i.test(this._config.color_off)) colorOffPicker.value = this._config.color_off;
    else if (colorOffPicker) colorOffPicker.value = '#7f0000';

    if (this._statusSelector) {
      this._statusSelector.hass = this._hass;
      this._statusSelector.value = this._config.status_entity || '';
    }

    if (this._emergencySelector) {
      this._emergencySelector.hass = this._hass;
      this._emergencySelector.value = this._config.emergency_entity || '';
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

    const ahs = this.querySelector("#actual-history-switch");
    if (ahs) ahs.checked = this._config.show_actual_history === true;

    const shsw = this.querySelector("#shadow-switch");
    if (shsw) shsw.checked = this._config.show_shadow !== false;
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;
    const target = ev.target;
    if (this._config[target.configValue] === target.value) return;
    const newConfig = { ...this._config, [target.configValue]: target.value };
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
        <ha-card id="svitlo-ha-card" style="overflow: hidden; position: relative;">
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
                <div id="status" style="font-size: 12px; padding: 4px 14px; border-radius: 8px; font-weight: 700; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.3px; text-align: center;"></div>
                <div id="emergency-banner" style="display: none; background: linear-gradient(135deg, #c62828 0%, #8e0000 100%); color: rgba(255,255,255,0.9); padding: 3px 14px; border-radius: 6px; font-size: 10px; font-weight: 600; text-align: center; animation: pulse 2s infinite; white-space: nowrap; text-transform: uppercase; letter-spacing: 0.2px;">
                  📢 ЕКСТРЕНІ ВІДКЛЮЧЕННЯ
                </div>
              </div>
            </div>

            <div id="day-switcher" style="display: flex; gap: 4px; border-radius: 10px; background: rgba(127,127,127,0.08); padding: 3px; margin-bottom: 14px; font-size: 12px; width: fit-content;">
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
                  z-index: 5;
              ">
                <div id="now-marker" style="
                    position: absolute; 
                    top: 0; bottom: 0; 
                    width: 3px; 
                    background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.8) 100%);
                    z-index: 10;
                    border-radius: 2px;
                "></div>
              </div>
              
              <div id="history-timeline" style="
                  display: none; 
                  flex-direction: column; 
                  margin-top: 2px; 
              "></div>

              <div id="ruler" style="height: 30px; position: relative; font-size: 11px; opacity: 0.5; margin-top: 4px; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; font-weight: 500;">
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
            .no-shadows .day-tab.active {
              box-shadow: none;
            }
            .day-tab:not(.active):hover {
              background: rgba(127,127,127,0.15);
            }
            @keyframes pulse {
              0% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.92; transform: scale(0.995); }
              100% { opacity: 1; transform: scale(1); }
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

      // НОВИЙ КОД: Фільтрація коротких переключень (<15 хв)
      const MIN_DURATION_MS = 15 * 60 * 1000; // 15 хвилин
      const filteredIntervals = [];

      for (let i = 0; i < intervals.length; i++) {
        const interval = intervals[i];
        const duration = interval.end - interval.start;

        // Якщо інтервал довгий (>= 15 хв) - завжди додаємо
        if (duration >= MIN_DURATION_MS) {
          filteredIntervals.push(interval);
          continue;
        }

        // Якщо інтервал короткий (< 15 хв)
        // Перевіряємо, чи він оточений інтервалами того самого стану
        const prevInterval = intervals[i - 1];
        const nextInterval = intervals[i + 1];

        // Якщо попередній і наступний інтервали мають однаковий стан, 
        // а поточний інтервал короткий - пропускаємо його (це "глич")
        if (prevInterval && nextInterval &&
          prevInterval.state === nextInterval.state &&
          interval.state !== prevInterval.state) {
          // Це короткий "глич" - пропускаємо
          continue;
        }

        // Інакше додаємо інтервал
        filteredIntervals.push(interval);
      }

      // Після фільтрації може статися, що сусідні інтервали мають той самий стан
      // Об'єднуємо їх
      const mergedIntervals = [];
      for (let i = 0; i < filteredIntervals.length; i++) {
        const current = filteredIntervals[i];

        if (mergedIntervals.length === 0) {
          mergedIntervals.push(current);
          continue;
        }

        const last = mergedIntervals[mergedIntervals.length - 1];

        if (last.state === current.state) {
          // Об'єднуємо з попереднім інтервалом
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

    const stateObj = hass.states[config.entity];
    const attrs = stateObj.attributes;

    const showStats = config.show_stats !== false;
    const showActualHistory = config.show_actual_history === true;
    const customStatusEntity = config.status_entity ? hass.states[config.status_entity] : null;
    const showShadow = config.show_shadow !== false;

    // --- Shadow configuration ---
    const haCard = this.querySelector('#svitlo-ha-card');
    if (haCard) {
      haCard.style.boxShadow = showShadow ? '0 4px 20px rgba(0,0,0,0.3), 0 0 40px rgba(0,0,0,0.1)' : 'none';
    }
    const container = this.querySelector('#container');
    if (container) {
      if (!showShadow) container.classList.add('no-shadows');
      else container.classList.remove('no-shadows');
    }
    const statusEl2 = this.querySelector('#status');
    if (statusEl2) {
      statusEl2.style.boxShadow = showShadow ? '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none';
    }
    const eb2 = this.querySelector('#emergency-banner');
    if (eb2) {
      eb2.style.boxShadow = showShadow ? '0 2px 8px rgba(183, 28, 28, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none';
    }
    const daySwitcher2 = this.querySelector('#day-switcher');
    if (daySwitcher2) {
      daySwitcher2.style.boxShadow = showShadow ? 'inset 0 1px 3px rgba(0,0,0,0.1)' : 'none';
    }
    const timelineEl2 = this.querySelector('#timeline');
    if (timelineEl2) {
      timelineEl2.style.boxShadow = showShadow ? '0 4px 15px rgba(0,0,0,0.3), inset 0 2px 4px rgba(0,0,0,0.4)' : 'none';
    }
    const nowMarker2 = this.querySelector('#now-marker');
    if (nowMarker2) {
      nowMarker2.style.boxShadow = showShadow ? '0 0 12px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5)' : 'none';
    }
    const leftStat2 = this.querySelector('#left-stat');
    if (leftStat2) {
      leftStat2.style.boxShadow = showShadow ? '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none';
    }
    const rightStat2 = this.querySelector('#right-stat');
    if (rightStat2) {
      rightStat2.style.boxShadow = showShadow ? '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none';
    }
    // Active tab shadow is handled via CSS .no-shadows class

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

    if (statusEl) {
      if (isUnknownCurrent) {
        statusEl.innerText = 'НЕВІДОМО';
        statusEl.style.background = '#333';
        statusEl.style.color = '#aaa';
      } else {
        const COLOR_ON = config.color_on || '#1b5e20';
        const COLOR_OFF = config.color_off || '#7f0000';
        statusEl.innerText = isToday || isDynamic ? (isOffCurrent ? 'НЕМАЄ СВІТЛА' : 'Є СВІТЛО') : 'ГРАФІК НА ЗАВТРА';
        statusEl.style.background = isToday || isDynamic ? (isOffCurrent ? COLOR_OFF : COLOR_ON) : '#333';
        statusEl.style.color = '#fff';
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
        rulerChangeTime = new Date(customStatusEntity.last_changed);
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
              // У динамічному режимі показуємо історію тільки для сьогоднішніх слотів
              // Беремо від startOffsetIdx до кінця сьогодні (48)
              const todayHistoryPart = hist.slice(startOffsetIdx);

              // Додаємо чорні блоки для завтрашніх слотів (немає історії)
              const tomorrowSlotCount = schedule.length - todayHistoryPart.length;
              historyToShow = [...todayHistoryPart, ...Array(tomorrowSlotCount).fill('unknown')];
            }

            historyToShow.forEach(s => {
              const b = document.createElement('div');
              b.style.flex = '1';
              if (s === 'off') b.style.background = 'rgba(127, 0, 0, 0.6)';
              else if (s === 'unknown') b.style.background = '#000000';
              else b.style.background = 'rgba(27, 94, 32, 0.6)';
              b.style.borderRight = '1px solid rgba(0,0,0,0.1)';
              row.appendChild(b);
            });

            historyTimelineEl.appendChild(row);
          });
        }
      }

      const totalSlots = effectiveSchedule.length;
      const occupiedPositions = [];

      const addLabel = (text, pos, type = 'normal', priority = false) => {
        const ZIGZAG_THRESHOLD = 10.0;
        const SPREAD_THRESHOLD = 14.0;
        const edgeThreshold = 17.0;

        if (!priority) {
          for (const item of occupiedPositions) {
            if (item.priority) {
              const dist = Math.abs(item.pos - pos);
              const isPast = pos < item.pos;
              if (dist < (isPast ? 25.0 : 4.0)) return null;
            }
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
          conflictItem = null;
        }
        else {
          if (conflictItem) {
            if (conflictItem.priority) {
              if (minDist < 3.0) return null;
            } else {
              if (minDist < 3.0) return null;
            }
          }
        }

        const span = document.createElement('span');
        span.innerText = text;
        span.style.cssText = `position:absolute;color:var(--secondary-text-color);top:0;transform:translateX(-50%);`;

        if (type === 'start') {
          span.style.left = '0';
          span.style.transform = 'none';
        } else if (type === 'end') {
          span.style.right = '0';
          span.style.left = 'auto';
          span.style.transform = 'none';
        } else {
          span.style.left = `${pos}%`;
        }

        if (conflictItem && minDist < SPREAD_THRESHOLD && type !== 'start' && type !== 'end') {
          const isNeighborDown = conflictItem.element.style.top === '14px';

          if (minDist < ZIGZAG_THRESHOLD) {
            if (!isNeighborDown && type !== 'start' && type !== 'end') {
              span.style.top = '14px';
            }
          } else {
            const factor = Math.max(0, Math.min(1, (minDist - ZIGZAG_THRESHOLD) / (SPREAD_THRESHOLD - ZIGZAG_THRESHOLD)));

            if (conflictItem.pos < pos) {
              const tx = 10 + (40 * factor);
              span.style.transform = `translateX(-${tx}%)`;

              if (conflictItem.type !== 'start' && conflictItem.type !== 'end') {
                const neighborTx = 90 - (40 * factor);
                if (conflictItem.element) conflictItem.element.style.transform = `translateX(-${neighborTx}%)`;
              }
            } else {
              const tx = 90 - (40 * factor);
              span.style.transform = `translateX(-${tx}%)`;

              if (conflictItem.type !== 'start' && conflictItem.type !== 'end') {
                const neighborTx = 10 + (40 * factor);
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

        rulerEl.appendChild(span);
        occupiedPositions.push({ pos: pos, element: span, priority: priority, type: type });
        return span;
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
        else if (state === 'unknown') bg = '#000000';

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
            bg = '#000000';
            b.style.background = bg;
            b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';
          } else {
            bg = COLOR_ON;
            b.style.background = bg;
            b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';

            unknownSegments.forEach(seg => {
              const startP = ((seg.oS - slotStartMs) / slotDuration) * 100;
              const widthP = ((seg.oE - seg.oS) / slotDuration) * 100;
              const ov = document.createElement('div');
              ov.style.position = 'absolute';
              ov.style.top = '0';
              ov.style.bottom = '0';
              ov.style.zIndex = '1';
              ov.style.background = '#000000';

              if (seg.oS === slotStartMs) ov.style.left = '0';
              else ov.style.left = `${startP}%`;

              if (seg.oE === slotEndMs) {
                ov.style.right = '0';
                if (b.style.borderRight && b.style.borderRight !== 'none') {
                  ov.style.borderRight = b.style.borderRight;
                  b.style.borderRight = 'none';
                }
              } else {
                ov.style.width = `${widthP}%`;
              }
              b.appendChild(ov);
            });

            outageSegments.forEach(seg => {
              const startP = ((seg.oS - slotStartMs) / slotDuration) * 100;
              const widthP = ((seg.oE - seg.oS) / slotDuration) * 100;
              const ov = document.createElement('div');
              ov.style.position = 'absolute';
              ov.style.top = '0';
              ov.style.bottom = '0';
              ov.style.zIndex = '2';
              ov.style.background = COLOR_OFF;

              if (seg.oS === slotStartMs) ov.style.left = '0';
              else ov.style.left = `${startP}%`;

              if (seg.oE === slotEndMs) {
                ov.style.right = '0';
                if (b.style.borderRight && b.style.borderRight !== 'none') {
                  ov.style.borderRight = b.style.borderRight;
                  b.style.borderRight = 'none';
                }
              } else {
                ov.style.width = `${widthP}%`;
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
          const percentFromStart = ((now.getMinutes() % 30) / 30) * 100;
          const overlay = document.createElement('div');
          overlay.style.position = 'absolute';
          overlay.style.top = '0';
          overlay.style.bottom = '0';
          overlay.style.left = '0';
          overlay.style.width = `${percentFromStart}%`;
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
            if (config.show_actual_history && absIdx <= currentIdx && currEff === currPlan) return;

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
        const markerShadow = showShadow ? 'box-shadow:0 0 12px #fff;' : '';
        nowMarker.style.cssText = `display:block;left:${pos}%;width:3px;position:absolute;top:0;bottom:0;background:linear-gradient(#fff,rgba(255,255,255,0.8));z-index:2;${markerShadow}`;
      } else if (isToday) {
        const markerShadow = showShadow ? 'box-shadow:0 0 8px #fff;' : '';
        nowMarker.style.cssText = `display:block;left:${((now.getHours() * 60 + now.getMinutes()) / 1440) * 100}%;width:2px;position:absolute;top:0;bottom:0;background:#fff;z-index:2;${markerShadow}`;
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
          schedule.forEach(s => { if (s === 'off') offMins += 30; });
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