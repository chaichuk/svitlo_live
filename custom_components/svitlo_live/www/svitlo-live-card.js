
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

    // Розширена фільтрація: шукаємо за префіксом або за наявністю атрибута графіка
    const entities = Object.keys(this._hass.states).filter((eid) => {
      const state = this._hass.states[eid];
      const isSvitlo = eid.includes("svitlo") && (eid.startsWith("calendar.") || eid.startsWith("binary_sensor."));
      const hasSchedule = state && state.attributes && state.attributes.today_48half !== undefined;
      return isSvitlo || hasSchedule;
    });

    const totalCount = Object.keys(this._hass.states).length;

    this.innerHTML = `
      <div style="padding: 10px; display: flex; flex-direction: column; gap: 12px; color: var(--primary-text-color);">
        <ha-textfield
            id="title-input"
            label="Назва картки (необов'язково)"
            value="${this._config.title || ''}"
            configValue="title"
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
          <option value="" ${!this._config.entity ? "selected" : ""}>--- Оберіть зі списку (${entities.length} знайдено) ---</option>
          ${entities.sort().map(eid => {
      const state = this._hass.states[eid];
      const friendlyName = state.attributes.friendly_name || eid;
      return `<option value="${eid}" ${this._config.entity === eid ? "selected" : ""}>${friendlyName}</option>`;
    }).join('')}
        </select>
        <p style="font-size: 12px; opacity: 0.8;">
          Оберіть вашу чергу. Картка автоматично знайде графік та статус екстрених відключень.
        </p>
        <p style="font-size: 10px; opacity: 0.5;">
          Система бачить ${totalCount} сутностей загалом. Якщо вашої черги немає, перевірте, чи встановлена інтеграція.
        </p>
      </div>
    `;

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

            <div id="emergency-banner" style="display: none; background: #ef5350; color: #fff; padding: 6px 10px; border-radius: 4px; font-size: 13px; font-weight: bold; margin-bottom: 12px; text-align: center; animation: pulse 2s infinite; border: 1px solid rgba(255,255,255,0.2);">
              📢 УВАГА! ДІЮТЬ ЕКСТРЕННІ ВІДКЛЮЧЕННЯ!
            </div>
            
            <div style="margin-bottom: 24px;">
              <div id="timeline" style="height: 36px; display: flex; border-radius: 6px; overflow: hidden; position: relative; background: #eee;">
                <div id="now-marker" style="position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 4px rgba(0,0,0,0.5); z-index: 2;"></div>
              </div>
              <div id="ruler" style="display: flex; justify-content: space-between; padding: 4px 2px 0 2px; font-size: 10px; opacity: 0.5;">
                <span>00</span><span>04</span><span>08</span><span>12</span><span>16</span><span>20</span><span>00</span>
              </div>
            </div>

            <div id="stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div class="stat-item" style="background: rgba(127,127,127,0.1); padding: 12px 10px; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; min-height: 52px; box-sizing: border-box;">
                <div id="total-label" style="font-size: 11px; opacity: 0.6; margin-bottom: 2px; line-height: 1.1;">Всього без світла</div>
                <div id="total-hours" style="font-size: 16px; font-weight: bold; line-height: 1.1;">- год</div>
              </div>
              <div class="stat-item" style="background: rgba(127,127,127,0.1); padding: 12px 10px; border-radius: 8px; display: flex; flex-direction: column; justify-content: center; min-height: 52px; box-sizing: border-box;">
                <div id="next-change-label" style="font-size: 11px; opacity: 0.6; margin-bottom: 2px; line-height: 1.1;">Наступна зміна</div>
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
      const isOffBySchedule = attrs.now_status === 'off';
      if (statusEl) {
        statusEl.innerText = isOffBySchedule ? 'ПЛАНОВЕ ВІДКЛЮЧЕННЯ' : 'Є СВІТЛО';
        statusEl.style.background = isOffBySchedule ? '#ff9800' : '#66bb6a';
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
        const actualState = isOffBySchedule ? 'off' : 'on';
        const isFactMismatch = scheduleState !== actualState;

        if (isFactMismatch) {
          historyLabelEl.innerText = isOffBySchedule
            ? `Відключено (за фактом)`
            : `Світло є (поза графіком)`;
        } else {
          let chIdx = currentIndex;
          while (chIdx > 0 && schedule[chIdx - 1] === actualState) chIdx--;
          const time = `${Math.floor(chIdx / 2).toString().padStart(2, '0')}:${(chIdx % 2 === 0 ? "00" : "30")}`;
          historyLabelEl.innerText = isOffBySchedule
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

    // Timeline
    const timelineEl = this.querySelector('#timeline');
    if (timelineEl && this._lastRendered !== JSON.stringify(schedule)) {
      this._lastRendered = JSON.stringify(schedule);
      timelineEl.querySelectorAll('.block').forEach(b => b.remove());
      schedule.forEach((state, i) => {
        const b = document.createElement('div');
        b.className = 'block';
        b.style.flex = '1';
        b.style.height = '100%';
        b.style.background = state === 'off' ? '#ef5350' : '#66bb6a';
        b.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';
        timelineEl.appendChild(b);
      });
    }

    // Stats
    const thv = this.querySelector('#total-hours');
    if (thv) thv.innerText = `${isToday ? (attrs.today_outage_hours || 0) : (attrs.tomorrow_outage_hours || 0)} год`;

    const ncl = this.querySelector('#next-change-label');
    const ncv = this.querySelector('#next-change');
    if (isToday) {
      if (ncl) ncl.innerText = (attrs.now_status === 'off') ? 'Світло буде о:' : 'Світло вимкнуть о:';
      if (ncv) ncv.innerText = attrs.next_change_at || '-:-';
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
