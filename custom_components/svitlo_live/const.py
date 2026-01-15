from homeassistant.const import Platform

DOMAIN = "svitlo_live"

PLATFORMS: list[Platform] = [
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.CALENDAR,
]

DEFAULT_SCAN_INTERVAL = 900

CONF_REGION = "region"
CONF_QUEUE = "queue"
CONF_OPERATOR = "operator"

# --- 1. СПИСОК РЕГІОНІВ (Для UI) ---
# Залишаємо старі ключі, щоб не ламати існуючі налаштування
REGIONS = {
    # Спеціальні / DTEK / Yasno
    "kyiv": "м. Київ",
    "dnipro-city": "м. Дніпро",
    
    "kiivska-oblast": "Київська область",
    "odeska-oblast": "Одеська область",
    "dnipropetrovska-oblast": "Дніпропетровська область",
    "lvivska-oblast": "Львівська область",

    # Нові регіони (в новому API)
    "harkivska-oblast": "Харківська область",
    "poltavska-oblast": "Полтавська область",
    "cherkaska-oblast": "Черкаська область",
    "chernigivska-oblast": "Чернігівська область",
    "hmelnitska-oblast": "Хмельницька область",
    "ivano-frankivska-oblast": "Івано-Франківська область",
    "rivnenska-oblast": "Рівненська область",
    "ternopilska-oblast": "Тернопільська область",
    "zakarpatska-oblast": "Закарпатська область",
    "zaporizka-oblast": "Запорізька область",
    "jitomirska-oblast": "Житомирська область",
    "sumska-oblast": "Сумська область",

    # Старі регіони (працюють тільки на старому API)
    "vinnitska-oblast": "Вінницька область",
    "volinska-oblast": "Волинська область",
    "mikolaivska-oblast": "Миколаївська область",
    "kirovogradska-oblast": "Кіровоградська область",
    "chernivetska-oblast": "Чернівецька область",
    "donetska-oblast": "Донецька область",
}

# --- 2. МАПА ТРАНСЛІТЕРАЦІЇ ---
# Перекладаємо старі ключі з конфігу на правильні ключі для НОВОГО API.
# Для старого API ці ключі не використовуються (там залишаються старі).
API_REGION_MAP = {
    "harkivska-oblast": "kharkivska-oblast",
    "hmelnitska-oblast": "khmelnytska-oblast",
    "chernigivska-oblast": "chernihivska-oblast",
    "jitomirska-oblast": "zhytomyrska-oblast",
}

# --- 3. СПИСОК РЕГІОНІВ ДЛЯ НОВОГО API ---
# Якщо регіон (або його переклад) є в цьому списку -> йдемо на DTEK_API_URL
# Інакше -> йдемо на OLD_API_URL
NEW_API_REGIONS = {
    "kyiv", "kiivska-oblast",
    "odeska-oblast",
    "dnipro-dnem", "dnipro-cek", "dnipropetrovska-oblast",
    "lvivska-oblast",
    # Нові з парсера
    "kharkivska-oblast", # Вже правильна транслітерація
    "poltavska-oblast",
    "cherkaska-oblast",
    "chernihivska-oblast",
    "khmelnytska-oblast",
    "ivano-frankivska-oblast",
    "rivnenska-oblast",
    "ternopilska-oblast",
    "zakarpatska-oblast",
    "zaporizka-oblast",
    "zhytomyrska-oblast",
    "sumska-oblast",
}

REGION_QUEUE_MODE = {
    "chernivetska-oblast": "GRUPA_NUM",
    "donetska-oblast": "GRUPA_NUM",
}

# --- 4. ДВА API ---
OLD_API_URL = "https://svitlo-proxy.svitlo-proxy.workers.dev"  # Для старих
DTEK_API_URL = "https://dtek-api.svitlo-proxy.workers.dev/"    # Для нових
