> [!TIP]
> **Швидкий спосіб (без DevTools):** дізнатися свою чергу за адресою можна на нашій сторінці —
> [![Знайти свою чергу](https://img.shields.io/badge/⚡_Знайти_свою_чергу_(Київ_%2F_Дніпро)-f59e0b?style=for-the-badge)](https://svitlo-queue-finder.svitlo-proxy.workers.dev)

### Ручний спосіб через браузер

1. Відкрийте сайт YASNO для вашого регіону:
   - **Київ:** https://static.yasno.ua/kyiv/outages
   - **Дніпро та Дніпропетровська область (ДТЕК ДнЕМ):** https://static.yasno.ua/dnipro/outages
2. Запустіть у браузері DevTools натиснувши F12
3. Оберіть вкладку Network -> Fetch/XHR

   <img width="1164" height="236" alt="{2672EE22-6D1E-4344-9910-D39BD22CD627}" src="https://github.com/user-attachments/assets/fd06383f-7f9b-4e03-a437-5196a56456fe" />

4. Введіть Вашу адресу та номер дому
5. Знайдіть відповідь від сервера, що починається з `group?....`
   
   <img width="1170" height="33" alt="{F6952CD2-802E-4040-9AFB-1FAB6E6A2FDB}" src="https://github.com/user-attachments/assets/8672d7f4-222f-4295-b80f-f0eac85683f8" />
6. Натисніть `Preview`
7. Отримаєте номер своєї групи (підгрупа у всіх лише одна — `1`):
   - **Київ:** наразі 60 груп (`1.1` – `60.1`)
   - **Дніпро та Дніпропетровська область (ДТЕК ДнЕМ):** наразі 18 груп (`1.1` – `18.1`)
   
   <img width="708" height="113" alt="{B8940E84-5C32-4E5C-85D1-6845FC67CC19}" src="https://github.com/user-attachments/assets/5a6d9768-8a67-4387-b52a-7d8bcc7ed8ce" />
