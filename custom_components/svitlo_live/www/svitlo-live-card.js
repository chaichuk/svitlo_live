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

          <label style="font-weight: bold; font-size: 14px; margin-top: 8px;">Власний сенсор статусу (напр. розетка):</label>
          <div id="status-picker-container" style="min-height: 50px; margin: 4px 0;"></div>

          <ha-formfield label="Використовувати цей сенсор як основний пріоритет" style="display: flex; align-items: center;">
            <ha-switch id="priority-switch"></ha-switch>
          </ha-formfield>

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

          <label style="font-weight: bold; font-size: 14px; margin-top: 8px;">Календар фактичних відключень (необов'язково):</label>
          <div style="font-size: 11px; opacity: 0.6; margin: 2px 0 4px 0;">Якщо обрано — минулі слоти таймлайну показуватимуть фактичні відключення з календаря замість планових</div>
          <div id="actual-calendar-picker-container" style="min-height: 50px; margin: 4px 0;"></div>
          
          <ha-formfield label="Фарбувати минулі слоти по фактичним відключенням" style="display: flex; align-items: center; margin-top: 8px;">
             <ha-switch id="actual-history-switch"></ha-switch>
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
    // Status Picker
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

    // Emergency Picker
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

    // Schedule Updated Picker
    const scheduleContainer = this.querySelector("#schedule-picker-container");
    if (scheduleContainer) {
      const selector = document.createElement("ha-selector");
      selector.hass = this._hass;
      selector.selector = { entity: { domain: ['sensor'] } };
      selector.addEventListener("value-changed", (ev) => {
        this._valueChanged({ target: { configValue: 'schedule_entity', value: ev.detail.value } });
      });
      scheduleContainer.innerHTML = "";
      scheduleContainer.appendChild(selector);
      this._scheduleSelector = selector;
    }

    // Actual Calendar Picker
    const actualCalendarContainer = this.querySelector("#actual-calendar-picker-container");
    if (actualCalendarContainer) {
      const selector = document.createElement("ha-selector");
      selector.hass = this._hass;
      selector.selector = { entity: { domain: ['calendar'] } };
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
    if (prioritySwitch) prioritySwitch.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'use_status_entity', value: ev.target.checked } }));

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

    const ds = this.querySelector("#dynamic-switch");
    if (ds) ds.checked = this._config.dynamic_timeline || false;

    const hs = this.querySelector("#history-switch");
    if (hs) hs.checked = this._config.show_history || false;

    const cts = this.querySelector("#change-time-switch");
    if (cts) cts.checked = this._config.show_change_time !== false; // default true

    const durs = this.querySelector("#duration-switch");
    if (durs) durs.checked = this._config.show_duration !== false; // default true

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
    if (ahs) ahs.checked = this._config.show_actual_history === true; // Default false
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


