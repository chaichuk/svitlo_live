
class SvitloLiveCard extends HTMLElement {
    set hass(hass) {
        if (!this.content) {
            this.innerHTML = `
        <ha-card>
          <div id="container" style="padding: 16px;">
            <div id="header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div id="title" style="font-size: 18px; font-weight: bold;">Svitlo.live</div>
              <div id="status" style="font-size: 14px; padding: 4px 8px; border-radius: 4px;"></div>
            </div>
            <div id="timeline" style="height: 40px; display: flex; border-radius: 6px; overflow: hidden; position: relative; background: #eee; margin-bottom: 16px;">
              <div id="now-marker" style="position: absolute; top: 0; bottom: 0; width: 2px; background: #fff; box-shadow: 0 0 4px rgba(0,0,0,0.5); z-index: 2; transition: left 0.5s;"></div>
            </div>
            <div id="stats" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              <div class="stat-item" style="background: rgba(0,0,0,0.05); padding: 8px; border-radius: 8px;">
                <div style="font-size: 12px; opacity: 0.7;">Всього без світла</div>
                <div id="total-hours" style="font-size: 16px; font-weight: bold;">- год</div>
              </div>
              <div class="stat-item" style="background: rgba(0,0,0,0.05); padding: 8px; border-radius: 8px;">
                <div style="font-size: 12px; opacity: 0.7;">Наступна зміна</div>
                <div id="next-change" style="font-size: 16px; font-weight: bold;">-:-</div>
              </div>
            </div>
          </div>
        </ha-card>
      `;
            this.content = this.querySelector('#container');
        }

        const entityId = this.config.entity;
        const stateObj = hass.states[entityId];

        if (!stateObj) return;

        // Шукаємо пов'язані сенсори за атрибутами або шаблоном імені
        const queue = stateObj.attributes.queue || '';
        const region = stateObj.attributes.region || '';

        // Спробуємо знайти сенсори статистики
        const todayOutageId = `sensor.svitlo_outage_today_${region}_${queue}`;
        const nextChangeId = `sensor.svitlo_next_change_${region}_${queue}`; // Можна брати з атрибутів головного сенсора

        const schedule = stateObj.attributes.today_48half || [];
        const statusEl = this.querySelector('#status');
        const timelineEl = this.querySelector('#timeline');
        const nowMarkerEl = this.querySelector('#now-marker');
        const totalHoursEl = this.querySelector('#total-hours');
        const nextChangeEl = this.querySelector('#next-change');

        // Оновлення статусу
        const isOff = stateObj.state === 'off';
        statusEl.innerText = isOff ? 'НЕМАЄ СВІТЛА' : 'Є СВІТЛО';
        statusEl.style.background = isOff ? '#ef5350' : '#66bb6a';
        statusEl.style.color = '#fff';

        // Оновлення таймлайну (один раз)
        if (this._lastSchedule !== JSON.stringify(schedule)) {
            this._lastSchedule = JSON.stringify(schedule);
            // Очищаємо все крім маркера
            const blocks = timelineEl.querySelectorAll('.block');
            blocks.forEach(b => b.remove());

            schedule.forEach((state, i) => {
                const block = document.createElement('div');
                block.className = 'block';
                block.style.flex = '1';
                block.style.background = state === 'off' ? '#ef5350' : '#66bb6a';
                block.style.borderRight = (i + 1) % 2 === 0 ? '1px solid rgba(255,255,255,0.1)' : 'none';
                block.title = `${Math.floor(i / 2)}:${i % 2 === 0 ? '00' : '30'}`;
                timelineEl.appendChild(block);
            });
        }

        // Позиція маркера "ЗАРАЗ"
        const now = new Date();
        const minutes = now.getHours() * 60 + now.getMinutes();
        const percent = (minutes / 1440) * 100;
        nowMarkerEl.style.left = `${percent}%`;

        // Статистика
        const todayOutageState = hass.states[todayOutageId];
        if (todayOutageState) {
            totalHoursEl.innerText = `${todayOutageState.state} год`;
        } else {
            // Якщо нема сенсора, рахуємо самі з атрибутів
            const offCount = schedule.filter(s => s === 'off').length;
            totalHoursEl.innerText = `${offCount * 0.5} год`;
        }

        const nextChange = stateObj.attributes.next_change_at;
        if (nextChange) {
            nextChangeEl.innerText = nextChange;
        }
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error('Please define an entity');
        }
        this.config = config;
    }

    getCardSize() {
        return 3;
    }
}

customElements.define('svitlo-live-card', SvitloLiveCard);

// Додаємо в список карток
window.customCards = window.customCards || [];
window.customCards.push({
    type: "svitlo-live-card",
    name: "Svitlo Live Card",
    preview: true,
    description: "A card to display power outage schedules from Svitlo.live"
});
