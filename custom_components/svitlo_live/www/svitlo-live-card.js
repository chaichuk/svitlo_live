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
        <ha-card style="overflow: hidden;">
          <div id="container" style="padding: 16px;">
            
            <div id="header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div style="display: flex; flex-direction: column; gap: 2px; max-width: 60%;">
                <div id="title" style="font-size: 18px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Svitlo.live</div>
                <div id="history-label" style="font-size: 11px; opacity: 0.6; white-space: nowrap; height: 1.2em;"></div>
              </div>
              <div id="status" style="font-size: 13px; padding: 4px 10px; border-radius: 4px; font-weight: bold; white-space: nowrap; align-self: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
            </div>

            <div id="day-switcher" style="display: flex; gap: 4px; border-radius: 6px; background: rgba(127,127,127,0.1); padding: 2px; margin-bottom: 12px; font-size: 11px; width: fit-content;">
              <div class="day-tab active" data-day="today" style="padding: 4px 10px; border-radius: 4px; cursor: pointer; transition: 0.2s;">Сьогодні</div>
              <div class="day-tab" data-day="tomorrow" id="tomorrow-tab" style="padding: 4px 10px; border-radius: 4px; cursor: pointer; transition: 0.2s; display: none;">Завтра</div>
            </div>

            <div id="emergency-banner" style="display: none; background: #bf360c; color: #fff; padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 12px; text-align: center; animation: pulse 2s infinite; border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 5px rgba(191, 54, 12, 0.4);">
              📢 УВАГА! ДІЮТЬ ЕКСТРЕНІ ВІДКЛЮЧЕННЯ!
            </div>
            
            <div style="margin-bottom: 4px;">
              <div id="timeline" style="
                  height: 38px; 
                  display: flex; 
                  border-radius: 8px; 
                  overflow: hidden; 
                  position: relative; 
                  background: #1a1a1a; 
                  border: 1px solid rgba(255,255,255,0.05);
                  box-shadow: inset 0 2px 5px rgba(0,0,0,0.5); 
                  z-index: 5;
              ">
                <div id="now-marker" style="
                    position: absolute; 
                    top: 0; bottom: 0; 
                    width: 2px; 
                    background: #fff; 
                    box-shadow: 0 0 8px rgba(255,255,255,0.8), 2px 0 4px rgba(0,0,0,0.5); 
                    z-index: 10;
                "></div>
              </div>
              
              <div id="history-timeline" style="
                  display: none; 
                  flex-direction: column; 
                  margin-top: 2px; 
              "></div>
              
              <div id="ruler" style="height: 32px; position: relative; font-size: 10px; opacity: 0.6; margin-top: 2px; font-family: monospace;">
              </div>
            </div>

            <div id="stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div class="stat-item" style="
                  background: rgba(127,127,127,0.05); 
                  border: 1px solid rgba(127,127,127,0.1);
                  padding: 6px 8px; 
                  border-radius: 8px; 
                  display: flex; 
                  flex-direction: column; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 48px; 
                  text-align: center;
              ">
                <div id="total-label" style="font-size: 11px; opacity: 0.6; margin-bottom: 2px; line-height: 1.1;">Всього без світла</div>
                <div id="total-hours" style="font-size: 16px; font-weight: bold; color: var(--primary-text-color); line-height: 1.1;">-- год</div>
              </div>

              <div class="stat-item" style="
                  background: rgba(127,127,127,0.05); 
                  border: 1px solid rgba(127,127,127,0.1);
                  padding: 6px 8px; 
                  border-radius: 8px; 
                  display: flex; 
                  flex-direction: column; 
                  justify-content: center; 
                  align-items: center; 
                  min-height: 48px; 
                  text-align: center;
              ">
                <div id="next-change-label" style="font-size: 11px; opacity: 0.6; margin-bottom: 2px; line-height: 1.1;">Наступна зміна</div>
                <div id="next-change" style="font-size: 16px; font-weight: bold; color: var(--primary-text-color); line-height: 1.1;">--:--</div>
              </div>
            </div>

          </div>
          <style>
            .day-tab.active { background: var(--primary-color, #03a9f4); color: #fff; }
            .day-tab:not(.active):hover { background: rgba(127,127,127,0.2); }
            @keyframes pulse {
              0% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.9; transform: scale(0.99); }
              100% { opacity: 1; transform: scale(1); }
            }
            .timeline-block {
               position: relative;
            }
            .timeline-block::after {
               content: "";
               position: absolute;
               top: 0; left: 0; right: 0; bottom: 0;
               background: linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0) 100%);
               pointer-events: none;
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

      if (historyLabelEl && schedule.length >= 1) {
        const fullToday = attrs.today_48half || [];
        if (config.use_status_entity && customStatusEntity) {
          const lc = new Date(customStatusEntity.last_changed);
          historyLabelEl.innerText = `${isOffCurrent ? 'Світла немає з' : 'Світло ввімкнули о'} ${lc.getHours().toString().padStart(2, '0')}:${lc.getMinutes().toString().padStart(2, '0')}`;
        } else if (schedState !== (isOffCurrent ? 'off' : 'on')) {
          historyLabelEl.innerText = isOffCurrent ? `Відключено (за фактом)` : `Світло є (поза графіком)`;
        } else {
          let chIdx = currentIdx;
          const targetState = isOffCurrent ? 'off' : 'on';
          while (chIdx > 0 && fullToday[chIdx - 1] === targetState) chIdx--;
          historyLabelEl.innerText = `${isOffCurrent ? 'Світла немає з' : 'Світло ввімкнули о'} ${Math.floor(chIdx / 2).toString().padStart(2, '0')}:${(chIdx % 2 === 0 ? "00" : "30")}`;
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
      // HIDE if first change is <= 4 slots (2 hours) from start
      if (firstChangeIdx === -1 || firstChangeIdx > 4) {
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

            // SPREAD LOGIC (2 HOURS = 4 SLOTS)
            if (slotsGap === 4) {
              if (isPrevStart) {
                // Don't move Start. Move Current Right.
                shiftCurrent = '-25%';
              } else {
                // Move Prev Left, Current Right
                if (lastLabelElement) {
                  lastLabelElement.style.transform = 'translateX(-75%)';
                  lastLabelElement.style.top = '0';
                }
                shiftCurrent = '-25%';
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

      // HIDE if last change is <= 4 slots (2 hours) from end
      // Note: check lastChangeIdx != -1 to ensure there are changes
      if (lastChangeIdx === -1 || (totalSlots - lastChangeIdx) > 4) {

        // Apply spread logic if exactly 2 hours from last visible label
        if (distToEnd === 4 && lastLabelElement) {
          lastLabelElement.style.transform = 'translateX(-75%)';
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

    const offSlots = schedule.filter(s => s === 'off').length;
    const hours = offSlots * 0.5;
    const thv = this.querySelector('#total-hours');
    if (thv) thv.innerText = `${hours} год (${Math.round((hours / 24) * 100)}%)`;

    const totalLabel = this.querySelector('#total-label');
    if (totalLabel) totalLabel.innerText = isDynamic ? "У найближчі 24г" : "Всього за добу";

    const ncl = this.querySelector('#next-change-label'), ncv = this.querySelector('#next-change');

    let currentState, targetState;
    let searchStartIndex = 0;
    let baseDate = new Date(kyivDate);

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
      baseDate.setDate(baseDate.getDate() + 1);
      currentState = schedule[0];
      targetState = (currentState === 'off') ? 'on' : 'off';
      searchStartIndex = 0;
    }

    if (ncl && currentState) ncl.innerText = (currentState === 'off') ? 'Світло буде о:' : 'Світло вимкнуть о:';

    let foundIndex = -1;
    if (currentState) {
      for (let i = searchStartIndex; i < schedule.length; i++) {
        if (schedule[i] === targetState) { foundIndex = i; break; }
      }
    }

    let foundInTomorrowExtension = false;
    let extTimeStr = "";

    if (isToday && !isDynamic && foundIndex === -1 && hasTomorrow) {
      const nextDayIndex = tomorrowSch.findIndex(s => s === targetState);
      if (nextDayIndex !== -1) {
        foundInTomorrowExtension = true;
        const tD = new Date(kyivDate.getTime() + 86400000);
        const dStr = tD.getDate().toString().padStart(2, '0');
        const mStr = (tD.getMonth() + 1).toString().padStart(2, '0');
        const yStr = tD.getFullYear();
        const time = `${Math.floor(nextDayIndex / 2).toString().padStart(2, '0')}:${nextDayIndex % 2 === 0 ? "00" : "30"}`;
        extTimeStr = `${time} ${dStr}.${mStr}.${yStr}`;
      }
    }

    if (foundInTomorrowExtension) {
      if (ncv) ncv.innerText = extTimeStr;
    } else if (foundIndex !== -1) {
      const absoluteIdx = startOffsetIdx + foundIndex;
      const time = new Date(baseDate);
      time.setHours(0, 0, 0, 0);
      time.setMinutes(absoluteIdx * 30);

      const dStr = time.getDate().toString().padStart(2, '0');
      const mStr = (time.getMonth() + 1).toString().padStart(2, '0');
      const yStr = time.getFullYear();
      const tStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

      if (time.getDate() !== kyivDate.getDate()) {
        if (ncv) ncv.innerText = `${tStr} ${dStr}.${mStr}.${yStr}`;
      } else {
        if (ncv) ncv.innerText = tStr;
      }
    } else {
      if (ncv) ncv.innerText = '--:--';
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