// --- MAIN CARD CLASS ---

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
            
            <div id="header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
              <div style="display: flex; flex-direction: column; gap: 0px; max-width: 65%;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <ha-icon id="power-icon" icon="mdi:power-plug-off" style="display: none; color: #ef5350; --mdc-icon-size: 32px;"></ha-icon>
                  <div id="title" style="font-size: 20px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.3px;">Svitlo.live</div>
                </div>
                <div id="history-label" style="font-size: 12px; opacity: 0.55; white-space: nowrap; font-weight: 500;"></div>
                <div id="duration-label" style="font-size: 11px; opacity: 0.45; white-space: nowrap; font-weight: 500; display: none;"></div>
              </div>
              <div style="display: flex; flex-direction: column; align-items: stretch; gap: 4px;">
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
                  margin-top: 3px; 
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

    // Throttle: 30 seconds
    const now = Date.now();
    if (this._lastCalendarFetch && (now - this._lastCalendarFetch < 30000)) return;
    this._lastCalendarFetch = now;

    // We need broad range for safety (Yesterday to Tomorrow) to handle timezone shifts
    const startRange = new Date(now - 24 * 60 * 60 * 1000);
    const endRange = new Date(now + 48 * 60 * 60 * 1000);

    try {
      // Use REST API: GET /api/calendars/{entity_id}?start=...&end=...
      const entityId = this.config.actual_outage_calendar_entity;
      const startISO = startRange.toISOString();
      const endISO = endRange.toISOString();

      const response = await hass.callApi(
        'GET',
        `calendars/${entityId}?start=${encodeURIComponent(startISO)}&end=${encodeURIComponent(endISO)}`
      );
      this._actualOutages = Array.isArray(response) ? response : [];
      this._renderWithCurrentDay(hass);
    } catch (e) {
      console.warn("SvitloLive: Error fetching calendar events", e);
    }
  }

  // Helper: Reliable Kyiv Time Calculation
  _getKyivTime() {
    const now = new Date();
    // Use toLocaleTimeString which is robust for timezone conversion
    // force hour12: false to get 0-23
    const timeStr = now.toLocaleTimeString("en-US", { timeZone: "Europe/Kyiv", hour12: false, hour: '2-digit', minute: '2-digit' });
    const [h, m] = timeStr.split(':').map(Number);
    return { h, m };
  }

  // Get index of the very first slot of Today in Kyiv (00:00 Kyiv)
  // CurrentIdx is calculated from Now (Kyiv).
  // We need to know which absolute index corresponds to current time.
  // Actually, we can use the same logic as toLocalDisplay to get TIMESTAMP of a slot.
  _getSlotTimeRange(absIdx) {
    // We need current Kyiv index to anchor
    const kTime = this._getKyivTime();
    const currentIdx = kTime.h * 2 + (kTime.m >= 30 ? 1 : 0);

    // Diff from now
    const diffSlots = absIdx - currentIdx;

    const now = new Date();
    const minutesIntoSlot = kTime.m % 30;
    const secondsInto = now.getSeconds();
    const startOfCurrentSlotMs = now.getTime() - (minutesIntoSlot * 60 * 1000) - (secondsInto * 1000);

    const slotStartMs = startOfCurrentSlotMs + (diffSlots * 30 * 60 * 1000);
    const slotEndMs = slotStartMs + (30 * 60 * 1000);

    return { start: slotStartMs, end: slotEndMs };
  }

  _isSlotActuallyOff(absIdx) {
    if (!this._actualOutages) return null;
    // If array exists (even empty), we should trust it if the user configured it?
    // User says: "If no event, light is ON".
    // So if fetched successfully (not undefined), default to false (ON) if no overlap.

    const { start: slotStartMs, end: slotEndMs } = this._getSlotTimeRange(absIdx);

    // Check overlaps
    let totalOverlapMs = 0;

    for (const ev of this._actualOutages) {
      const startStr = ev.start?.dateTime || ev.start?.date || ev.start;
      const endStr = ev.end?.dateTime || ev.end?.date || ev.end;
      if (!startStr || !endStr) continue;

      const evStart = new Date(startStr).getTime();
      const evEnd = new Date(endStr).getTime();

      // Duration check
      if ((evEnd - evStart) < 5 * 60 * 1000) continue;

      // Intersection
      const startOverlap = Math.max(evStart, slotStartMs);
      const endOverlap = Math.min(evEnd, slotEndMs);

      if (startOverlap < endOverlap) {
        totalOverlapMs += (endOverlap - startOverlap);
      }
    }

    return totalOverlapMs > 15 * 60 * 1000;
  }

  _renderWithCurrentDay(hass) {
    const config = this.config;
    if (!config || !config.entity || !hass.states[config.entity]) return;

    const stateObj = hass.states[config.entity];

    const attrs = stateObj.attributes;

    // Hoisted variables for global scope visibility in method
    let renderLiveOff = false;
    const customStatusEntity = config.status_entity ? hass.states[config.status_entity] : null;

    const kTime = this._getKyivTime();
    const currentIdx = kTime.h * 2 + (kTime.m >= 30 ? 1 : 0);

    // We retain kyivDate for legacy compatibility if needed, but logic uses currentIdx
    // For display strings generated relative to schedule:
    const kyivDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kyiv" }));

    const tomorrowSch = attrs.tomorrow_48half || [];
    const hasTomorrow = tomorrowSch.length === 48;

    const isDynamic = config.dynamic_timeline && hasTomorrow;
    const isToday = this._selectedDay === 'today';

    const daySwitcher = this.querySelector('#day-switcher');
    const tomorrowTab = this.querySelector('#tomorrow-tab');
    const tabs = this.querySelectorAll('.day-tab');
    const historyLabelEl = this.querySelector('#history-label');
    const statusEl = this.querySelector('#status');
    const eb = this.querySelector('#emergency-banner');
    const nowMarker = this.querySelector('#now-marker');

    // Helper: Calculate Local Time for a given slot index
    // We anchor 'currentIdx' to 'Now'
    // Any other index is (index - currentIdx) * 30 minutes away
    const toLocalDisplay = (targetIdx) => {
      // Find offset in minutes from *current slot start*
      // currentIdx represents the slot covering current time. 
      // We can approximate "Now" as "Start of current slot + 15min" or just use Date.now()
      // Better: targetIdx 0 corresponds to 00:00 Kyiv. currentIdx corresponds to Now Kyiv.
      // Difference in slots:
      const diffSlots = targetIdx - currentIdx;
      const diffMs = diffSlots * 30 * 60 * 1000;

      // However, currentIdx is 'floor' of current time.
      // Real time is e.g. 10:15 (idx 20). 
      // Index 20 starts at 10:00.
      // If we want 10:00 displayed for index 20, we need to subtract minutes into current slot.

      const now = new Date();
      const minutesIntoSlot = kTime.m % 30; // 0..29
      const secondsInto = now.getSeconds();

      // exactTimeOfStartOfCurrentSlot = now - minutesIntoSlot
      const startOfCurrentSlotMs = now.getTime() - (minutesIntoSlot * 60 * 1000) - (secondsInto * 1000);

      const targetTimeMs = startOfCurrentSlotMs + diffMs;
      const d = new Date(targetTimeMs);

      const lh = d.getHours().toString().padStart(2, '0');
      const lm = d.getMinutes().toString().padStart(2, '0');
      return { time: `${lh}:${lm}`, date: d };
    };

    // Helper: Get offset in slots between Local Midnight and Kyiv Midnight
    const getLocalDayOffsetSlots = () => {
      const now = new Date();
      // Local Midnight
      const localMidnight = new Date(now);
      localMidnight.setHours(0, 0, 0, 0);

      // Get Kyiv time for this moment
      const kyivTimeStr = localMidnight.toLocaleTimeString("en-US", { timeZone: "Europe/Kyiv", hour12: false, hour: '2-digit', minute: '2-digit' });
      const [kh, km] = kyivTimeStr.split(':').map(Number);

      // Slot index in Kyiv day
      // If Local (Milan) is 00:00 -> Kyiv is 01:00 -> Index 2.
      const kIdx = kh * 2 + (km >= 30 ? 1 : 0);
      return kIdx;
    };

    if (daySwitcher) {
      if (isDynamic) {
        daySwitcher.style.display = 'none';
      } else {
        daySwitcher.style.display = hasTomorrow ? 'flex' : 'none';
        if (tomorrowTab) tomorrowTab.style.display = hasTomorrow ? 'block' : 'none';
      }
    }
    tabs.forEach(t => t.classList.toggle('active', t.dataset.day === this._selectedDay));

    const titleEl = this.querySelector('#title');
    if (titleEl) {
      if (config.title) {
        titleEl.innerText = config.title;
      } else if (attrs.region && attrs.queue) {
        titleEl.innerText = `${attrs.region} / ${attrs.queue}`;
      } else {
        titleEl.innerText = (attrs.friendly_name || "Svitlo.live").replace("Svitlo • ", "").replace(" Outages Schedule", "");
      }
    }

    let schedule = [];
    let isOffCurrent = false;
    let currentSlotState = 'unknown';
    let startOffsetIdx = 0;
    const LOOKBACK_SLOTS = 3;

    // Variable to track the ACTUAL live status for rendering constraints (Current Slot & Gap Fill)


    if (isDynamic) {
      startOffsetIdx = Math.max(0, currentIdx - LOOKBACK_SLOTS);
      const todayPart = (attrs.today_48half || []).slice(startOffsetIdx);
      const neededForFullDay = 48 - todayPart.length;
      const tomorrowPart = tomorrowSch.slice(0, neededForFullDay);
      schedule = [...todayPart, ...tomorrowPart];
    } else {
      // STATIC MODE (Today or Tomorrow)
      // We want to show LOCAL DAY (00:00 - 00:00 Local), not Kyiv Day
      const localShift = getLocalDayOffsetSlots(); // e.g. 2 for UTC+1

      // Base schedule to start from
      const baseSch = isToday ? (attrs.today_48half || []) : tomorrowSch;
      // Next day schedule (needed if shifting right)
      // If isToday, next is Tomorrow. If isTomorrow, next is unknown (empty).
      const nextSch = isToday ? tomorrowSch : [];

      // Apply shift
      // If localShift > 0 (West of Kyiv): We start later in Kyiv day.
      // e.g. start at index 2.
      // We need 48 slots from there.

      // If Tomorrow: start from index 48 + localShift relative to Today 00:00
      startOffsetIdx = localShift + (isToday ? 0 : 48);

      // Slicing: baseSch is the 48-slot array for the target day.
      // We slice it by localShift to align with Local 00:00
      const part1 = baseSch.slice(localShift);
      const needed = 48 - part1.length;
      const part2 = nextSch.slice(0, needed);

      // Pad with 'unknown' if we don't have enough future data (e.g. tomorrow schedule missing)
      // to ensures timeline maintains 24h scale (00:00 - 00:00 Local)
      const paddingCount = 48 - (part1.length + part2.length);
      const padding = paddingCount > 0 ? new Array(paddingCount).fill('unknown') : [];

      schedule = [...part1, ...part2, ...padding];

      // Note regarding 'startOffsetIdx' usage later:
      // Loop uses `startOffsetIdx + i`.
      // If we set `startOffsetIdx = localShift` (e.g. 2).
      // i=0. AbsIdx = 2. Correct (Kyiv 01:00).
      // toLocalDisplay(2) -> Local 00:00. Correct.
    }

    if (isToday || isDynamic) {
      const schedState = (attrs.today_48half && attrs.today_48half[currentIdx]) ? attrs.today_48half[currentIdx] : 'unknown';

      const isUnknown = (schedState === 'unknown' || schedState === 'nosched' || !schedState);
      isOffCurrent = (schedState === 'off');

      let statusLabel = isOffCurrent ? 'ПЛАНОВЕ ВІДКЛЮЧЕННЯ' : (isUnknown ? 'НЕВІДОМО' : 'Є СВІТЛО');
      let statusColor = isOffCurrent ? '#bf360c' : (isUnknown ? '#222' : '#1b5e20');

      // Track the actual state for the current slot (on, off, unknown)
      currentSlotState = isUnknown ? 'unknown' : (isOffCurrent ? 'off' : 'on');

      // Initialize renderLiveOff with base scheduled status (Legacy, we will use currentSlotState mainly)
      renderLiveOff = isOffCurrent;

      if (customStatusEntity) {
        const cs = customStatusEntity.state;
        const isOffFact = (cs === 'off' || cs === 'Grid OFF' || cs === 'Grid-OFF' || cs === 'unavailable' || cs === '0');
        // If entity is unavailable/unknown? For now assume off if explicitly OFF, otherwise ON? 
        // Or keep unknown? Custom Entity usually binary. 
        // Let's stick to existing logic for custom entity override.

        if (config.use_status_entity) {
          isOffCurrent = isOffFact;
          // Only colour the timeline (current slot) if history is enabled
          if (config.show_actual_history === true) {
            renderLiveOff = isOffFact;
            currentSlotState = isOffFact ? 'off' : 'on';
          }
          statusLabel = isOffFact ? 'НЕМАЄ СВІТЛА' : 'Є СВІТЛО';
          statusColor = isOffFact ? '#7f0000' : '#1b5e20';
        }
      }

      if (statusEl) {
        statusEl.innerText = statusLabel;
        statusEl.style.background = statusColor;
        statusEl.style.color = '#fff';
      }

      // Power icon and duration timer logic
      const powerIcon = this.querySelector('#power-icon');
      const durationLabel = this.querySelector('#duration-label');

      if (historyLabelEl && schedule.length >= 1) {
        const fullToday = attrs.today_48half || [];
        let changeTime = null;

        if (config.use_status_entity && customStatusEntity) {
          changeTime = new Date(customStatusEntity.last_changed);
          if (config.show_change_time !== false) {
            const h = changeTime.getHours().toString().padStart(2, '0');
            const m = changeTime.getMinutes().toString().padStart(2, '0');
            historyLabelEl.innerText = `${isOffCurrent ? 'Світло вимкнули о' : 'Світло ввімкнули о'} ${h}:${m}`;
          } else {
            historyLabelEl.innerText = '';
          }
        } else if (isUnknown) {
          historyLabelEl.innerText = '';
        } else if (schedState !== (isOffCurrent ? 'off' : 'on')) {
          if (config.show_change_time !== false) {
            historyLabelEl.innerText = isOffCurrent ? `Відключено (за фактом)` : `Світло є (поза графіком)`;
          } else {
            historyLabelEl.innerText = '';
          }
        } else {
          let chIdx = currentIdx;
          const targetState = isOffCurrent ? 'off' : 'on';
          while (chIdx > 0 && fullToday[chIdx - 1] === targetState) chIdx--;
          const chH = Math.floor(chIdx / 2);
          const chM = chIdx % 2 === 0 ? 0 : 30;
          if (config.show_change_time !== false) {
            const local = toLocalDisplay(chIdx);
            historyLabelEl.innerText = `${isOffCurrent ? 'Світло вимкнули о' : 'Світло ввімкнули о'} ${local.time}`;

            // Set changeTime for duration calculation
            // We need to construct a Date object for the change time today
            const now = new Date();
            changeTime = new Date(now);
            changeTime.setHours(local.date.getHours(), local.date.getMinutes(), 0, 0);

          } else {
            historyLabelEl.innerText = '';
          }
        }

        // Show power icon when power is off
        if (powerIcon) {
          powerIcon.style.display = (isOffCurrent && !isUnknown) ? 'inline' : 'none';
        }

        // Duration timer
        if (durationLabel && changeTime && isOffCurrent && config.show_duration !== false) {
          durationLabel.style.display = 'block';

          const updateDuration = () => {
            let diffMs;
            if (config.use_status_entity && customStatusEntity) {
              diffMs = new Date() - changeTime;
            } else {
              const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kyiv" }));
              diffMs = now - changeTime;
            }
            const diffMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            durationLabel.innerText = `Тривалість: ${hours.toString().padStart(2, '0')} год ${mins.toString().padStart(2, '0')} хв`;
          };

          updateDuration();

          // Clear previous interval if exists
          if (this._durationInterval) clearInterval(this._durationInterval);
          this._durationInterval = setInterval(updateDuration, 60000); // Update every minute
        } else if (durationLabel) {
          durationLabel.style.display = 'none';
          if (this._durationInterval) {
            clearInterval(this._durationInterval);
            this._durationInterval = null;
          }
        }
      }

      // Emergency Banner Logic
      let isEmergency = false;
      if (config.emergency_entity) {
        const emState = hass.states[config.emergency_entity];
        if (emState && (emState.state === 'on' || emState.state === 'true')) isEmergency = true;
      } else if (attrs.region && attrs.queue) {
        const emEid = Object.keys(hass.states).find(eid => eid.includes('emergency') && hass.states[eid].attributes?.region === attrs.region && hass.states[eid].attributes?.queue === attrs.queue);
        if (emEid) isEmergency = hass.states[emEid].state === 'on';
      }
      if (eb) eb.style.display = isEmergency ? 'block' : 'none';

    } else {
      if (statusEl) {
        statusEl.innerText = 'ГРАФІК НА ЗАВТРА';
        statusEl.style.background = '#333';
        statusEl.style.color = '#eee';
      }
      if (historyLabelEl) historyLabelEl.innerText = (attrs.tomorrow_date || "");
      if (eb) eb.style.display = 'none';
    }

    // === RENDER TIMELINE ===
    if (nowMarker) {
      if (isDynamic) {
        const diffSlots = currentIdx - startOffsetIdx;
        const posPercent = (diffSlots / schedule.length) * 100;
        nowMarker.style.display = 'block';
        nowMarker.style.left = `${posPercent}%`;
        nowMarker.style.width = '3px';
      } else if (isToday) {
        const minutesOfDay = kyivDate.getHours() * 60 + kyivDate.getMinutes();
        nowMarker.style.display = 'block';
        nowMarker.style.left = `${(minutesOfDay / 1440) * 100}%`;
        nowMarker.style.width = '2px';
      } else {
        nowMarker.style.display = 'none';
      }
    }

    const timelineEl = this.querySelector('#timeline');
    const historyTimelineEl = this.querySelector('#history-timeline');
    const rulerEl = this.querySelector('#ruler');

    const scheduleKey = `${isDynamic ? 'dyn' : this._selectedDay}_${JSON.stringify(schedule)}_${config.show_history}_${startOffsetIdx}_${this._actualOutages?.length || 0}`;

    if (timelineEl && rulerEl && this._lastRenderedKey !== scheduleKey) {
      this._lastRenderedKey = scheduleKey;

      timelineEl.querySelectorAll('.timeline-block').forEach(b => b.remove());
      timelineEl.querySelectorAll('.midnight-marker').forEach(b => b.remove());
      rulerEl.innerHTML = '';

      // --- HISTORY RENDER ---
      if (historyTimelineEl) {
        historyTimelineEl.innerHTML = '';
        historyTimelineEl.style.display = 'none';

        if (config.show_history) {
          let histories = [];
          if (this._selectedDay === 'tomorrow') {
            histories = attrs.history_tomorrow_48half;
          } else {
            // Today or Dynamic (starts with today)
            histories = attrs.history_today_48half;
          }

          if (histories && Array.isArray(histories) && histories.length > 0) {
            historyTimelineEl.style.display = 'flex';
            // Show max 3 history rows
            histories.slice(0, 3).forEach(hist => {
              const row = document.createElement('div');
              row.style.display = 'flex';
              row.style.height = '6px';
              row.style.marginTop = '2px';
              row.style.borderRadius = '2px';
              row.style.overflow = 'hidden';

              // Dynamic handling: align with main schedule start
              const sliceStart = startOffsetIdx;
              const histSlice = hist.slice(sliceStart);

              histSlice.forEach((s, idx) => {
                const b = document.createElement('div');
                b.style.flex = '1';

                if (s === 'off') b.style.background = 'rgba(255, 82, 82, 0.4)';
                else if (s === 'unknown') b.style.background = 'rgba(255, 255, 255, 0.1)';
                else b.style.background = 'rgba(105, 240, 174, 0.4)';

                b.style.borderRight = '1px solid rgba(0,0,0,0.1)';
                row.appendChild(b);
              });

              // Pad if main schedule is longer (e.g. dynamic mode extends to tomorrow)
              const padCount = schedule.length - histSlice.length;
              for (let k = 0; k < padCount; k++) {
                const b = document.createElement('div');
                b.style.flex = '1';
                row.appendChild(b);
              }
              historyTimelineEl.appendChild(row);
            });
          }
        }
      }
      // --- END HISTORY RENDER ---

      const totalSlots = schedule.length;
      let lastOccupiedPos = -20, currentLevel = 0;
      let lastLabelElement = null;
      let lastLabelIndex = -100;
      let isPrevStart = false;

      // 1. Calculate change indices to decide on Hiding Edges
      let firstChangeIdx = -1, lastChangeIdx = -1;
      schedule.forEach((state, i) => {
        if (i > 0 && schedule[i] !== schedule[i - 1]) {
          if (firstChangeIdx === -1) firstChangeIdx = i;
          lastChangeIdx = i;
        }
      });

      const addLabel = (text, pos, type = 'normal', customShift = null) => {
        // type: 'start', 'end', 'normal'
        const span = document.createElement('span');
        span.innerText = text;
        span.style.position = 'absolute';
        span.style.color = 'var(--secondary-text-color)';

        if (type === 'start') {
          span.style.left = '0'; // Strict left 0
          span.style.transform = 'none';
        } else if (type === 'end') {
          span.style.right = '0'; // Strict right 0
          span.style.left = 'auto';
          span.style.transform = 'none';
        } else {
          span.style.left = `${pos}%`;
          if (customShift) span.style.transform = `translateX(${customShift})`;
          else span.style.transform = 'translateX(-50%)';
        }

        // COLLISION LOGIC
        // Check against ALL existing labels
        const collision = occupiedPositions.some(p => Math.abs(p - pos) < 7);

        if (type !== 'start' && !customShift && pos !== 0 && pos !== 100 && collision) {
          currentLevel = (currentLevel === 0) ? 1 : 0;
        } else {
          currentLevel = 0;
        }

        // Safety for end label
        if (type === 'end' && collision) {
          currentLevel = 1;
        }

        span.style.top = currentLevel === 0 ? '0' : '14px';
        rulerEl.appendChild(span);
        // lastOccupiedPos = pos; // Deprecated
        occupiedPositions.push(pos);
        return span;
      };

      // COLLISION TRACKING
      const occupiedPositions = [];
      // lastLabelIndex is already declared above

      // 2. ADD START LABEL (Conditionally)
      const startIdx = startOffsetIdx;
      // If NOT dynamic and NOT today (checked by startOffsetIdx logic usually, but let's be safe for visual labeling)
      // Actually startOffsetIdx is enough relative to 'currentIdx' for toLocalDisplay
      // BUT if it's tomorrow static, we need +48
      const effectiveStartIdx = startOffsetIdx + (!isDynamic && !isToday ? 48 : 0);

      const startLocal = toLocalDisplay(effectiveStartIdx);

      let startLabelVisible = false;
      // HIDE if first change is <= 6 slots (3 hours) from start
      if (firstChangeIdx === -1 || firstChangeIdx > 6) {
        lastLabelElement = addLabel(startLocal.time, 0, 'start');
        isPrevStart = true;
        startLabelVisible = true;
        lastLabelIndex = 0; // Set logical start index
        // occupiedPositions.push(0); // addLabel does this
      } else {
        // If Start is hidden, reset trackers so first change behaves as "first"
        lastLabelIndex = -100;
        isPrevStart = false;
      }



      // === PRE-CALCULATE CHANGE TIME FOR RULER & SLOT COLORING ===
      let rulerChangeTime = null;
      let changeSlotIdx = -1;

      if (config.use_status_entity && customStatusEntity) {
        rulerChangeTime = new Date(customStatusEntity.last_changed);
      } else if (isOffCurrent) {
        let chIdx = currentIdx;
        const fullDay = attrs.today_48half || [];
        while (chIdx > 0 && fullDay[chIdx - 1] === 'off') chIdx--;
        const local = toLocalDisplay(chIdx);
        rulerChangeTime = local.date;
      } else {
        let chIdx = currentIdx;
        const fullDay = attrs.today_48half || [];
        while (chIdx > 0 && fullDay[chIdx - 1] === 'on') chIdx--;
        const local = toLocalDisplay(chIdx);
        rulerChangeTime = local.date;
      }

      if (rulerChangeTime && !isNaN(rulerChangeTime.getTime())) {
        // Calculate which slot index this time falls into
        // currentIdx is known.
        // diffMs = rulerChangeTime - Now
        // diffSlots = diffMs / 30min
        // targetIdx = currentIdx + diffSlots

        const now = new Date(); // Approximate now? Or use kyivDate?
        // Better: convert rulerChangeTime to Kyiv Time slots?
        // rulerChangeTime is physically 'last_changed' (UTC/Local).
        // toLocalDisplay uses Local time.
        // Let's use simple time diff from 'Now'.

        // We need absoluteIdx.
        // We know 'currentIdx' corresponds to 'Now' (approx).

        // slotDuration = 30 * 60 * 1000
        // diff from now
        // but actually 'currentIdx' is floored slot of now.
        // So start of current slot is...

        // Let's rely on 'currentIdx' being the slot index.
        // If change happened 15 mins ago, it's in currentIdx.
        // If 45 mins ago, it's (currentIdx - 1).

        // exactTimeOfStartOfCurrentSlot was calculated in toLocalDisplay but acts locally.
        // Let's re-calc:
        const kTimeNow = this._getKyivTime();
        const minutesIntoSlot = kTimeNow.m % 30;
        const secondsInto = now.getSeconds();
        const startOfCurrentSlotMs = now.getTime() - (minutesIntoSlot * 60 * 1000) - (secondsInto * 1000);

        const diffMs = rulerChangeTime.getTime() - startOfCurrentSlotMs;
        const diffSlots = Math.floor(diffMs / (30 * 60 * 1000));

        changeSlotIdx = currentIdx + diffSlots;
      }

      // 3. DRAW BLOCKS & CHANGE LABELS
      let prevDisplayState = null;
      schedule.forEach((state, i) => {
        const absoluteIdx = startOffsetIdx + i;
        const isPastSlot = absoluteIdx < currentIdx;
        const isCurrentSlot = absoluteIdx === currentIdx;

        // For past slots with calendar data, use actual outage status
        let displayState = state;


        if (isCurrentSlot && typeof currentSlotState !== 'undefined') {
          // Current slot: use LIVE status 
          displayState = currentSlotState;
        } else if (isPastSlot && config.actual_outage_calendar_entity && isToday && config.show_actual_history !== false) {
          // ... existing logic ...
          const actualOff = this._isSlotActuallyOff(absoluteIdx);
          if (actualOff !== null) {
            displayState = actualOff ? 'off' : 'on';
          }
        }

        // FORCE COLOR FOR CHANGE SLOT
        // If this slot contains the transition, we set it to the PREVIOUS state.
        // The overlay (red/green) will paint the CURRENT state from the exact time.
        // So 07:00-07:09 will be green (previous), 07:09-07:30 red (overlay).
        if (absoluteIdx === changeSlotIdx) {
          if (displayState !== 'unknown') {
            displayState = isOffCurrent ? 'on' : 'off';
          }
        }

        const b = document.createElement('div');
        b.className = 'timeline-block';
        b.style.flex = '1';
        b.style.height = '100%';

        // Color logic
        if (displayState === 'off') {
          b.style.background = '#7f0000';
        } else if (displayState === 'unknown' || displayState === 'nosched' || !displayState) {
          b.style.background = 'rgba(255, 255, 255, 0.05)'; // Very faint or black
        } else {
          b.style.background = '#1b5e20';
        }
        b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none';
        timelineEl.appendChild(b);

        // Effective index for time calculations (hoisted)
        const effectiveLabelIdx = startOffsetIdx + i + (!isDynamic && !isToday ? 48 : 0);

        // Midnight Marker (LOCAL TIME)
        // Check if this slot represents the start of a local day (00:00)
        // We only show it if it's not the very first slot (to avoid edge overlap)
        if (i > 0) {
          const slotLocal = toLocalDisplay(effectiveLabelIdx);
          if (slotLocal.date.getHours() === 0 && slotLocal.date.getMinutes() === 0) {
            const mLine = document.createElement('div');
            mLine.className = 'midnight-marker';
            mLine.style.position = 'absolute';
            mLine.style.left = `${(i / totalSlots) * 100}%`;
            mLine.style.top = '0';
            mLine.style.bottom = '0';
            mLine.style.width = '2px';                 // User asked for "black line" - standard width 2px maybe? old was 4px
            mLine.style.background = 'rgba(0,0,0,0.8)'; // Darker for visibility
            mLine.style.zIndex = '20';
            mLine.style.boxShadow = '0 0 4px rgba(0,0,0,0.5)';
            mLine.style.pointerEvents = 'none';
            mLine.style.transform = 'translateX(-50%)';
            timelineEl.appendChild(mLine);
          }
        }

        // Add time label at change points
        // For past slots with calendar data: use displayState changes only (fact)
        // For future slots or no calendar: use schedule changes (plan)
        const hasDisplayStateChange = i > 0 && prevDisplayState !== null && displayState !== prevDisplayState;
        const hasScheduleChange = i > 0 && schedule[i] !== schedule[i - 1];
        const useFactLabels = isPastSlot && config.actual_outage_calendar_entity && isToday && this._actualOutages?.length;
        const shouldAddLabel = useFactLabels ? hasDisplayStateChange : hasScheduleChange;

        if (shouldAddLabel) {
          const normalizedIdx = absoluteIdx % 48;
          const pos = (i / totalSlots) * 100;

          // effectiveLabelIdx is already calculated above

          // If showing FACT labels, try to find the EXACT time from calendar events
          // and map it back to a fractional index
          if (useFactLabels) {
            // Determine if this is start (ON->OFF) or end (OFF->ON) of an outage visual block
            const isOutageStart = displayState === 'off';

            let bestTime = null;
            let minDiff = Infinity;

            // We need wall time of this slot to compare with calendar events
            // slotTimeMs = Kyiv 00:00 + idx*30min
            const now = new Date();
            const slotTimeMs = now.setHours(0, 0, 0, 0) + normalizedIdx * 30 * 60 * 1000; // Approximation for comparison
            // Actually, comparing calendar event time (Date) with fractional index is hard if strict match needed.
            // But toLocalDisplay takes Index.
            // If we find a specific Date from calendar, we need to convert it to Index relative to currentIdx.
            // diffSlots = (EventDate - Now) / 30min

            if (this._actualOutages) {
              for (const ev of this._actualOutages) {
                const tStr = isOutageStart
                  ? (ev.start?.dateTime || ev.start?.date || ev.start)
                  : (ev.end?.dateTime || ev.end?.date || ev.end);
                if (!tStr) continue;
                const tDate = new Date(tStr);
                // Check if close to current slot time?
                // Let's just use the closest event if valid? Not trivial without robust base.
                // For now, fallback to standard slot time to fix NaN.
                // TODO: restore Fact Label precision later if needed.
              }
            }
          }

          // Convert to local time for display
          const local = toLocalDisplay(effectiveLabelIdx);

          let shiftCurrent = null;

          // Only calculate Spread/Gap if we have a visible previous label
          if (lastLabelIndex !== -100) {
            let slotsGap;
            if (isPrevStart) slotsGap = i; // Distance from 0
            else slotsGap = i - lastLabelIndex;

            // SPREAD LOGIC: spread labels when they are close
            // 2-3 slots (1-1.5 hours): moderate spread
            // 4-5 slots (2-2.5 hours): light spread
            if (slotsGap >= 2 && slotsGap <= 3) {
              // 1-1.5 hour gap - moderate spread
              if (isPrevStart) {
                shiftCurrent = '-30%';
              } else {
                if (lastLabelElement) {
                  lastLabelElement.style.transform = 'translateX(-70%)';
                  lastLabelElement.style.top = '0';
                }
                shiftCurrent = '-30%';
              }
            } else if (slotsGap >= 4 && slotsGap <= 5) {
              // 2-2.5 hour gap - spread moderately
              if (isPrevStart) {
                shiftCurrent = '-30%';
              } else {
                if (lastLabelElement) {
                  lastLabelElement.style.transform = 'translateX(-70%)';
                  lastLabelElement.style.top = '0';
                }
                shiftCurrent = '-30%';
              }
            }
          }

          const newLabel = addLabel(local.time, pos, 'normal', shiftCurrent);
          if (shiftCurrent) newLabel.style.top = '0';

          lastLabelElement = newLabel;
          lastLabelIndex = i;
          isPrevStart = false;
        }

        prevDisplayState = displayState;
      });

      // === ADD CHANGE TIME LABEL TO RULER ===
      // Explicitly label the time of the last change (if known and valid)
      // We look for 'changeTime' from the history calculation block.
      // Since 'changeTime' was local to that block, we need to extract it or re-calculate.
      // But wait! We are in the same scope '_renderWithCurrentDay'.
      // 'changeTime' variable is declared inside `if (historyLabelEl && schedule.length >= 1)`.
      // It is NOT available here unless we hoist it.

      // Let's rely on the fact that we can re-calculate it or check attributes if needed.
      // Better: let's re-calculate it locally here if we want to show it on Ruler.
      // OR: Move the variable declaration up.



      if (rulerChangeTime && !isNaN(rulerChangeTime.getTime()) && config.show_change_time !== false) {
        let labelPos = -1;
        const cTimeMs = rulerChangeTime.getTime();

        if (isDynamic) {
          const timelineStartMs = new Date(kyivDate).setHours(0, 0, 0, 0) + (startOffsetIdx * 30 * 60 * 1000);
          const timelineEndMs = timelineStartMs + (schedule.length * 30 * 60 * 1000);

          if (cTimeMs >= timelineStartMs && cTimeMs <= timelineEndMs) {
            labelPos = ((cTimeMs - timelineStartMs) / (timelineEndMs - timelineStartMs)) * 100;
          }
        } else if (isToday) {
          const now = new Date();
          const localMidnight = new Date(now);
          localMidnight.setHours(0, 0, 0, 0);
          const startMs = localMidnight.getTime();
          const endMs = startMs + 24 * 60 * 60 * 1000;

          if (cTimeMs >= startMs && cTimeMs <= endMs) {
            labelPos = ((cTimeMs - startMs) / (endMs - startMs)) * 100;
          }
        }

        if (labelPos >= 0 && labelPos <= 100) {
          const h = rulerChangeTime.getHours().toString().padStart(2, '0');
          const m = rulerChangeTime.getMinutes().toString().padStart(2, '0');
          const timeStr = `${h}:${m}`;
          // Add label with distinct style
          const l = addLabel(timeStr, labelPos, 'change');
          l.style.color = '#fff';
          l.style.fontWeight = 'bold';
          l.style.opacity = '1';
          // Optional: highlight background?
          // l.style.background = 'rgba(0,0,0,0.5)';
          // l.style.padding = '0 2px';
          // l.style.borderRadius = '2px';
        }
      }

      // 4. ADD END LABEL (Conditionally)
      // 4. ADD END LABEL (Conditionally)
      // Effective end index logic
      // For Static Mode "Today", startOffsetIdx is e.g., 2. Total 48. End = 50.
      // Index 50 (Kyiv) = 25 hours from Kyiv 00:00 = 01:00 Next Day Kyiv = 00:00 Next Day Local (Milan).
      // So logic seems correct.
      // But let's double check if isToday/isDynamic flags affect it.

      let effectiveEndIdx = startOffsetIdx + totalSlots;
      if (!isDynamic && !isToday) {
        // Tomorrow tab: we start at startOffsetIdx relative to Tomorrow 00:00 Kyiv?
        // No, Tomorrow Data is just array.
        // But toLocalDisplay relies on 'currentIdx' (Today).
        // So if we are displaying Tomorrow, indices are +48 relative to Today 00:00.
        effectiveEndIdx += 48;

        // Wait! effectiveStartIdx logic for Tomorrow was: `startOffsetIdx + 48`.
        // So `effectiveEndIdx` should be `startOffsetIdx + 48 + 48`? 
        // schedule.length is 48.
        // So `start + 48` is end of schedule.
        // If `startOffsetIdx` for tomorrow is 2. `2+48` = 50.
        // But relative to TODAY, Tomorrow Start is index 48+2 = 50.
        // So End is 50+48 = 98.
        // Previous code: `(!isDynamic && !isToday ? 48 : 0)` added to `startOffsetIdx + totalSlots`.
        // If `startOffsetIdx` (2) + 48 (slots) + 48 (tomorrow offset) = 98.
        // Index 98 = 49 hours from Today 00:00.
        // 49h - 1h (Milan offset) = 48h = 00:00 (Day after tomorrow).
        // It should be correct.
      }

      // Let's force re-calculation just to be safe and clean.
      // And explicit logging if needed (removed for prod).

      const endLocal = toLocalDisplay(effectiveEndIdx);

      // Check distance from last change to end
      const distToEnd = totalSlots - lastLabelIndex;

      // HIDE if last change is <= 2 slots (1 hour) from end
      // We want to show End Label more often, e.g. if 23:00 is las change, show 00:00 too.
      if (lastChangeIdx === -1 || (totalSlots - lastChangeIdx) > 2) {

        // Apply spread logic for close labels
        if (distToEnd >= 2 && distToEnd <= 3 && lastLabelElement) {
          // 1-1.5 hour gap
          lastLabelElement.style.transform = 'translateX(-70%)';
          lastLabelElement.style.top = '0';
        } else if (distToEnd >= 4 && distToEnd <= 5 && lastLabelElement) {
          // 2-2.5 hour gap
          lastLabelElement.style.transform = 'translateX(-70%)';
          lastLabelElement.style.top = '0';
        }

        addLabel(endLocal.time, 100, 'end');
      }

      // History
      let historyList = isToday ? (attrs.history_today_48half || []) : (attrs.history_tomorrow_48half || []);
      if (historyList.length === 48 && typeof historyList[0] === 'string') historyList = [historyList];

      if (historyTimelineEl) {
        historyTimelineEl.innerHTML = '';
        if (config.show_history && historyList.length > 0 && !isDynamic && isToday) {
          historyTimelineEl.style.display = 'flex';
          [...historyList].reverse().forEach((pastSchedule) => {
            if (!Array.isArray(pastSchedule)) return;
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.height = '5px';
            row.style.width = '100%';
            row.style.marginTop = '2px';
            row.style.borderRadius = '2px';
            row.style.overflow = 'hidden';
            row.style.opacity = '0.4';
            pastSchedule.forEach((state, i) => {
              const hb = document.createElement('div');
              hb.style.flex = '1';
              hb.style.height = '100%';

              if (state === 'off') hb.style.background = '#7f0000';
              else if (state === 'unknown') hb.style.background = 'rgba(255,255,255,0.1)';
              else hb.style.background = '#1b5e20';

              hb.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none';
              row.appendChild(hb);
            });
            historyTimelineEl.appendChild(row);
          });
        } else {
          historyTimelineEl.style.display = 'none';
        }
      }



      // Actual Timeline Rendering
      const actualTimelineEl = this.querySelector('#actual-timeline');
      if (actualTimelineEl) {
        actualTimelineEl.innerHTML = '';
        if (config.actual_outage_calendar_entity && this._actualOutages && this._actualOutages.length > 0 && !isDynamic && isToday) {
          actualTimelineEl.style.display = 'block';
          this._actualOutages.forEach(ev => {
            const startStr = ev.start.dateTime || ev.start.date;
            const endStr = ev.end.dateTime || ev.end.date;
            if (!startStr || !endStr) return;

            // Normalize ISO/Date to Kyiv Time components for the timeline
            const dStart = new Date(startStr);
            const dEnd = new Date(endStr);

            const startKyiv = new Date(dStart.toLocaleString("en-US", {
              timeZone: "Europe/Kyiv"
            }));
            const endKyiv = new Date(dEnd.toLocaleString("en-US", {
              timeZone: "Europe/Kyiv"
            }));

            // Clip to Today 00:00 - 24:00 (Kyiv)
            const todayStart = new Date(kyivDate);
            todayStart.setHours(0, 0, 0, 0);
            const todayEnd = new Date(todayStart);
            todayEnd.setHours(24, 0, 0, 0);

            if (endKyiv <= todayStart || startKyiv >= todayEnd) return;

            const effStart = startKyiv < todayStart ? todayStart : startKyiv;
            const effEnd = endKyiv > todayEnd ? todayEnd : endKyiv;

            const startMins = effStart.getHours() * 60 + effStart.getMinutes();
            const endMins = effEnd.getHours() * 60 + effEnd.getMinutes();
            const duration = endMins - startMins;

            if (duration < 2) return; // Ignore < 2 mins to avoid edge artifacts

            if (duration < 15) return; // Ignore < 15 mins (User Request)

            // Account for startOffsetIdx (Timezone shift)
            const offsetMins = startOffsetIdx * 30; // Shift in minutes
            const timelineDurationMins = totalSlots * 30;

            const left = ((startMins - offsetMins) / timelineDurationMins) * 100;
            const width = (duration / timelineDurationMins) * 100;
            const right = left + width;

            const b = document.createElement('div');
            b.style.position = 'absolute';
            b.style.left = `${left}%`;
            b.style.width = `${width}%`;
            b.style.top = '0';
            b.style.bottom = '0';
            b.style.background = '#e53935';
            b.style.opacity = '0.9';
            b.style.boxShadow = '0 0 2px rgba(0,0,0,0.5)';
            b.title = `${effStart.toLocaleTimeString()} - ${effEnd.toLocaleTimeString()}`;
            actualTimelineEl.appendChild(b);

            // Add Labels for History Events
            const formatTime = (d) => {
              const h = d.getHours().toString().padStart(2, '0');
              const m = d.getMinutes().toString().padStart(2, '0');
              return `${h}:${m}`;
            };

            // Start Label (if visible and not overlapping limits)
            if (left > 2 && left < 98) {
              addLabel(formatTime(effStart), left, 'normal');
            }
            // End Label
            if (right > 2 && right < 98) {
              addLabel(formatTime(effEnd), right, 'normal');
            }
          });
        } else {
          actualTimelineEl.style.display = 'none';
        }

        // === VISUAL OVERLAY FOR EXACT CHANGE TIME ===
        // If we have a ruler label for change time (e.g. 07:09), 
        // we want the visual color to also change exactly there, 
        // overriding the 30-min schedule blocks.
        if (rulerChangeTime && !isNaN(rulerChangeTime.getTime()) && config.show_change_time !== false) {
          // Calculate positions
          const cTimeMs = rulerChangeTime.getTime();
          const nowMs = new Date().getTime(); // Or use kyivDate if needed, but 'Now' is generally Now.

          // Define Timeline Range
          let timelineStartMs, timelineEndMs;

          if (isDynamic) {
            timelineStartMs = new Date(kyivDate).setHours(0, 0, 0, 0) + (startOffsetIdx * 30 * 60 * 1000);
            timelineEndMs = timelineStartMs + (schedule.length * 30 * 60 * 1000);
          } else if (isToday) {
            const now = new Date();
            const localMidnight = new Date(now);
            localMidnight.setHours(0, 0, 0, 0);
            const startMs = localMidnight.getTime();
            const endMs = startMs + 24 * 60 * 60 * 1000;
            timelineStartMs = startMs;
            timelineEndMs = endMs;
          }

          if (timelineStartMs && timelineEndMs && cTimeMs >= timelineStartMs && cTimeMs <= timelineEndMs) {
            const startPercent = ((cTimeMs - timelineStartMs) / (timelineEndMs - timelineStartMs)) * 100;
            // End at 'Now' usually, or end of timeline if Now is later?
            // Typically the "state" persists from change time until now.
            // So we draw from changeTime to Now.
            // Logic check: if change happened in future? Unlikely.

            let endPercent = ((nowMs - timelineStartMs) / (timelineEndMs - timelineStartMs)) * 100;
            if (endPercent > 100) endPercent = 100;
            if (endPercent < startPercent) endPercent = startPercent; // Safety

            const widthPercent = endPercent - startPercent;

            if (widthPercent > 0) {
              const overlay = document.createElement('div');
              overlay.style.position = 'absolute';
              overlay.style.left = `${startPercent}%`;
              overlay.style.width = `${widthPercent}%`;
              overlay.style.top = '0';
              overlay.style.bottom = '0';
              // Color based on CURRENT state
              if (currentSlotState === 'off') overlay.style.background = '#7f0000';
              else if (currentSlotState === 'unknown') overlay.style.background = 'rgba(255,255,255,0.1)';
              else overlay.style.background = '#1b5e20';

              overlay.style.opacity = '1'; // Full opacity to cover schedule
              overlay.style.zIndex = '2'; // Top of actual timeline
              overlay.style.boxShadow = 'inset 1px 0 0 rgba(255,255,255,0.3)'; // Highlight start edge

              actualTimelineEl.style.display = 'block'; // Ensure container is visible
              actualTimelineEl.appendChild(overlay);
            }
          }
        }
      }


      // Stats visibility
      const statsEl = this.querySelector('#stats');
      const containerEl = this.querySelector('#container');
      const showStats = config.show_stats !== false; // default true

      if (statsEl) statsEl.style.display = showStats ? 'grid' : 'none';

      // Adjust container padding based on stats visibility
      if (containerEl) {
        containerEl.style.paddingBottom = showStats ? '10px' : '3px';
      }

      if (showStats) {
        const leftType = config.left_stat_type || 'hours_without_light';
        const rightType = config.right_stat_type || 'schedule_updated';

        // Helper function to calculate next change info
        const getNextChangeInfo = () => {
          let currentState, targetState, searchStartIndex = 0;
          if (isDynamic) {
            const diff = currentIdx - startOffsetIdx;
            if (schedule[diff]) {
              currentState = schedule[diff];
              targetState = (currentState === 'off') ? 'on' : 'off';
              searchStartIndex = diff + 1;
            }
          } else if (isToday) {
            if (schedule[currentIdx]) {
              currentState = schedule[currentIdx];
              targetState = (currentState === 'off') ? 'on' : 'off';
              searchStartIndex = currentIdx + 1;
            }
          } else {
            currentState = schedule[0];
            targetState = (currentState === 'off') ? 'on' : 'off';
          }

          let foundIndex = -1;
          if (currentState) {
            for (let i = searchStartIndex; i < schedule.length; i++) {
              if (schedule[i] === targetState) { foundIndex = i; break; }
            }
          }

          // Check tomorrow if not found
          if (isToday && !isDynamic && foundIndex === -1 && hasTomorrow) {
            const nextDayIndex = tomorrowSch.findIndex(s => s === targetState);
            if (nextDayIndex !== -1) {
              // nextDayIndex is index in tomorrow's array (0..47)
              // Relative to Today 00:00, this is 48 + nextDayIndex
              const absTargetIdx = 48 + nextDayIndex;

              const local = toLocalDisplay(absTargetIdx);
              const dStr = `${local.date.getDate().toString().padStart(2, '0')}.${(local.date.getMonth() + 1).toString().padStart(2, '0')}`;

              return {
                label: currentState === 'off' ? 'Світло буде о:' : 'Вимкнуть о:',
                value: `${local.time} ${dStr}`,
                rawDate: local.date
              };
            }
          }

          if (foundIndex !== -1) {
            const absoluteIdx = startOffsetIdx + foundIndex;
            // absoluteIdx is already the correct continuous index relative to Today 00:00

            const local = toLocalDisplay(absoluteIdx);

            if (local.date.getDate() !== new Date().getDate()) {
              const dStr = `${local.date.getDate().toString().padStart(2, '0')}.${(local.date.getMonth() + 1).toString().padStart(2, '0')}`;
              return {
                label: currentState === 'off' ? 'Світло буде о:' : 'Вимкнуть о:',
                value: `${local.time} ${dStr}`,
                rawDate: local.date
              };
            }
            return {
              label: currentState === 'off' ? 'Світло буде о:' : 'Вимкнуть о:',
              value: local.time,
              rawDate: local.date
            };
          }
          return { label: currentState === 'off' ? 'Світло буде о:' : 'Вимкнуть о:', value: '--:--', rawDate: null };
        };

        // Helper function to calculate countdown
        const getCountdownInfo = () => {
          const nextInfo = getNextChangeInfo();
          if (nextInfo.value === '--:--' || !nextInfo.rawDate) return { label: 'До зміни:', value: '--:--' };

          const diffMs = nextInfo.rawDate - kyivDate;
          if (diffMs < 0) return { label: nextInfo.label.replace(' о:', ''), value: '--:--' };

          const diffMins = Math.floor(diffMs / 60000);
          const hours = Math.floor(diffMins / 60);
          const mins = diffMins % 60;
          const label = nextInfo.label.includes('буде') ? 'До включення:' : 'До вимкнення:';
          return { label, value: hours > 0 ? `${hours}г ${mins}хв` : `${mins} хв` };
        };

        // Render stat block
        const renderStat = (type, labelEl, valueEl) => {
          if (!labelEl || !valueEl) return;

          switch (type) {
            case 'hours_without_light': {
              try {
                let offSlots = 0;
                const hasActualData = isToday && config.actual_outage_calendar_entity && this._actualOutages?.length;

                if (schedule && Array.isArray(schedule)) {
                  schedule.forEach((s, i) => {
                    const absoluteIdx = startOffsetIdx + i;
                    const isPastSlot = absoluteIdx < currentIdx;

                    if (hasActualData && isPastSlot) {
                      // For past slots with calendar, use actual data
                      const actualOff = this._isSlotActuallyOff(absoluteIdx);
                      if (actualOff === true) offSlots++;
                    } else {
                      // For future slots or no calendar, use scheduled
                      if (s === 'off') offSlots++;
                    }
                  });
                }

                const hours = offSlots * 0.5;
                const labelText = isDynamic ? "У найближчі 24г без світла" : "Всього за добу без світла";
                labelEl.innerText = labelText;
                valueEl.innerText = `${hours} год (${Math.round((hours / 24) * 100)}%)`;
              } catch (e) {
                console.error("SvitloLive: Error calc hours_without_light", e);
                valueEl.innerText = "Error";
              }
              break;
            }
            case 'next_change': {
              const info = getNextChangeInfo();
              labelEl.innerText = info.label;
              valueEl.innerText = info.value;
              break;
            }
            case 'countdown': {
              const info = getCountdownInfo();
              labelEl.innerText = info.label;
              valueEl.innerText = info.value;
              break;
            }
            case 'schedule_updated': {
              labelEl.innerText = 'Графік оновлено о:';
              if (config.schedule_entity && hass.states[config.schedule_entity]) {
                const scheduleState = hass.states[config.schedule_entity];
                const lastChanged = new Date(scheduleState.last_changed);
                // lastChanged is already in UTC, browser converts to local automatically
                const h = lastChanged.getHours().toString().padStart(2, '0');
                const m = lastChanged.getMinutes().toString().padStart(2, '0');

                const now = new Date();
                if (lastChanged.getDate() === now.getDate() && lastChanged.getMonth() === now.getMonth()) {
                  valueEl.innerText = `${h}:${m}`;
                } else {
                  valueEl.innerText = `${h}:${m} ${lastChanged.getDate().toString().padStart(2, '0')}.${(lastChanged.getMonth() + 1).toString().padStart(2, '0')}`;
                }
              } else {
                valueEl.innerText = '--:--';
              }
              break;
            }
          }
        };



        renderStat(leftType, this.querySelector('#left-stat-label'), this.querySelector('#left-stat-value'));
        renderStat(rightType, this.querySelector('#right-stat-label'), this.querySelector('#right-stat-value'));
      } // end of if (showStats)
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