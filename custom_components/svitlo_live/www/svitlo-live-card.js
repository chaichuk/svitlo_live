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
          </div>

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
        < option value = "" ${!currentVal ? "selected" : ""}> --- Оберіть зі списку(${entities.length} знайдено)-- -</option >
          ${entities.sort().map(eid => {
          const state = this._hass.states[eid];
          const friendlyName = state?.attributes?.friendly_name || eid;
          return `<option value="${eid}">${friendlyName}</option>`;
        }).join('')
          }
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

    // Color ON
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

    // Color OFF
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

        // Toggle Actual Calendar Visibility
        const acSection = this.querySelector("#actual-calendar-section");
        if (acSection) acSection.style.display = ev.target.checked ? 'block' : 'none';
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
    if (ps) {
      ps.checked = this._config.use_status_entity || false;

      // Toggle Actual Calendar Visibility
      const acSection = this.querySelector("#actual-calendar-section");
      if (acSection) acSection.style.display = ps.checked ? 'block' : 'none';
    }

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

  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `
        <ha-card style="overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.3), 0 0 40px rgba(0,0,0,0.1);">
          <div id="container" style="padding: 16px;">
            
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
                  position: relative; 
                  background: linear-gradient(180deg, #1a1a1a 0%, #0d0d0d 100%); 
                  border: 1px solid rgba(255,255,255,0.08);
                  box-shadow: 0 4px 15px rgba(0,0,0,0.3), inset 0 2px 4px rgba(0,0,0,0.4); 
                  z-index: 5;
              ">
                <div id="actual-timeline" style="
                    position: absolute; 
                    top: 0; left: 0; right: 0; bottom: 0; 
                    pointer-events: none; 
                    z-index: 8;
                "></div>
                <div id="now-marker" style="
                    position: absolute; 
                    top: 0; bottom: 0; 
                    width: 3px; 
                    background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.8) 100%); 
                    box-shadow: 0 0 12px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5); 
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
        </ha - card >
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
    if (this.config && (this.config.show_actual_history !== false)) { // Default to true if undefined? No, usually defaults false in UI, but let's assume if checked.
      // The switch logic in editor defaults false.
      if (this.config.show_actual_history) {
        this._fetchHistoryFromEntity(hass);
      }
    }
    this._renderWithCurrentDay(hass);
  }

  async _fetchHistoryFromEntity(hass) {
    if (!this.config || !this.config.show_actual_history) return;

    // Determine which entity to fetch history for.
    // "From THIS sensor" implies status_entity if configured, even if not used as priority.
    let entityId = this.config.status_entity || this.config.entity;

    if (!entityId) return;

    const now = Date.now();
    if (this._lastHistoryFetch && (now - this._lastHistoryFetch < 60000)) return; // 1 min debounce
    this._lastHistoryFetch = now;

    const startRange = new Date(now - 24 * 60 * 60 * 1000);
    const endRange = new Date(now);

    try {
      // const entityId = this.config.status_entity; // Already determined above
      const startISO = startRange.toISOString();
      const endISO = endRange.toISOString();

      // Using history/period API
      const response = await hass.callApi(
        'GET',
        `history/period/${startISO}?filter_entity_id=${entityId}&end_time=${endISO}&minimal_response`
      );

      const rawHistory = (response && response[0]) ? response[0] : [];
      const outageEvents = [];
      let currentOutageStart = null;

      // Process history with smoothing (merge short intervals < 15 mins)
      // OFF states: 'off', 'unavailable', '0', 'false'
      const isOff = (s) => ['off', 'unavailable', '0', 'false'].includes(String(s).toLowerCase());
      const isUnknown = (s) => ['unknown', 'none', 'null', 'undefined'].includes(String(s).toLowerCase());

      const intervals = [];
      let currentStart = null;
      let currentState = null;

      // 1. Convert raw history into intervals
      rawHistory.forEach((hItem, index) => {
        let itemState = 'on';
        if (isOff(hItem.state)) itemState = 'off';
        else if (isUnknown(hItem.state)) itemState = 'unknown';

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
      // Close last interval
      if (currentStart !== null) {
        intervals.push({ state: currentState, start: currentStart, end: Date.now() });
      }

      // 2. Smooth intervals
      const smoothed = [];
      intervals.forEach(int => {
        if (smoothed.length === 0) {
          smoothed.push(int);
        } else {
          const last = smoothed[smoothed.length - 1];
          const duration = int.end - int.start;

          // If short duration (< 15 mins), ignore this state change (treat as continuation of previous)
          if (duration < 15 * 60000) {
            last.end = int.end; // Extend previous to cover this blip
          } else {
            // If valid duration, but same state as last (due to previous merge), just extend
            if (int.state === last.state) {
              last.end = int.end;
            } else {
              smoothed.push(int);
            }
          }
        }
      });

      // 3. Convert intervals to Outages and Unknowns
      this._actualOutages = smoothed
        .filter(i => i.state === 'off')
        .map(i => ({
          start: { dateTime: new Date(i.start).toISOString() },
          end: { dateTime: new Date(i.end).toISOString() }
        }));

      this._unknownIntervals = smoothed
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


  // _fetchActualOutages REMOVED

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

    const kTime = this._getKyivTime();
    const currentIdx = kTime.h * 2 + (kTime.m >= 30 ? 1 : 0);

    // Verify Data Freshness (Handle Midnight Rollover)
    // If attrs.date is Yesterday, we should use tomorrow_48half as Today.
    let todayData = attrs.today_48half || [];
    let tomorrowData = attrs.tomorrow_48half || [];
    let history_today = attrs.history_today_48half || [];
    let history_tomorrow = attrs.history_tomorrow_48half || [];

    if (attrs.date) {
      // Parse attrs.date (YYYY-MM-DD or ISO)
      const dateStr = attrs.date.split('T')[0];
      const kyivNowStr = new Date().toLocaleString("en-CA", { timeZone: "Europe/Kyiv" }).split(',')[0]; // "YYYY-MM-DD"

      if (dateStr < kyivNowStr) {
        // Data is STALE (Yesterday).
        // Shift Tomorrow -> Today
        todayData = tomorrowData;
        tomorrowData = [];
        // Also shift history if needed?
        // Usually history attributes are separate, but if we shift schedule, we might need to shift history or rely on coordinator rollover.
        // Let's rely on coordinator for history, but for DISPLAY of future schedule, we shift.
      } else if (dateStr > kyivNowStr) {
        // Data is FUTURE (Tomorrow is Today? Unlikely for this provider).
        // But if so, we might have skipped a day?
        // Treating as is for safety.
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
    const actualTimelineEl = this.querySelector('#actual-timeline');
    if (actualTimelineEl) actualTimelineEl.innerHTML = '';

    const formatTime = (d) => `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    const toLocalDisplay = (targetIdx) => {
      const diffSlots = targetIdx - currentIdx;
      const diffMs = diffSlots * 30 * 60 * 1000;
      const now = new Date();
      const startOfCurrentSlotMs = now.getTime() - ((now.getMinutes() % 30) * 60000) - (now.getSeconds() * 1000);
      const targetDate = new Date(startOfCurrentSlotMs + diffMs);
      return { time: formatTime(targetDate), date: targetDate };
    };

    let schedule = [];
    let startOffsetIdx = 0;

    const getLocalDayOffsetSlots = () => {
      const now = new Date();
      const localMidnight = new Date(now); localMidnight.setHours(0, 0, 0, 0);
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

    // Explicitly handle Stats visibility
    const statsEl = this.querySelector('#stats');
    if (statsEl) {
      if (showStats) statsEl.style.display = 'grid';
      else statsEl.style.display = 'none';
    }

    if (customStatusEntity && config.use_status_entity) {
      const cs = customStatusEntity.state;
      if (['off', 'Grid OFF', 'Grid-OFF', 'unavailable', '0', 'false'].includes(cs)) {
        isOffCurrent = true; isUnknownCurrent = false;
      } else if (['on', 'Grid ON', '1', 'true'].includes(cs)) {
        isOffCurrent = false; isUnknownCurrent = false;
      } else {
        isUnknownCurrent = true; isOffCurrent = false;
      }
      // Інверсія сенсора: якщо ввімкнено, міняємо ON<->OFF
      if (config.invert_status_entity && !isUnknownCurrent) {
        isOffCurrent = !isOffCurrent;
      }
    }

    let currentSlotState = isUnknownCurrent ? 'unknown' : (isOffCurrent ? 'off' : 'on');

    if (statusEl) {
      if (isUnknownCurrent) {
        statusEl.innerText = 'НЕВІДОМО'; statusEl.style.background = '#333'; statusEl.style.color = '#aaa';
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

    let rulerChangeTime = (config.use_status_entity && customStatusEntity && !isUnknownCurrent) ? new Date(customStatusEntity.last_changed) : null;

    // User Request: If Power is ON, try to use the End Time of the last actual outage from Calendar.
    // This is more reliable across HA restarts than scanner.last_changed.
    if (config.use_status_entity && !isOffCurrent && !isUnknownCurrent && this._actualOutages) {
      const nowMs = new Date().getTime();
      let lastOutageEnd = null;

      this._actualOutages.forEach(ev => {
        const e = new Date(ev.end.dateTime || ev.end.date);
        const eMs = e.getTime();
        // We ignore future events (shouldn't happen for past outages, but safety check)
        if (eMs <= nowMs + 60000) {
          if (!lastOutageEnd || eMs > lastOutageEnd.getTime()) {
            lastOutageEnd = e;
          }
        }
      });

      // If we found a valid outage end time, use it.
      // We do this blindly if found, assuming the calendar is the "Source of Truth" for history.
      if (lastOutageEnd) {
        rulerChangeTime = lastOutageEnd;
      }
    }

    // Fallback using Schedule if rulerChangeTime is not set (Status Entity missing or inactive)
    if (!rulerChangeTime) {
      // We use the Schedule (Plan) to determine "history"
      const relativeCurrentIdx = currentIdx - startOffsetIdx;
      const currentPlan = schedule[relativeCurrentIdx] || 'unknown';

      let foundIdx = -1;
      // Search backwards from current slot
      for (let i = relativeCurrentIdx - 1; i >= 0; i--) {
        if (schedule[i] !== currentPlan) {
          foundIdx = i;
          break;
        }
      }

      if (foundIdx !== -1) {
        // Transition happens at the end of foundIdx (start of foundIdx + 1)
        const changeIdx = startOffsetIdx + foundIdx + 1;
        rulerChangeTime = toLocalDisplay(changeIdx).date;
      } else {
        // No change found in the visible schedule window.
        // Default to the start of the visible window.
        rulerChangeTime = toLocalDisplay(startOffsetIdx).date;
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
          powerIcon.style.color = '#fdd835'; // Restrained yellow
        }
      } else {
        powerIcon.style.display = 'none';
      }
    }

    let changeSlotIdx = -1;
    let overlayPos = 0;

    if (rulerChangeTime) {
      // Calculate overlay/split position logic
      const diffMs = rulerChangeTime.getTime() - toLocalDisplay(currentIdx).date.getTime();
      const diffSlots = Math.floor(diffMs / 1800000);
      changeSlotIdx = currentIdx + diffSlots;

      const slotStartMs = toLocalDisplay(changeSlotIdx).date.getTime();
      const msInside = rulerChangeTime.getTime() - slotStartMs;
      overlayPos = Math.max(0, Math.min(100, (msInside / 1800000) * 100));
      if (overlayPos < 16.0) overlayPos = 0;
    }

    const cutoffIdx = (config.use_status_entity && rulerChangeTime && config.use_status_entity) ? changeSlotIdx : currentIdx;

    const effectiveSchedule = schedule.map((state, i) => {
      const absIdx = startOffsetIdx + i;
      const isPast = absIdx < currentIdx;

      if (isPast && isToday && config.show_actual_history && showActualHistory) {
        if (config.use_status_entity && rulerChangeTime && absIdx >= changeSlotIdx) { /* skip */ }
        else {
          const slotStartMs = toLocalDisplay(absIdx).date.getTime();
          const slotEndMs = slotStartMs + 1800000;

          // Check for Unknown first (priority?) or Outage first?
          // If unknown, we paint black. If off, red.
          // Let's check Unknown first.
          if (this._unknownIntervals) {
            let uOverlap = 0;
            for (const ev of this._unknownIntervals) {
              const s = new Date(ev.start.dateTime || ev.start.date).getTime();
              const e = new Date(ev.end.dateTime || ev.end.date).getTime();
              const oS = Math.max(s, slotStartMs); const oE = Math.min(e, slotEndMs);
              if (oE > oS) uOverlap += (oE - oS);
            }
            if (uOverlap > 15 * 60000) return 'unknown';
          }

          if (!this._actualOutages) return 'on';
          let overlap = 0;
          for (const ev of this._actualOutages) {
            const s = new Date(ev.start.dateTime || ev.start.date).getTime();
            const e = new Date(ev.end.dateTime || ev.end.date).getTime();
            const oS = Math.max(s, slotStartMs); const oE = Math.min(e, slotEndMs);
            if (oE > oS) overlap += (oE - oS);
          }
          return (overlap > 15 * 60000) ? 'off' : 'on';
        }
      }

      if (config.use_status_entity && rulerChangeTime) {
        if (absIdx > changeSlotIdx && absIdx <= currentIdx) return currentSlotState;
        if (absIdx === changeSlotIdx) return isOffCurrent ? 'on' : 'off';
      }

      if (absIdx === currentIdx && !config.use_status_entity) return currentSlotState;
      return state || 'unknown';
    });

    if (historyLabelEl) {
      // Show label if rulerChangeTime exists AND config allows it
      if (rulerChangeTime && config.show_change_time !== false) {
        historyLabelEl.innerText = `${isOffCurrent ? 'Світло вимкнули о' : 'Світло ввімкнули о'} ${formatTime(rulerChangeTime)}`;
      } else historyLabelEl.innerText = isToday ? '' : (attrs.tomorrow_date || "");
    }

    if (durationLabel) {
      // Relaxed condition: Show duration if we have a time, regardless of 'Use Status Entity'.
      // Only check isUnknownCurrent? If isOffCurrent/isOnCurrent is derived from Schedule, it's valid.
      // We assume if rulerChangeTime exists, we want to show duration.
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

    const scheduleKey = `${isDynamic}_${startOffsetIdx}_${JSON.stringify(effectiveSchedule)}_${rulerChangeTime}_${isEmergency}`;

    if (timelineEl && this._lastRenderedKey !== scheduleKey) {
      this._lastRenderedKey = scheduleKey;
      timelineEl.querySelectorAll('.timeline-block').forEach(b => b.remove());
      timelineEl.querySelectorAll('.midnight-marker').forEach(b => b.remove());
      rulerEl.innerHTML = '';

      const historyTimelineEl = this.querySelector('#history-timeline');
      if (historyTimelineEl) {
        historyTimelineEl.innerHTML = ''; historyTimelineEl.style.display = 'none';
        let histories = isToday ? attrs.history_today_48half : attrs.history_tomorrow_48half;
        if (config.show_history && histories && Array.isArray(histories) && histories.length > 0) {
          historyTimelineEl.style.display = 'flex';
          histories.slice(0, 3).forEach(hist => {
            const row = document.createElement('div'); row.style.display = 'flex'; row.style.height = '6px'; row.style.marginTop = '2px'; row.style.borderRadius = '2px'; row.style.overflow = 'hidden';

            // FIX: Просто обрізаємо історію без зшивання, щоб не було зсувів
            hist.slice(startOffsetIdx).forEach(s => {
              const b = document.createElement('div'); b.style.flex = '1';
              if (s === 'off') b.style.background = 'rgba(127, 0, 0, 0.6)';
              else if (s === 'unknown') b.style.background = '#000000';
              else b.style.background = 'rgba(27, 94, 32, 0.6)';
              b.style.borderRight = '1px solid rgba(0,0,0,0.1)'; row.appendChild(b);
            });

            // Добиваємо пустими блоками до кінця рядка (щоб закінчилось на 00:00)
            const padCount = schedule.length - hist.slice(startOffsetIdx).length;
            for (let k = 0; k < padCount; k++) { const b = document.createElement('div'); b.style.flex = '1'; row.appendChild(b); }
            historyTimelineEl.appendChild(row);
          });
        }
      }

      const totalSlots = effectiveSchedule.length;
      const occupiedPositions = [];

      const addLabel = (text, pos, type = 'normal', priority = false, shift = null) => {
        const ZIGZAG_THRESHOLD = 8.3; // ~2 hours. Closer than this -> ZigZag (2nd row)
        const SPREAD_THRESHOLD = 16.7; // ~4 hours. Closer than this -> Spread (Nudge text)
        const edgeThreshold = 17.0; // Distance to hide Start/End if conflict exists

        let conflictItem = null; let minDist = 999;

        occupiedPositions.forEach(item => {
          const dist = Math.abs(item.pos - pos);
          if (dist < SPREAD_THRESHOLD && dist < minDist) { minDist = dist; conflictItem = item; }
        });

        // Start/End should ideally not be blocked, but check edge threshold
        if ((type === 'start' || type === 'end')) {
          let edgeConflict = false;
          occupiedPositions.forEach(item => {
            if (Math.abs(item.pos - pos) < edgeThreshold) edgeConflict = true;
          });
          if (edgeConflict) return null;
        }

        // Priority logic (remove non-priority conflict if very close)
        if (!priority && conflictItem && conflictItem.priority && minDist < 3.0) return null;
        if (priority && conflictItem && !conflictItem.priority && minDist < 3.0) {
          if (conflictItem.element) conflictItem.element.remove();
          const idx = occupiedPositions.indexOf(conflictItem);
          if (idx > -1) occupiedPositions.splice(idx, 1);
          conflictItem = null;
        }

        const span = document.createElement('span');
        span.innerText = text;
        span.style.cssText = `position:absolute;color:var(--secondary-text-color);top:0;transform:translateX(-50%);`;

        if (type === 'start') { span.style.left = '0'; span.style.transform = 'none'; }
        else if (type === 'end') { span.style.right = '0'; span.style.left = 'auto'; span.style.transform = 'none'; }
        else { span.style.left = `${pos}%`; }

        // Layout Logic
        if (conflictItem && minDist < SPREAD_THRESHOLD && type !== 'start' && type !== 'end') {
          const isNeighborDown = conflictItem.element.style.top === '14px';

          if (minDist < ZIGZAG_THRESHOLD) {
            // Too close (<2h): ZigZag
            // If neighbor is UP, we go DOWN (unless we are 'start'/'end' which prefer UP)
            if (!isNeighborDown && type !== 'start' && type !== 'end') {
              span.style.top = '14px';
            }
            // If neighbor is DOWN, we stay UP (default).
          } else {
            // Close but manageable (2h-4h): Spread/Nudge
            // Standard transform is translateX(-50%).
            // If neighbor is LEFT, shift RIGHT.
            const factor = Math.max(0, Math.min(1, (minDist - ZIGZAG_THRESHOLD) / (SPREAD_THRESHOLD - ZIGZAG_THRESHOLD)));
            // Factor 0 (at 2h) -> Max shift. Factor 1 (at 4h) -> Normal centered (-50%).

            if (conflictItem.pos < pos) {
              // Conflict is Left. Shift Right.
              // TX goes from -10% (at 2h) to -50% (at 4h).
              const tx = 10 + (40 * factor);
              span.style.transform = `translateX(-${tx}%)`;

              // Mutual Spread: Shift Neighbor Left (ONLY if not anchor)
              if (conflictItem.type !== 'start' && conflictItem.type !== 'end') {
                const neighborTx = 90 - (40 * factor);
                if (conflictItem.element) conflictItem.element.style.transform = `translateX(-${neighborTx}%)`;
              }

            } else {
              // Conflict is Right. Shift Left.
              // TX goes from -90% (at 2h) to -50% (at 4h).
              const tx = 90 - (40 * factor);
              span.style.transform = `translateX(-${tx}%)`;

              // Mutual Spread: Shift Neighbor Right (ONLY if not anchor)
              if (conflictItem.type !== 'start' && conflictItem.type !== 'end') {
                const neighborTx = 10 + (40 * factor);
                if (conflictItem.element) conflictItem.element.style.transform = `translateX(-${neighborTx}%)`;
              }
            }
          }
        }

        if (priority) { span.style.color = '#fff'; span.style.fontWeight = 'bold'; span.style.zIndex = '15'; }

        rulerEl.appendChild(span);
        occupiedPositions.push({ pos: pos, element: span, priority: priority, type: type });
        return span;
      };


      if (showActualHistory && this._actualOutages && isToday) {
        const tStartMs = toLocalDisplay(startOffsetIdx).date.getTime();
        const tTotalMs = totalSlots * 1800000;
        const cutoffMs = rulerChangeTime ? rulerChangeTime.getTime() : new Date().getTime();
        this._actualOutages.forEach(ev => {
          const s = new Date(ev.start.dateTime || ev.start.date); const e = new Date(ev.end.dateTime || ev.end.date);
          if ((e - s) < 15 * 60000 || s.getTime() >= cutoffMs) return;
          if (s.getTime() > tStartMs) addLabel(formatTime(s), ((s.getTime() - tStartMs) / tTotalMs) * 100, 'normal', true);
          if (e.getTime() > tStartMs && e.getTime() < cutoffMs) addLabel(formatTime(e), ((e.getTime() - tStartMs) / tTotalMs) * 100, 'normal', true);
        });
      }

      if (rulerChangeTime && changeSlotIdx >= 0 && config.use_status_entity) {
        // User Request: Always show label for change time, even if using Actual Calendar.
        // Previously we skipped 'Power ON' if calendar was present, but user wants to see the specific time (e.g. 08:34).
        const skipLabel = false;

        if (!skipLabel) {
          const p = ((rulerChangeTime.getTime() - toLocalDisplay(startOffsetIdx).date.getTime()) / (totalSlots * 1800000)) * 100;
          if (p >= 0 && p <= 100) addLabel(formatTime(rulerChangeTime), p, 'normal', true);
        }
      }

      let lastLabelIndex = -100;
      let lastLabelElement = null;

      const COLOR_ON = config.color_on || '#1b5e20';
      const COLOR_OFF = config.color_off || '#7f0000';

      effectiveSchedule.forEach((state, i) => {
        const absIdx = startOffsetIdx + i;
        const isPast = absIdx < currentIdx;
        const b = document.createElement('div'); b.className = 'timeline-block'; b.style.flex = '1'; b.style.height = '100%'; b.style.position = 'relative'; b.style.overflow = 'hidden';

        let bg = COLOR_ON;
        if (state === 'off') bg = COLOR_OFF;
        else if (state === 'unknown') bg = '#000000';

        // Pixel-perfect history rendering:
        // If we are in history mode (past), let's override the base block color with precise overlays.
        const isHistoryMode = (config.show_actual_history)
          && isPast && isToday && (!rulerChangeTime || absIdx < changeSlotIdx);

        if (isHistoryMode) {
          const slotStartMs = toLocalDisplay(absIdx).date.getTime();
          const slotEndMs = slotStartMs + 1800000;
          const slotDuration = 1800000;

          // Calculate total coverage for outage and unknown
          let totalOutageCoverage = 0;
          let totalUnknownCoverage = 0;
          const outageSegments = [];
          const unknownSegments = [];

          if (this._actualOutages) {
            this._actualOutages.forEach(ev => {
              const s = new Date(ev.start.dateTime || ev.start.date).getTime();
              const e = new Date(ev.end.dateTime || ev.end.date).getTime();
              const oS = Math.max(s, slotStartMs); const oE = Math.min(e, slotEndMs);
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
              const oS = Math.max(s, slotStartMs); const oE = Math.min(e, slotEndMs);
              if (oE > oS) {
                totalUnknownCoverage += (oE - oS);
                unknownSegments.push({ oS, oE });
              }
            });
          }

          const outagePct = totalOutageCoverage / slotDuration;
          const unknownPct = totalUnknownCoverage / slotDuration;

          // If slot is almost fully covered by outage (>=95%), just paint it as solid red
          if (outagePct >= 0.95) {
            bg = COLOR_OFF;
            b.style.background = bg;
            b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';
          } else if (unknownPct >= 0.95 && outagePct < 0.05) {
            bg = '#000000';
            b.style.background = bg;
            b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';
          } else {
            // Partial coverage — use green base with overlays
            bg = COLOR_ON;
            b.style.background = bg;
            b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';

            // Draw Unknown Overlays first (Black)
            unknownSegments.forEach(seg => {
              const startP = ((seg.oS - slotStartMs) / slotDuration) * 100;
              const widthP = ((seg.oE - seg.oS) / slotDuration) * 100;
              const ov = document.createElement('div');
              ov.style.cssText = `position:absolute;top:0;bottom:0;left:${startP}%;width:${widthP}%;background:#000000;z-index:1;`;
              b.appendChild(ov);
            });

            // Draw Outage Overlays (Red)
            outageSegments.forEach(seg => {
              const startP = ((seg.oS - slotStartMs) / slotDuration) * 100;
              const widthP = ((seg.oE - seg.oS) / slotDuration) * 100;
              const ov = document.createElement('div');
              ov.style.cssText = `position:absolute;top:0;bottom:0;left:${startP}%;width:${widthP}%;background:${COLOR_OFF};z-index:2;`;
              b.appendChild(ov);
            });
          }
        } else {
          b.style.background = bg;
          b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';
        }

        if (config.use_status_entity && !isUnknownCurrent) {
          // Check if this slot needs a split overlay (change happened here OR current slot deviation)
          const isChangeSlot = (absIdx === changeSlotIdx && rulerChangeTime);
          const isCurrentSlot = (absIdx === currentIdx);

          if (isChangeSlot || isCurrentSlot) {
            const scheduleState = state; // Plan (block background)

            // Calculate changePercent if change is in this slot
            let changePercent = 0;
            let hasChangeInSlot = false;

            if (isChangeSlot) {
              const sTime = toLocalDisplay(absIdx).date.getTime();
              changePercent = Math.min(100, Math.max(0, ((rulerChangeTime.getTime() - sTime) / 1800000) * 100));
              hasChangeInSlot = true;
            }

            // Determine if we need an overlay
            // Ideally:
            // 1. If hasChangeInSlot: 
            //    - From 0 to changePercent: Previous State (inverse of isOffCurrent)
            //    - From changePercent to 100: Current State (isOffCurrent)
            //    BUT we only care about DEVIATION from Plan (scheduleState).
            //    However, for the Change Slot, we usually want to show the Transition explicitly, 
            //    regardless of plan, because it's "Live History".

            // Refined Logic for Change Slot (Live):
            // The BASE background is 'state' (Plan).
            // We want to visually represent the Transition.

            // If we are in the Current Slot, we also potentially have a "Future" part which is Plan.
            // But if Current Slot == Change Slot, "Future" part is effectively "Now -> End of Slot".
            // Since we know the state "Now", we assume it stays that way until further notice (or next plan change).

            // Let's stick to the previous logic but apply it to isChangeSlot too.

            // Case A: Current State is DIFFERENT from Plan
            if (currentSlotState !== scheduleState) {
              const overlay = document.createElement('div');
              overlay.style.position = 'absolute';
              overlay.style.top = '0'; overlay.style.bottom = '0';

              const startPos = hasChangeInSlot ? changePercent : 0;

              overlay.style.left = `${startPos}%`;
              overlay.style.width = `${100 - startPos}%`;
              overlay.style.background = isOffCurrent ? COLOR_OFF : COLOR_ON;
              overlay.style.zIndex = '2';

              if (b.style.borderRight && b.style.borderRight !== 'none') {
                overlay.style.borderRight = b.style.borderRight;
                b.style.borderRight = 'none';
              }
              b.appendChild(overlay);
            }
            // Case B: Current State MATCHES Plan, but there WAS a change in this slot
            // meaning the PREVIOUS part of the slot was deviation.
            else if (currentSlotState === scheduleState && hasChangeInSlot) {
              const prevStateIsOff = !isOffCurrent;

              const overlay = document.createElement('div');
              overlay.style.position = 'absolute';
              overlay.style.top = '0'; overlay.style.bottom = '0';
              overlay.style.left = '0';
              overlay.style.width = `${changePercent}%`;
              overlay.style.background = prevStateIsOff ? COLOR_OFF : COLOR_ON;
              overlay.style.zIndex = '2';

              b.appendChild(overlay);
            }
          }
          else if (config.use_status_entity && !isUnknownCurrent && absIdx === changeSlotIdx && rulerChangeTime && absIdx !== currentIdx) {
            // ... (Logic for past slots overlapping change time - kept for robustness) ...
            // This handles if change happened in a PAST slot relative to Now (rare if startOffset logic is good)
            const slotStartMs = toLocalDisplay(changeSlotIdx).date.getTime();
            const msInside = rulerChangeTime.getTime() - slotStartMs;
            const changePos = Math.max(0, Math.min(100, (msInside / 1800000) * 100));

            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.top = '0'; overlay.style.bottom = '0';
            overlay.style.right = '0';
            overlay.style.left = `${changePos}%`;
            overlay.style.background = isOffCurrent ? COLOR_OFF : COLOR_ON;
            overlay.style.zIndex = '2';

            if (b.style.borderRight && b.style.borderRight !== 'none') {
              overlay.style.borderRight = b.style.borderRight;
              b.style.borderRight = 'none';
            }
            b.appendChild(overlay);
          }
        }
        timelineEl.appendChild(b);

        const slotInfo = toLocalDisplay(absIdx);
        if (i > 0 && slotInfo.date.getHours() === 0 && slotInfo.date.getMinutes() === 0) {
          const m = document.createElement('div'); m.className = 'midnight-marker';
          m.style.cssText = `position:absolute;left:${(i / totalSlots) * 100}%;top:0;bottom:0;width:2px;background:rgba(0,0,0,0.8);z-index:20;pointer-events:none;transform:translateX(-50%);`; timelineEl.appendChild(m);
        }

        if (i > 0) {
          const isPlanChange = schedule[i] !== schedule[i - 1];
          const isEffChange = effectiveSchedule[i] !== effectiveSchedule[i - 1];
          const currPlan = schedule[i];
          const currEff = effectiveSchedule[i];

          // Is there an ACTUAL sensor change happening in this slot?
          // If so, rulerChangeTime logic adds its OWN label separately.
          const isActualChangeHere = (rulerChangeTime && changeSlotIdx === absIdx && config.use_status_entity);

          // Logic: Show label if Plan Changed (unless overridden by Actual Change),
          // OR if Visuals Changed (but filter out artificial boundaries where Plan didn't change).
          // 1. isPlanChange: Fundamental requirement.
          // 2. !isActualChangeHere: Don't double-label if actual change is right here.
          // 3. (isEffChange || (currEff !== currPlan)):
          //    - Normal case: Plan Changed and Eff Changed.
          //    - Override case: Plan Changed but Eff didn't (e.g. 22:00 ON->ON). We WANT label here.
          //    - Artificial case: Plan didn't Change (isPlanChange=false). We DON'T want label (e.g. 22:30).

          const showPlanLabel = isPlanChange && !isActualChangeHere && (isEffChange || (currEff !== currPlan));

          if (showPlanLabel) {
            if (config.show_actual_history && absIdx <= currentIdx && currEff === currPlan) return;

            const pos = (i / totalSlots) * 100;
            let currentShift = null;
            const newLabel = addLabel(slotInfo.time, pos, 'normal', false, currentShift);
            if (newLabel) { lastLabelIndex = i; lastLabelElement = newLabel; }
          }
        }
      });

      // Add Start/End Last (Low Priority - Hide if conflict)
      addLabel(toLocalDisplay(startOffsetIdx).time, 0, 'start', false);
      addLabel(toLocalDisplay(startOffsetIdx + totalSlots).time, 100, 'end', false);
    }

    if (nowMarker) {
      const now = new Date();
      if (isDynamic) {
        const pos = (((currentIdx - startOffsetIdx) + (now.getMinutes() % 30) / 30) / schedule.length) * 100;
        nowMarker.style.cssText = `display:block;left:${pos}%;width:3px;position:absolute;top:0;bottom:0;background:linear-gradient(#fff,rgba(255,255,255,0.8));z-index:10;box-shadow:0 0 12px #fff;`;
      } else if (isToday) {
        nowMarker.style.cssText = `display:block;left:${((now.getHours() * 60 + now.getMinutes()) / 1440) * 100}%;width:2px;position:absolute;top:0;bottom:0;background:#fff;z-index:10;box-shadow:0 0 8px #fff;`;
      } else nowMarker.style.display = 'none';
    }

    if (showStats) {
      const getNextChangeInfo = () => {
        let startIndex = isToday ? Math.floor((new Date().getHours() * 60 + new Date().getMinutes()) / 30) + 1 : 0;
        if (isDynamic) startIndex = (currentIdx - startOffsetIdx) + 1;

        // Use 'schedule' (Plan) instead of 'effectiveSchedule' (View) for predictions
        // taking into account startOffsetIdx
        // schedule[] is already sliced/prepared? 
        // In this scope, 'schedule' is the array used to build the view. 
        // effectiveSchedule was schedule.map(...). 
        // So 'schedule' holds the raw plan data (Green/Red/Grey).

        const currentState = schedule[startIndex - 1] || schedule[0];
        const targetState = (currentState === 'off') ? 'on' : 'off';
        let found = -1;
        for (let i = startIndex; i < schedule.length; i++) {
          if (schedule[i] === targetState) { found = i; break; }
        }

        if (found !== -1) {
          const local = toLocalDisplay(startOffsetIdx + found); let val = local.time;
          if (local.date.getDate() !== new Date().getDate()) val += ` ${local.date.getDate().toString().padStart(2, '0')}.${(local.date.getMonth() + 1).toString().padStart(2, '0')}`;
          return { label: targetState === 'on' ? 'Світло буде о:' : 'Вимкнуть о:', value: val, rawDate: local.date };
        }
        return { label: targetState === 'on' ? 'Світло буде о:' : 'Вимкнуть о:', value: '--:--', rawDate: null };
      };

      const getCountdownInfo = () => {
        const next = getNextChangeInfo(); if (!next.rawDate) return { label: 'До зміни:', value: '--:--' };
        const diffMs = next.rawDate - new Date(); if (diffMs < 0) return { label: next.label.replace(' о:', ''), value: '--:--' };
        const h = Math.floor(diffMs / 3600000); const m = Math.floor((diffMs % 3600000) / 60000);
        return { label: next.label.includes('буде') ? 'До включення:' : 'До вимкнення:', value: h > 0 ? `${h}г ${m}хв` : `${m} хв` };
      };

      const renderStat = (type, lEl, vEl) => {
        if (!lEl || !vEl) return;
        if (type === 'hours_without_light') {
          let offMins = 0; schedule.forEach(s => { if (s === 'off') offMins += 30; });
          lEl.innerText = isDynamic ? "У найближчі 24г без світла" : "Всього за добу без світла";
          vEl.innerText = `${parseFloat((offMins / 60).toFixed(1))} год (${Math.round((offMins / (schedule.length * 30)) * 100)}%)`;
        } else if (type === 'next_change') { const i = getNextChangeInfo(); lEl.innerText = i.label; vEl.innerText = i.value; }
        else if (type === 'countdown') { const i = getCountdownInfo(); lEl.innerText = i.label; vEl.innerText = i.value; }
        else if (type === 'schedule_updated' && config.schedule_entity && hass.states[config.schedule_entity]) {
          const d = new Date(hass.states[config.schedule_entity].last_changed);
          lEl.innerText = 'Графік оновлено о:'; vEl.innerText = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}${d.getDate() !== new Date().getDate() ? ' ' + d.getDate() + '.' + (d.getMonth() + 1) : ''}`;
        }
      };
      renderStat(config.left_stat_type || 'hours_without_light', this.querySelector('#left-stat-label'), this.querySelector('#left-stat-value'));
      renderStat(config.right_stat_type || 'schedule_updated', this.querySelector('#right-stat-label'), this.querySelector('#right-stat-value'));
    }
  } // Close _renderWithCurrentDay

  setConfig(config) { this.config = config; }
  static getConfigElement() { return document.createElement("svitlo-live-card-editor"); }
  static getStubConfig(hass, entities, entityIds) {
    const e = entityIds.find(id => hass.states[id]?.attributes?.today_48half);
    return { entity: e || '', title: '' };
  }
}

customElements.define('svitlo-live-card', SvitloLiveCard);

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "svitlo-live-card")) {
  window.customCards.push({ type: "svitlo-live-card", name: "Svitlo Live Card", preview: true, description: "Professional Svitlo.live dashboard" });
}