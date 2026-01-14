from homeassistant.const import Platform

DOMAIN = "svitlo_live"

PLATFORMS: list[Platform] = [
    Platform.SENSOR,
    Platform.BINARY_SENSOR,
    Platform.CALENDAR,
]

# Фіксований інтервал опитування (сек)
DEFAULT_SCAN_INTERVAL = 900  # 15 хв

CONF_REGION = "region"
CONF_QUEUE = "queue"
CONF_SCAN_INTERVAL = "scan_interval"
CONF_OPERATOR = "operator"  # <-- Нова константа для вибору оператора

# Оновлений список регіонів
REGIONS = {
    # --- Спеціальні регіони (через ваш проксі) ---
    "kyiv": "м. Київ",
    "dnipro-city": "м. Дніпро",  # Віртуальний регіон для UI, далі розпадається на ДнЕМ/ЦЕК
    
    # Регіони, що підтримуються новим API
    "kiivska-oblast": "Київська область",
    "odeska-oblast": "Одеська область",
    "dnipropetrovska-oblast": "Дніпропетровська область",
    "lvivska-oblast": "Львівська область",
    
    "poltavska-oblast": "Полтавська область",
    "cherkaska-oblast": "Черкаська область",
    "chernihivska-oblast": "Чернігівська область",
    "kharkivska-oblast": "Харківська область",
    "khmelnytska-oblast": "Хмельницька область",
    "ivano-frankivska-oblast": "Івано-Франківська область",
    "rivnenska-oblast": "Рівненська область",
    "ternopilska-oblast": "Тернопільська область",
    "zakarpatska-oblast": "Закарпатська область",
    "zaporizka-oblast": "Запорізька область",
    "zhytomyrska-oblast": "Житомирська область",
    
    # Інші (поки що залишаємо старі ключі, якщо вони працюють через старе API, або коментуємо)
    # "chernivetska-oblast": "Чернівецька область",
    # "donetska-oblast": "Донецька область",
    # "kirovogradska-oblast": "Кіровоградська область",
    # "mikolaivska-oblast": "Миколаївська область",
    # "sumska-oblast": "Сумська область",
    # "vinnitska-oblast": "Вінницька область",
    # "volinska-oblast": "Волинська область",
}

# Мапа режимів вибору черги/групи
REGION_QUEUE_MODE = {
    # "chernivetska-oblast": "GRUPA_NUM",
    # "donetska-oblast": "GRUPA_NUM",
}

# Основний API (старий)
API_URL = "https://svitlo-proxy.svitlo-proxy.workers.dev"

# Персональний API (Cloudflare Worker)
DTEK_API_URL = "https://dtek-api.svitlo-proxy.workers.dev/"