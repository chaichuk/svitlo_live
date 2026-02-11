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

          <div id="actual-calendar-section">
            <label style="font-weight: bold; font-size: 14px; margin-top: 8px;">Календар фактичних відключень (необов'язково):</label>
            <div style="font-size: 11px; opacity: 0.6; margin: 2px 0 4px 0;">Якщо обрано — минулі слоти таймлайну показуватимуть фактичні відключення з календаря замість планових</div>
            <div id="actual-calendar-picker-container" style="min-height: 50px; margin: 4px 0;"></div>

            <ha-formfield label="Фарбувати минулі слоти по фактичним відключенням" style="display: flex; align-items: center; margin-top: 8px;">
               <ha-switch id="actual-history-switch"></ha-switch>
            </ha-formfield>
          </div>

          <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--divider-color, rgba(127,127,127,0.2));">
            <label style="font-weight: bold; font-size: 14px;">Зовнішній вигляд:</label>

            <ha-formfield label="Показувати тінь картки" style="display: flex; align-items: center; margin-top: 8px;">
              <ha-switch id="shadow-switch"></ha-switch>
            </ha-formfield>

            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 12px;">
              <div>
                <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Колір "є світло"</label>
                <input type="color" id="color-on-input" style="width: 100%; height: 36px; border: 1px solid var(--divider-color, #ccc); border-radius: 6px; cursor: pointer; background: none; padding: 2px;">
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Колір "немає світла"</label>
                <input type="color" id="color-off-input" style="width: 100%; height: 36px; border: 1px solid var(--divider-color, #ccc); border-radius: 6px; cursor: pointer; background: none; padding: 2px;">
              </div>
              <div>
                <label style="font-size: 12px; font-weight: 600; display: block; margin-bottom: 4px;">Колір "невідомо"</label>
                <input type="color" id="color-unknown-input" style="width: 100%; height: 36px; border: 1px solid var(--divider-color, #ccc); border-radius: 6px; cursor: pointer; background: none; padding: 2px;">
              </div>
            </div>
            <button id="reset-colors-btn" style="margin-top: 10px; padding: 6px 14px; border-radius: 6px; border: 1px solid var(--divider-color, #ccc); background: transparent; color: var(--primary-text-color); font-size: 12px; cursor: pointer; opacity: 0.7;">Скинути кольори</button>
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

    const actualCalendarContainer = this.querySelector("#actual-calendar-picker-container");
    if (actualCalendarContainer) {
      const selector = document.createElement("ha-selector");
      selector.hass = this._hass;
      selector.selector = { entity: { domain: ['calendar'], integration: 'svitlo_live' } };
      selector.addEventListener("value-changed", (ev) => {
        this._valueChanged({ target: { configValue: 'actual_outage_calendar_entity', value: ev.detail.value } });
      });
      actualCalendarContainer.innerHTML = "";
      actualCalendarContainer.appendChild(selector);
      this._actualCalendarSelector = selector;
    }
  }

  _setupEventListeners() {
    const titleInput = this.querySelector("#title-input");
    if (titleInput) titleInput.addEventListener("input", (ev) => this._valueChanged({ target: { configValue: 'title', value: ev.target.value } }));

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

    const colorOnInput = this.querySelector("#color-on-input");
    if (colorOnInput) colorOnInput.addEventListener("input", (ev) => this._valueChanged({ target: { configValue: 'color_on', value: ev.target.value } }));

    const colorOffInput = this.querySelector("#color-off-input");
    if (colorOffInput) colorOffInput.addEventListener("input", (ev) => this._valueChanged({ target: { configValue: 'color_off', value: ev.target.value } }));

    const colorUnknownInput = this.querySelector("#color-unknown-input");
    if (colorUnknownInput) colorUnknownInput.addEventListener("input", (ev) => this._valueChanged({ target: { configValue: 'color_unknown', value: ev.target.value } }));

    const resetColorsBtn = this.querySelector("#reset-colors-btn");
    if (resetColorsBtn) resetColorsBtn.addEventListener("click", () => {
      const defaults = { color_on: '#1b5e20', color_off: '#7f0000', color_unknown: '#444444' };
      const newConfig = { ...this._config, ...defaults };
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: newConfig }, bubbles: true, composed: true }));
      const cOn = this.querySelector("#color-on-input"); if (cOn) cOn.value = defaults.color_on;
      const cOff = this.querySelector("#color-off-input"); if (cOff) cOff.value = defaults.color_off;
      const cUnk = this.querySelector("#color-unknown-input"); if (cUnk) cUnk.value = defaults.color_unknown;
    });
  }

  _updateProperties() {
    if (!this._hass || !this._config) return;
    const titleInput = this.querySelector("#title-input");
    if (titleInput) titleInput.value = this._config.title || '';

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

      // Update Actual Calendar Visibility on Init
      const acSection = this.querySelector("#actual-calendar-section");
      if (acSection) acSection.style.display = ps.checked ? 'block' : 'none';
    }

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

    if (this._actualCalendarSelector) {
      this._actualCalendarSelector.hass = this._hass;
      this._actualCalendarSelector.value = this._config.actual_outage_calendar_entity || '';
    }

    const ahs = this.querySelector("#actual-history-switch");
    if (ahs) ahs.checked = this._config.show_actual_history === true;

    const shSwitch = this.querySelector("#shadow-switch");
    if (shSwitch) shSwitch.checked = this._config.show_shadow !== false;

    const colorOn = this.querySelector("#color-on-input");
    if (colorOn) colorOn.value = this._config.color_on || '#1b5e20';

    const colorOff = this.querySelector("#color-off-input");
    if (colorOff) colorOff.value = this._config.color_off || '#7f0000';

    const colorUnknown = this.querySelector("#color-unknown-input");
    if (colorUnknown) colorUnknown.value = this._config.color_unknown || '#444444';
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
        <ha-card id="svitlo-ha-card" style="overflow: hidden;">
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
    if (this.config && this.config.actual_outage_calendar_entity) {
      this._fetchActualOutages(hass);
    }
    this._renderWithCurrentDay(hass);
  }

  async _fetchActualOutages(hass) {
    if (!this.config || !this.config.actual_outage_calendar_entity) return;

    const now = Date.now();
    if (this._lastCalendarFetch && (now - this._lastCalendarFetch < 30000)) return;
    this._lastCalendarFetch = now;

    const startRange = new Date(now - 24 * 60 * 60 * 1000);
    const endRange = new Date(now + 48 * 60 * 60 * 1000);

    try {
      const entityId = this.config.actual_outage_calendar_entity;
      const startISO = startRange.toISOString();
      const endISO = endRange.toISOString();

      const response = await hass.callApi(
        'GET',
        `calendars/${entityId}?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`
      );
      const rawEvents = Array.isArray(response) ? response : [];
      this._actualOutages = rawEvents.filter(ev => {
        const s = new Date(ev.start.dateTime || ev.start.date).getTime();
        const e = new Date(ev.end.dateTime || ev.end.date).getTime();
        return (e - s) >= 15 * 60000;
      });
      this._renderWithCurrentDay(hass);
    } catch (e) {
      console.warn("SvitloLive: Error fetching calendar events", e);
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

    // Apply shadow setting to all elements
    const showShadow = config.show_shadow !== false;
    const haCard = this.querySelector('#svitlo-ha-card');
    if (haCard) haCard.style.boxShadow = showShadow ? '0 4px 20px rgba(0,0,0,0.3), 0 0 40px rgba(0,0,0,0.1)' : 'none';

    const statusEl_ = this.querySelector('#status');
    if (statusEl_) statusEl_.style.boxShadow = showShadow ? '0 4px 12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.15)' : 'none';

    const timelineEl_ = this.querySelector('#timeline');
    if (timelineEl_) timelineEl_.style.boxShadow = showShadow ? '0 4px 15px rgba(0,0,0,0.3), inset 0 2px 4px rgba(0,0,0,0.4)' : 'none';

    const daySwitcher_ = this.querySelector('#day-switcher');
    if (daySwitcher_) daySwitcher_.style.boxShadow = showShadow ? 'inset 0 1px 3px rgba(0,0,0,0.1)' : 'none';

    const leftStat_ = this.querySelector('#left-stat');
    if (leftStat_) leftStat_.style.boxShadow = showShadow ? '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none';

    const rightStat_ = this.querySelector('#right-stat');
    if (rightStat_) rightStat_.style.boxShadow = showShadow ? '0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05)' : 'none';

    const emergencyBanner_ = this.querySelector('#emergency-banner');
    if (emergencyBanner_) emergencyBanner_.style.boxShadow = showShadow ? '0 2px 8px rgba(183, 28, 28, 0.4), inset 0 1px 0 rgba(255,255,255,0.1)' : 'none';

    // Apply shadow class for CSS-driven active tab shadow
    if (haCard) haCard.classList.toggle('no-shadows', !showShadow);

    const stateObj = hass.states[config.entity];
    const attrs = stateObj.attributes;

    // Configurable colors
    const colorOn = config.color_on || '#1b5e20';
    const colorOff = config.color_off || '#7f0000';
    const colorUnknown = config.color_unknown || '#444444';

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
    }

    let currentSlotState = isUnknownCurrent ? 'unknown' : (isOffCurrent ? 'off' : 'on');

    if (statusEl) {
      if (isUnknownCurrent) {
        statusEl.innerText = 'НЕВІДОМО'; statusEl.style.background = '#333'; statusEl.style.color = '#aaa';
      } else {
        statusEl.innerText = isToday || isDynamic ? (isOffCurrent ? 'НЕМАЄ СВІТЛА' : 'Є СВІТЛО') : 'ГРАФІК НА ЗАВТРА';
        statusEl.style.background = isToday || isDynamic ? (isOffCurrent ? colorOff : colorOn) : '#333';
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

      if (isPast && isToday && config.actual_outage_calendar_entity && showActualHistory) {
        if (config.use_status_entity && rulerChangeTime && absIdx >= changeSlotIdx) { /* skip */ }
        else {
          if (!this._actualOutages) return 'on';
          const slotStartMs = toLocalDisplay(absIdx).date.getTime();
          const slotEndMs = slotStartMs + 1800000;
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
        if (absIdx > changeSlotIdx && absIdx < currentIdx) return currentSlotState;
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
              if (s === 'off') b.style.background = colorOff + '99';
              else if (s === 'unknown') b.style.background = colorUnknown + '99';
              else b.style.background = colorOn + '99';
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
        const threshold = 8.5;
        const edgeThreshold = 14.5;

        let conflictItem = null; let minDist = 999;

        occupiedPositions.forEach(item => {
          const dist = Math.abs(item.pos - pos);
          if (dist < threshold && dist < minDist) { minDist = dist; conflictItem = item; }
        });

        if ((type === 'start' || type === 'end')) {
          let edgeConflict = false;
          occupiedPositions.forEach(item => {
            if (Math.abs(item.pos - pos) < edgeThreshold) edgeConflict = true;
          });
          if (edgeConflict) return null;
        }

        if (!priority && conflictItem && conflictItem.priority && minDist < 5.0) return null;
        if (priority && conflictItem && !conflictItem.priority && minDist < 5.0) {
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

        if (conflictItem && minDist < threshold) {
          const isNeighborDown = conflictItem.element.style.top === '14px';
          if (!isNeighborDown) {
            span.style.top = '14px';
          }
          span.style.transform = 'translateX(-50%)';
        }

        if (priority) { span.style.color = '#fff'; span.style.fontWeight = 'bold'; span.style.zIndex = '15'; }

        rulerEl.appendChild(span);
        occupiedPositions.push({ pos: pos, element: span, priority: priority });
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
        // User Request: If using Actual Calendar, do NOT show the label for "Power ON" on the timeline,
        // because it's redundant (visible in header) and can be confusing if it was a short toggle.
        // But DO show it if "Power OFF" (current outage start), as it's not in calendar yet.
        const skipLabel = config.actual_outage_calendar_entity && !isOffCurrent;

        if (!skipLabel) {
          const p = ((rulerChangeTime.getTime() - toLocalDisplay(startOffsetIdx).date.getTime()) / (totalSlots * 1800000)) * 100;
          if (p >= 0 && p <= 100) addLabel(formatTime(rulerChangeTime), p, 'normal', true);
        }
      }

      let lastLabelIndex = -100;
      let lastLabelElement = null;

      effectiveSchedule.forEach((state, i) => {
        const absIdx = startOffsetIdx + i;
        const b = document.createElement('div'); b.className = 'timeline-block'; b.style.flex = '1'; b.style.height = '100%'; b.style.position = 'relative';

        let bg = colorOn;
        if (state === 'off') bg = colorOff;
        else if (state === 'unknown') bg = colorUnknown;
        b.style.background = bg;
        b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';

        if (config.use_status_entity && !isUnknownCurrent) {
          // Special handling for Current Slot to support "Split" visualization
          // Left of Now = Actual, Right of Now = Plan
          if (absIdx === currentIdx) {
            const scheduleState = state; // Plan

            // Check if Deviation exists (Actual != Plan)
            // But beware: Pre-change might have matched Plan, Post-change mismatch.
            // Or Pre-change mismatch, Post-change match?
            // "Last event 00:38 ON" (Green). Plan likely Red.
            // So Post-Change (Green) != Plan (Red).

            if (currentSlotState !== scheduleState) {
              const now = new Date();
              const nowPercent = Math.min(100, Math.max(0, ((now.getMinutes() % 30) / 30) * 100 + ((now.getSeconds() / 60) / 30) * 100));

              let changePercent = 0;
              // Only respect changeTime if it is in THIS slot.
              if (absIdx === changeSlotIdx && rulerChangeTime) {
                const slotStartMs = toLocalDisplay(absIdx).date.getTime(); // Re-calculate or reuse? toLocalDisplay creates new Date.
                // We can infer slot start from index logic if reliable, but toLocalDisplay is consistent.
                // Wait, toLocalDisplay(absIdx) helper is available in scope? Yes.
                const sTime = toLocalDisplay(absIdx).date.getTime();
                changePercent = Math.min(100, Math.max(0, ((rulerChangeTime.getTime() - sTime) / 1800000) * 100));
              }

              // Draw Overlay from Change -> End of Slot (Status Projection)
              // User wants "Ahead is also Green" if currently Green.
              // So we extend the Current Status to the end of the slot (100%), overriding the Plan.

              const overlay = document.createElement('div');
              overlay.style.position = 'absolute';
              overlay.style.top = '0'; overlay.style.bottom = '0';
              overlay.style.left = `${changePercent}%`;
              overlay.style.width = `${100 - changePercent}%`; // Extend to End
              overlay.style.background = isOffCurrent ? colorOff : colorOn; // Actual color
              overlay.style.zIndex = '2';
              b.appendChild(overlay);
            }
          }
          else if (config.use_status_entity && !isUnknownCurrent && absIdx === changeSlotIdx && rulerChangeTime && absIdx !== currentIdx) {
            // Here we might have partial overlay too, but from ChangeTime to Right.
            // Re-implement basic overlay logic for the "Start of Deviation" slot if strictly needed.
            // existing logic handles this via 'effectiveSchedule' returning specific state?
            // The 'effectiveSchedule' map says: if absIdx === changeSlotIdx return isOffCurrent ? 'on' : 'off'.
            // This means the BASE BACKGROUND is the OLD state (before change).
            // So we need to overlay the NEW state from ChangeTime -> Right.

            // Calculate position inside this slot
            const slotStartMs = toLocalDisplay(changeSlotIdx).date.getTime();
            const msInside = rulerChangeTime.getTime() - slotStartMs;
            const changePos = Math.max(0, Math.min(100, (msInside / 1800000) * 100));

            const overlay = document.createElement('div');
            overlay.style.position = 'absolute';
            overlay.style.top = '0'; overlay.style.bottom = '0';
            overlay.style.right = '0'; // Ensure it snaps to the end
            overlay.style.left = `${changePos}%`;
            overlay.style.background = isOffCurrent ? colorOff : colorOn; // New State
            // overlay.style.width = `${100 - changePos}%`; // Removed to prevent sub-pixel gaps
            overlay.style.zIndex = '2';

            // FIX: Move border from block to overlay to prevent "Green Line" artifact
            // The block background is Green. The overlay is Red.
            // If border is on block, it composites over Green.
            // We want it on the overlay (Red).
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

        if (i > 0 && effectiveSchedule[i] !== effectiveSchedule[i - 1]) {
          // Allow labels for past slots even if show_actual_history is on.
          // if (config.show_actual_history && absIdx < currentIdx) return; 

          const pos = (i / totalSlots) * 100;
          let currentShift = null;
          const newLabel = addLabel(slotInfo.time, pos, 'normal', false, currentShift);
          if (newLabel) { lastLabelIndex = i; lastLabelElement = newLabel; }
        }
      });
      addLabel(toLocalDisplay(startOffsetIdx).time, 0, 'start', true);
      addLabel(toLocalDisplay(startOffsetIdx + totalSlots).time, 100, 'end', false);
    }

    if (nowMarker) {
      const now = new Date();
      const markerGlow = showShadow ? 'box-shadow:0 0 12px #fff;' : '';
      const markerGlow2 = showShadow ? 'box-shadow:0 0 8px #fff;' : '';
      if (isDynamic) {
        const pos = (((currentIdx - startOffsetIdx) + (now.getMinutes() % 30) / 30) / schedule.length) * 100;
        nowMarker.style.cssText = `display:block;left:${pos}%;width:3px;position:absolute;top:0;bottom:0;background:linear-gradient(#fff,rgba(255,255,255,0.8));z-index:10;${markerGlow}`;
      } else if (isToday) {
        nowMarker.style.cssText = `display:block;left:${((now.getHours() * 60 + now.getMinutes()) / 1440) * 100}%;width:2px;position:absolute;top:0;bottom:0;background:#fff;z-index:10;${markerGlow2}`;
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
  }

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