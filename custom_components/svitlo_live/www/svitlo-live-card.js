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

    // 1. Фільтрація: знаходимо календарі
    const entities = Object.keys(this._hass.states).filter((eid) => {
      return eid.startsWith("calendar.svitlo_");
    });

    // 2. Створюємо каркас HTML тільки один раз
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

          <label style="font-weight: bold; font-size: 14px; margin-top: 8px;">Власний сенсор статусу (напр. розетка або input_boolean):</label>
          <div id="status-picker-container" style="min-height: 50px; margin: 4px 0;">
            <div style="font-size: 12px; opacity: 0.5; padding: 10px; border: 1px dashed rgba(127,127,127,0.3); border-radius: 8px;">
              Завантаження вибору сутностей...
            </div>
          </div>

          <ha-formfield label="Використовувати цей сенсор як основний пріоритет" style="display: flex; align-items: center;">
            <ha-switch id="priority-switch"></ha-switch>
          </ha-formfield>

          <p style="font-size: 12px; opacity: 0.8; margin-top: 4px;">
            Якщо активовано, банер «Є СВІТЛО / НЕМАЄ СВІТЛА» і час будуть базуватися <b>тільки</b> на вашому фізичному сенсорі, ігноруючи графік.
          </p>
        </div>
      `;

      this._setupPicker();
      this._setupEventListeners();
      this._initialized = true;
    }

    // 3. Динамічно оновлюємо список опцій
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

      if (this._config.entity) {
        selector.value = this._config.entity;
      }
    }

    this._updateProperties();
  }

  _setupPicker() {
    const container = this.querySelector("#status-picker-container");
    if (!container) return;

    // Створюємо нативний ha-selector
    const selector = document.createElement("ha-selector");
    selector.id = "status-selector";
    selector.style.width = "100%";
    selector.style.display = "block";

    // Конфігурація для вибору ентіті
    selector.selector = {
      entity: {
        domain: ['binary_sensor', 'sensor', 'switch', 'input_boolean']
      }
    };

    selector.addEventListener("value-changed", (ev) => {
      this._valueChanged({ target: { configValue: 'status_entity', value: ev.detail.value } });
    });

    container.innerHTML = "";
    container.appendChild(selector);
  }

  _setupEventListeners() {
    const titleInput = this.querySelector("#title-input");
    if (titleInput) {
      titleInput.addEventListener("input", (ev) => {
        this._valueChanged({ target: { configValue: 'title', value: ev.target.value } });
      });
    }

    const selector = this.querySelector("#entity-selector");
    if (selector) {
      selector.addEventListener("change", (ev) => {
        this._valueChanged({ target: { configValue: 'entity', value: ev.target.value } });
      });
    }

    const statusSelector = this.querySelector("#status-selector");
    if (statusSelector) {
      statusSelector.addEventListener("value-changed", (ev) => {
        this._valueChanged({ target: { configValue: 'status_entity', value: ev.detail.value } });
      });
    }

    const prioritySwitch = this.querySelector("#priority-switch");
    if (prioritySwitch) {
      prioritySwitch.addEventListener("change", (ev) => {
        this._valueChanged({ target: { configValue: 'use_status_entity', value: ev.target.checked } });
      });
    }
  }

  _updateProperties() {
    if (!this._hass || !this._config) return;

    const titleInput = this.querySelector("#title-input");
    if (titleInput) {
      titleInput.value = this._config.title || '';
    }

    const statusSelector = this.querySelector("#status-selector");
    if (statusSelector) {
      statusSelector.hass = this._hass;
      statusSelector.value = this._config.status_entity || '';
    }

    const prioritySwitch = this.querySelector("#priority-switch");
    if (prioritySwitch) {
      prioritySwitch.checked = this._config.use_status_entity || false;
    }
  }

  _valueChanged(ev) {
    if (!this._config || !this._hass) return;
    const target = ev.target;
    if (this._config[target.configValue] === target.value) return;

    const newConfig = { ...this._config, [target.configValue]: target.value };
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    }));
  }
}

customElements.define('svitlo-live-card-editor', SvitloLiveCardEditor);

// Svitlo Live Card
class SvitloLiveCard extends HTMLElement {
  constructor() {
    super();
    this._selectedDay = 'today';
  }

  set hass(hass) {
    if (!this.content) {
      this.innerHTML = `
        <ha-card>
          <div id="container" style="padding: 16px;">
            <div id="header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
              <div style="display: flex; flex-direction: column; gap: 2px; max-width: 60%;">
                <div id="title" style="font-size: 18px; font-weight: bold; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Svitlo.live</div>
                <div id="history-label" style="font-size: 11px; opacity: 0.6; white-space: nowrap; height: 1.2em;"></div>
              </div>
              <div id="status" style="font-size: 13px; padding: 4px 10px; border-radius: 4px; font-weight: bold; white-space: nowrap; align-self: center;"></div>
            </div>

            <div id="day-switcher" style="display: flex; gap: 4px; border-radius: 6px; background: rgba(127,127,127,0.1); padding: 2px; margin-bottom: 12px; font-size: 11px; width: fit-content;">
              <div class="day-tab active" data-day="today" style="padding: 4px 10px; border-radius: 4px; cursor: pointer; transition: 0.2s;">Сьогодні</div>
              <div class="day-tab" data-day="tomorrow" id="tomorrow-tab" style="padding: 4px 10px; border-radius: 4px; cursor: pointer; transition: 0.2s; display: none;">Завтра</div>
            </div>

            <div id="emergency-banner" style="display: none; background: #ff9800; color: #fff; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-bottom: 8px; text-align: center; animation: pulse 2s infinite; border: 1px solid rgba(255,255,255,0.2);">
              📢 УВАГА! ДІЮТЬ ЕКСТРЕННІ ВІДКЛЮЧЕННЯ!
            </div>
            
            <div style="margin-bottom: 24px;">
              <div id="timeline" style="height: 36px; display: flex; border-radius: 6px; overflow: hidden; position: relative; background: #eee; border-left: 3px solid rgba(255,255,255,0.8); border-right: 3px solid rgba(255,255,255,0.8);">
                <div id="now-marker" style="position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 4px rgba(0,0,0,0.5); z-index: 2;"></div>
              </div>
              <div id="ruler" style="height: 16px; position: relative; font-size: 10px; opacity: 0.7; margin-top: 4px;">
              </div>
            </div>

            <div id="stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div class="stat-item" style="background: rgba(127,127,127,0.1); padding: 10px; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 60px; box-sizing: border-box; text-align: center;">
                <div id="total-label" style="font-size: 11px; opacity: 0.6; margin-bottom: 8px; line-height: 1.1;">Всього без світла</div>
                <div id="total-hours" style="font-size: 16px; font-weight: bold; line-height: 1.1;">- год</div>
              </div>
              <div class="stat-item" style="background: rgba(127,127,127,0.1); padding: 10px; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; min-height: 60px; box-sizing: border-box; text-align: center;">
                <div id="next-change-label" style="font-size: 11px; opacity: 0.6; margin-bottom: 8px; line-height: 1.1;">Наступна зміна</div>
                <div id="next-change" style="font-size: 16px; font-weight: bold; line-height: 1.1;">-:-</div>
              </div>
            </div>
          </div>
          <style>
            .day-tab.active { background: var(--primary-color, #03a9f4); color: #fff; }
            .day-tab:not(.active):hover { background: rgba(127,127,127,0.2); }
            @keyframes pulse {
              0% { opacity: 1; transform: scale(1); }
              50% { opacity: 0.85; transform: scale(0.995); }
              100% { opacity: 1; transform: scale(1); }
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
    const isToday = this._selectedDay === 'today';

    // Tabs update
    const tabs = this.querySelectorAll('.day-tab');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.day === this._selectedDay));

    // Show switcher only if tomorrow data exists
    const daySwitcher = this.querySelector('#day-switcher');
    const tomorrowSch = attrs.tomorrow_48half || [];
    const hasTomorrow = tomorrowSch.length === 48;

    if (daySwitcher) {
      daySwitcher.style.display = hasTomorrow ? 'flex' : 'none';
    }

    const tomorrowTab = this.querySelector('#tomorrow-tab');
    if (tomorrowTab) {
      tomorrowTab.style.display = hasTomorrow ? 'block' : 'none';
    }

    // Header Title
    const titleEl = this.querySelector('#title');
    if (titleEl) {
      titleEl.innerText = config.title || (attrs.friendly_name || "Svitlo.live").replace("Svitlo • ", "").replace(" Outages Schedule", "");
    }

    // Schedule & Status
    const schedule = isToday ? (attrs.today_48half || []) : tomorrowSch;
    const historyLabelEl = this.querySelector('#history-label');
    const statusEl = this.querySelector('#status');
    const eb = this.querySelector('#emergency-banner');

    if (isToday) {
      // Status Today
      let isOffCurrent = attrs.now_status === 'off';
      let statusLabel = isOffCurrent ? 'ПЛАНОВЕ ВІДКЛЮЧЕННЯ' : 'Є СВІТЛО';
      let statusColor = isOffCurrent ? '#ff9800' : '#66bb6a';

      // Custom sensor override
      const statusEntityId = config.status_entity;
      const customStatusEntity = statusEntityId ? hass.states[statusEntityId] : null;
      const usePhysicalPriority = config.use_status_entity && customStatusEntity;

      if (customStatusEntity) {
        const cs = customStatusEntity.state;
        const isOffFact = (cs === 'off' || cs === 'Grid OFF' || cs === 'Grid-OFF' || cs === 'unavailable' || cs === '0');
        const isOnFact = (cs === 'on' || cs === 'Grid ON' || cs === 'Grid-ON' || cs === 'running' || cs === '1');

        if (usePhysicalPriority) {
          if (isOffFact) {
            isOffCurrent = true;
            statusLabel = 'НЕМАЄ СВІТЛА';
            statusColor = '#ef5350'; // Red for fact
          } else {
            isOffCurrent = false;
            statusLabel = 'Є СВІТЛО';
            statusColor = '#66bb6a'; // Green for fact
          }
        } else {
          // Legacy behavior: only highlight mismatch if not prioritized
          if (isOffFact && !isOffCurrent) {
            statusLabel = 'НЕМАЄ СВІТЛА (ФАКТ)';
            statusColor = '#ef5350';
          }
        }
      }

      if (statusEl) {
        statusEl.innerText = statusLabel;
        statusEl.style.background = statusColor;
        statusEl.style.color = '#fff';
      }

      // History Label Logic
      if (historyLabelEl && schedule.length === 48) {
        const kyivTime = new Date().toLocaleString("en-US", { timeZone: "Europe/Kyiv" });
        const kyivDate = new Date(kyivTime);
        const hours = kyivDate.getHours();
        const minutes = kyivDate.getMinutes();
        const currentIndex = hours * 2 + (minutes >= 30 ? 1 : 0);

        const scheduleState = schedule[currentIndex];
        const actualState = isOffCurrent ? 'off' : 'on';
        const isFactMismatch = scheduleState !== actualState;

        if (usePhysicalPriority) {
          // Use last_changed from custom sensor
          const lastChanged = new Date(customStatusEntity.last_changed);
          const hh = lastChanged.getHours().toString().padStart(2, '0');
          const mm = lastChanged.getMinutes().toString().padStart(2, '0');
          historyLabelEl.innerText = isOffCurrent
            ? `Світла немає з ${hh}:${mm}`
            : `Світло ввімкнули о ${hh}:${mm}`;
        } else if (isFactMismatch) {
          historyLabelEl.innerText = isOffCurrent
            ? `Відключено (за фактом)`
            : `Світло є (поза графіком)`;
        } else {
          let chIdx = currentIndex;
          while (chIdx > 0 && schedule[chIdx - 1] === actualState) chIdx--;
          const time = `${Math.floor(chIdx / 2).toString().padStart(2, '0')}:${(chIdx % 2 === 0 ? "00" : "30")}`;
          historyLabelEl.innerText = isOffCurrent
            ? `Світла немає з ${time}`
            : `Світло ввімкнули о ${time}`;
        }
      }

      // Emergency Banner (Today ONLY)
      let isEmergency = false;
      const region = attrs.region;
      const queue = attrs.queue;
      if (region && queue) {
        const emEid = Object.keys(hass.states).find(eid => {
          const s = hass.states[eid];
          return eid.includes('emergency') && s.attributes && s.attributes.region === region && s.attributes.queue === queue;
        });
        if (emEid) isEmergency = hass.states[emEid].state === 'on';
      }
      if (eb) eb.style.display = isEmergency ? 'block' : 'none';

    } else {
      // Status Tomorrow
      if (statusEl) {
        statusEl.innerText = 'ГРАФІК НА ЗАВТРА';
        statusEl.style.background = 'rgba(127,127,127,0.2)';
        statusEl.style.color = 'inherit';
      }
      if (historyLabelEl) historyLabelEl.innerText = (attrs.tomorrow_date || "");
      if (eb) eb.style.display = 'none';
    }

    // Marker (using Kyiv time)
    const nowMarker = this.querySelector('#now-marker');
    if (nowMarker) {
      if (isToday) {
        const kyivTime = new Date().toLocaleString("en-US", { timeZone: "Europe/Kyiv" });
        const kyivDate = new Date(kyivTime);
        const minsSinceMidnight = kyivDate.getHours() * 60 + kyivDate.getMinutes();
        nowMarker.style.display = 'block';
        nowMarker.style.left = `${(minsSinceMidnight / 1440) * 100}%`;
      } else {
        nowMarker.style.display = 'none';
      }
    }

    // Timeline & Ruler
    const timelineEl = this.querySelector('#timeline');
    const rulerEl = this.querySelector('#ruler');
    const scheduleKey = `${this._selectedDay}_${JSON.stringify(schedule)}`;

    if (timelineEl && rulerEl && this._lastRenderedKey !== scheduleKey) {
      this._lastRenderedKey = scheduleKey;

      // Clear
      timelineEl.querySelectorAll('.block').forEach(b => b.remove());
      rulerEl.innerHTML = '';

      // Determine transitions
      const transitions = [];
      schedule.forEach((state, i) => {
        if (i > 0 && schedule[i] !== schedule[i - 1]) {
          transitions.push(i);
        }
      });

      // Add "00" start label if no transitions nearby
      if (transitions.length === 0 || transitions[0] > 2) {
        const startLabel = document.createElement('span');
        startLabel.innerText = '00';
        startLabel.style.position = 'absolute';
        startLabel.style.left = '0';
        rulerEl.appendChild(startLabel);
      }

      // Add "00" end label if no transitions nearby
      if (transitions.length === 0 || transitions[transitions.length - 1] < 46) {
        const endLabel = document.createElement('span');
        endLabel.innerText = '00';
        endLabel.style.position = 'absolute';
        endLabel.style.right = '0';
        rulerEl.appendChild(endLabel);
      }

      schedule.forEach((state, i) => {
        // Timeline block
        const b = document.createElement('div');
        b.className = 'block';
        b.style.flex = '1';
        b.style.height = '100%';
        b.style.background = state === 'off' ? '#ef5350' : '#66bb6a';
        b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';
        timelineEl.appendChild(b);

        // Dynamic Ruler Labels at transitions
        if (i > 0 && schedule[i] !== schedule[i - 1]) {
          const hh = Math.floor(i / 2).toString().padStart(2, '0');
          const mm = i % 2 === 0 ? '00' : '30';
          const label = document.createElement('span');
          label.innerText = `${hh}:${mm}`;
          label.style.position = 'absolute';
          label.style.left = `${(i / 48) * 100}%`;
          label.style.transform = 'translateX(-50%)';
          rulerEl.appendChild(label);
        }
      });
    }

    // Stats
    const hours = isToday ? (attrs.today_outage_hours || 0) : (attrs.tomorrow_outage_hours || 0);
    const percentage = Math.round((hours / 24) * 100);
    const thv = this.querySelector('#total-hours');
    if (thv) thv.innerText = `${hours} год (${percentage}%)`;

    const ncl = this.querySelector('#next-change-label');
    const ncv = this.querySelector('#next-change');

    if (isToday) {
      if (ncl) ncl.innerText = (attrs.now_status === 'off') ? 'Світло буде о:' : 'Світло вимкнуть о:';

      const curStatus = attrs.now_status;
      const nextIso = curStatus === 'off' ? attrs.next_on_at : attrs.next_off_at;

      let displayValue = '-:-';
      if (nextIso) {
        const nextDate = new Date(nextIso);
        const todayDate = new Date();

        const isTomorrow = nextDate.getDate() !== todayDate.getDate() || nextDate.getMonth() !== todayDate.getMonth();

        if (isTomorrow) {
          if (hasTomorrow) {
            // Format: 05.02 00:00
            const d = nextDate.getDate().toString().padStart(2, '0');
            const m = (nextDate.getMonth() + 1).toString().padStart(2, '0');
            const hh = nextDate.getHours().toString().padStart(2, '0');
            const mm = nextDate.getMinutes().toString().padStart(2, '0');
            displayValue = `${d}.${m} ${hh}:${mm}`;
          } else {
            displayValue = '--:--';
          }
        } else {
          const hh = nextDate.getHours().toString().padStart(2, '0');
          const mm = nextDate.getMinutes().toString().padStart(2, '0');
          displayValue = `${hh}:${mm}`;
        }
      }
      if (ncv) ncv.innerText = displayValue;
    } else {
      if (ncl) ncl.innerText = 'Перша зміна:';
      if (ncv && schedule.length === 48) {
        const firstChangeIdx = schedule.findIndex(s => s !== schedule[0]);
        if (firstChangeIdx === -1) ncv.innerText = "Без змін";
        else ncv.innerText = `${Math.floor(firstChangeIdx / 2).toString().padStart(2, '0')}:${(firstChangeIdx % 2 === 0 ? "00" : "30")}`;
      }
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

// Register in custom cards list
window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === "svitlo-live-card")) {
  window.customCards.push({ type: "svitlo-live-card", name: "Svitlo Live Card", preview: true, description: "Professional Svitlo.live dashboard" });
}