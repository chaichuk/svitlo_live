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

          <ha-formfield label="Показувати статистику (години без світла, оновлення графіку)" style="display: flex; align-items: center; margin-top: 8px;">
            <ha-switch id="stats-switch"></ha-switch>
          </ha-formfield>

          <label style="font-weight: bold; font-size: 14px; margin-top: 8px;">Сенсор оновлення графіку (необов'язково):</label>
          <div id="schedule-picker-container" style="min-height: 50px; margin: 4px 0;"></div>
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

    const statsSwitch = this.querySelector("#stats-switch");
    if (statsSwitch) statsSwitch.addEventListener("change", (ev) => this._valueChanged({ target: { configValue: 'show_stats', value: ev.target.checked } }));
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

    const ss = this.querySelector("#stats-switch");
    if (ss) ss.checked = this._config.show_stats !== false; // default true

    if (this._scheduleSelector) {
      this._scheduleSelector.hass = this._hass;
      this._scheduleSelector.value = this._config.schedule_entity || '';
    }
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

            <div id="stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 2px;">
              <div class="stat-item" style="
                  background: linear-gradient(180deg, rgba(127,127,127,0.08) 0%, rgba(127,127,127,0.03) 100%); 
                  border: 1px solid rgba(127,127,127,0.12);
                  padding: 6px 8px; 
                  border-radius: 10px; 
                  display: flex; 
                  flex-direction: column; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 48px; 
                  text-align: center;
                  gap: 2px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05);
              ">
                <div id="total-label" style="font-size: 10px; opacity: 0.5; line-height: 1.3; font-weight: 500;">Всього без світла</div>
                <div id="total-hours" style="font-size: 18px; font-weight: 700; color: var(--primary-text-color); line-height: 1.2; letter-spacing: -0.3px;">-- год</div>
              </div>

              <div class="stat-item" style="
                  background: linear-gradient(180deg, rgba(127,127,127,0.08) 0%, rgba(127,127,127,0.03) 100%); 
                  border: 1px solid rgba(127,127,127,0.12);
                  padding: 6px 8px; 
                  border-radius: 10px; 
                  display: flex; 
                  flex-direction: column; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 48px; 
                  text-align: center;
                  gap: 2px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.05);
              ">
                <div id="schedule-updated-label" style="font-size: 10px; opacity: 0.5; line-height: 1.3; font-weight: 500;">Графік оновлено о:</div>
                <div id="schedule-updated" style="font-size: 18px; font-weight: 700; color: var(--primary-text-color); line-height: 1.2; letter-spacing: -0.3px;">--:--</div>
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

    this._renderWithCurrentDay(hass);
  }

  _renderWithCurrentDay(hass) {
    const config = this.config;
    if (!config || !config.entity || !hass.states[config.entity]) return;

    const stateObj = hass.states[config.entity];
    const attrs = stateObj.attributes;

    const kyivDate = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kyiv" }));
    const currentIdx = kyivDate.getHours() * 2 + (kyivDate.getMinutes() >= 30 ? 1 : 0);
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
    if (titleEl) titleEl.innerText = config.title || (attrs.friendly_name || "Svitlo.live").replace("Svitlo • ", "").replace(" Outages Schedule", "");

    let schedule = [];
    let startOffsetIdx = 0;
    const LOOKBACK_SLOTS = 3;

    if (isDynamic) {
      startOffsetIdx = Math.max(0, currentIdx - LOOKBACK_SLOTS);
      const todayPart = (attrs.today_48half || []).slice(startOffsetIdx);
      const neededForFullDay = 48 - todayPart.length;
      const tomorrowPart = tomorrowSch.slice(0, neededForFullDay);
      schedule = [...todayPart, ...tomorrowPart];
    } else {
      schedule = isToday ? (attrs.today_48half || []) : tomorrowSch;
      startOffsetIdx = 0;
    }

    let isOffCurrent = false;

    if (isToday || isDynamic) {
      const schedState = (attrs.today_48half && attrs.today_48half[currentIdx]) ? attrs.today_48half[currentIdx] : 'unknown';
      isOffCurrent = (schedState === 'off');

      let statusLabel = isOffCurrent ? 'ПЛАНОВЕ ВІДКЛЮЧЕННЯ' : 'Є СВІТЛО';
      let statusColor = isOffCurrent ? '#bf360c' : '#1b5e20';

      const customStatusEntity = config.status_entity ? hass.states[config.status_entity] : null;
      if (customStatusEntity) {
        const cs = customStatusEntity.state;
        const isOffFact = (cs === 'off' || cs === 'Grid OFF' || cs === 'Grid-OFF' || cs === 'unavailable' || cs === '0');

        if (config.use_status_entity) {
          isOffCurrent = isOffFact;
          statusLabel = isOffFact ? 'НЕМАЄ СВІТЛА' : 'Є СВІТЛО';
          statusColor = isOffFact ? '#7f0000' : '#1b5e20';
        } else if (isOffFact && !isOffCurrent) {
          statusLabel = 'НЕМАЄ СВІТЛА (ФАКТ)';
          statusColor = '#7f0000';
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
          historyLabelEl.innerText = `${isOffCurrent ? 'Світло вимкнули о' : 'Світло ввімкнули о'} ${changeTime.getHours().toString().padStart(2, '0')}:${changeTime.getMinutes().toString().padStart(2, '0')}`;
        } else if (schedState !== (isOffCurrent ? 'off' : 'on')) {
          historyLabelEl.innerText = isOffCurrent ? `Відключено (за фактом)` : `Світло є (поза графіком)`;
        } else {
          let chIdx = currentIdx;
          const targetState = isOffCurrent ? 'off' : 'on';
          while (chIdx > 0 && fullToday[chIdx - 1] === targetState) chIdx--;
          const chH = Math.floor(chIdx / 2);
          const chM = chIdx % 2 === 0 ? 0 : 30;
          changeTime = new Date(kyivDate);
          changeTime.setHours(chH, chM, 0, 0);
          historyLabelEl.innerText = `${isOffCurrent ? 'Світло вимкнули о' : 'Світло ввімкнули о'} ${chH.toString().padStart(2, '0')}:${(chIdx % 2 === 0 ? "00" : "30")}`;
        }

        // Show power icon when power is off
        if (powerIcon) {
          powerIcon.style.display = isOffCurrent ? 'inline' : 'none';
        }

        // Duration timer
        if (durationLabel && changeTime && isOffCurrent) {
          durationLabel.style.display = 'block';

          const updateDuration = () => {
            const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Kyiv" }));
            const diffMs = now - changeTime;
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

    const scheduleKey = `${isDynamic ? 'dyn' : this._selectedDay}_${JSON.stringify(schedule)}_${config.show_history}_${startOffsetIdx}`;

    if (timelineEl && rulerEl && this._lastRenderedKey !== scheduleKey) {
      this._lastRenderedKey = scheduleKey;

      timelineEl.querySelectorAll('.timeline-block').forEach(b => b.remove());
      timelineEl.querySelectorAll('.midnight-marker').forEach(b => b.remove());
      rulerEl.innerHTML = '';

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
        const distToLast = Math.abs(pos - lastOccupiedPos);

        // Don't check collision for Start (always 0)
        // For others, if dist < 7% (approx 1.5h), drop to level 1
        // Unless it's shifted (then we assume level 0 is intended)

        if (type !== 'start' && !customShift && pos !== 0 && pos !== 100 && distToLast < 7) {
          currentLevel = (currentLevel === 0) ? 1 : 0;
        } else {
          currentLevel = 0;
        }

        // Safety for end label
        if (type === 'end' && distToLast < 7) {
          currentLevel = 1;
        }

        span.style.top = currentLevel === 0 ? '0' : '14px';
        rulerEl.appendChild(span);
        lastOccupiedPos = pos;
        return span;
      };

      // 2. ADD START LABEL (Conditionally)
      const startIdx = startOffsetIdx;
      const startH = Math.floor(startIdx / 2);
      const startM = startIdx % 2 === 0 ? '00' : '30';

      let startLabelVisible = false;
      // HIDE if first change is <= 6 slots (3 hours) from start
      if (firstChangeIdx === -1 || firstChangeIdx > 6) {
        lastLabelElement = addLabel(`${startH.toString().padStart(2, '0')}:${startM}`, 0, 'start');
        isPrevStart = true;
        startLabelVisible = true;
        lastLabelIndex = -1; // logical start index
      } else {
        // If Start is hidden, reset trackers so first change behaves as "first"
        lastLabelIndex = -100;
        isPrevStart = false;
      }

      // 3. DRAW BLOCKS & CHANGE LABELS
      schedule.forEach((state, i) => {
        const b = document.createElement('div');
        b.className = 'timeline-block';
        b.style.flex = '1';
        b.style.height = '100%';
        b.style.background = state === 'off' ? '#7f0000' : '#1b5e20';
        b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none';
        timelineEl.appendChild(b);

        // Midnight Marker
        const actualIdx = startOffsetIdx + i;
        if (actualIdx > 0 && actualIdx % 48 === 0) {
          const mLine = document.createElement('div');
          mLine.className = 'midnight-marker';
          mLine.style.position = 'absolute';
          mLine.style.left = `${(i / totalSlots) * 100}%`;
          mLine.style.top = '0';
          mLine.style.bottom = '0';
          mLine.style.width = '4px';
          mLine.style.background = 'rgba(0,0,0,0.7)';
          mLine.style.zIndex = '20';
          mLine.style.boxShadow = '0 0 3px rgba(0,0,0,0.5)';
          mLine.style.pointerEvents = 'none';
          mLine.style.transform = 'translateX(-50%)';
          timelineEl.appendChild(mLine);
        }

        // Add time label at change points
        if (i > 0 && schedule[i] !== schedule[i - 1]) {
          const normalizedIdx = actualIdx % 48;
          const h = Math.floor(normalizedIdx / 2);
          const m = normalizedIdx % 2 === 0 ? '00' : '30';
          const pos = (i / totalSlots) * 100;

          let shiftCurrent = null;

          // Only calculate Spread/Gap if we have a visible previous label
          if (lastLabelIndex !== -100) {
            let slotsGap;
            if (isPrevStart) slotsGap = i; // Distance from 0
            else slotsGap = i - lastLabelIndex;

            // SPREAD LOGIC: spread labels when they are close
            // <= 3 slots (1.5 hours): aggressive spread
            // 4-6 slots (2-3 hours): moderate spread
            if (slotsGap >= 2 && slotsGap <= 3) {
              // 1-1.5 hour gap - spread aggressively
              if (isPrevStart) {
                shiftCurrent = '-15%';
              } else {
                if (lastLabelElement) {
                  lastLabelElement.style.transform = 'translateX(-85%)';
                  lastLabelElement.style.top = '0';
                }
                shiftCurrent = '-15%';
              }
            } else if (slotsGap >= 4 && slotsGap <= 6) {
              // 2-3 hour gap - spread moderately
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

          const newLabel = addLabel(`${h.toString().padStart(2, '0')}:${m}`, pos, 'normal', shiftCurrent);
          if (shiftCurrent) newLabel.style.top = '0';

          lastLabelElement = newLabel;
          lastLabelIndex = i;
          isPrevStart = false;
        }
      });

      // 4. ADD END LABEL (Conditionally)
      const endIdx = (startOffsetIdx + totalSlots) % 48;
      const endH = Math.floor(endIdx / 2);
      const endM = endIdx % 2 === 0 ? '00' : '30';

      // Check distance from last change to end
      const distToEnd = totalSlots - lastLabelIndex;

      // HIDE if last change is <= 6 slots (3 hours) from end
      // Note: check lastChangeIdx != -1 to ensure there are changes
      if (lastChangeIdx === -1 || (totalSlots - lastChangeIdx) > 6) {

        // Apply spread logic for close labels
        if (distToEnd >= 2 && distToEnd <= 3 && lastLabelElement) {
          // 1-1.5 hour gap
          lastLabelElement.style.transform = 'translateX(-85%)';
          lastLabelElement.style.top = '0';
        } else if (distToEnd >= 4 && distToEnd <= 6 && lastLabelElement) {
          // 2-3 hour gap
          lastLabelElement.style.transform = 'translateX(-70%)';
          lastLabelElement.style.top = '0';
        }

        addLabel(`${endH.toString().padStart(2, '0')}:${endM}`, 100, 'end');
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
              hb.style.background = state === 'off' ? '#7f0000' : '#1b5e20';
              hb.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.05)' : 'none';
              row.appendChild(hb);
            });
            historyTimelineEl.appendChild(row);
          });
        } else {
          historyTimelineEl.style.display = 'none';
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
      const offSlots = schedule.filter(s => s === 'off').length;
      const hours = offSlots * 0.5;
      const thv = this.querySelector('#total-hours');
      if (thv) thv.innerText = `${hours} год (${Math.round((hours / 24) * 100)}%)`;

      const totalLabel = this.querySelector('#total-label');
      if (totalLabel) totalLabel.innerText = isDynamic ? "У найближчі 24г" : "Всього за добу";

      // Schedule updated display
      const scheduleUpdatedEl = this.querySelector('#schedule-updated');
      if (scheduleUpdatedEl && config.schedule_entity && hass.states[config.schedule_entity]) {
        const scheduleState = hass.states[config.schedule_entity];
        const lastChanged = new Date(scheduleState.last_changed);
        const kyivTime = new Date(lastChanged.toLocaleString("en-US", { timeZone: "Europe/Kyiv" }));
        const hours = kyivTime.getHours().toString().padStart(2, '0');
        const mins = kyivTime.getMinutes().toString().padStart(2, '0');
        const day = kyivTime.getDate().toString().padStart(2, '0');
        const month = (kyivTime.getMonth() + 1).toString().padStart(2, '0');

        // Check if it's today
        if (kyivTime.getDate() === kyivDate.getDate() && kyivTime.getMonth() === kyivDate.getMonth()) {
          scheduleUpdatedEl.innerText = `${hours}:${mins}`;
        } else {
          scheduleUpdatedEl.innerText = `${hours}:${mins} ${day}.${month}`;
        }
      } else if (scheduleUpdatedEl) {
        scheduleUpdatedEl.innerText = '--:--';
      }
    } // end of if (showStats)
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