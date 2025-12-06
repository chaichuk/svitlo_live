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
CONF_OPERATOR = "operator"  # <-- Нова константа для вибору оператора

# Оновлений список регіонів
REGIONS = {
    # --- Спеціальні регіони (через ваш проксі) ---
    "kyiv": "м. Київ",
    "dnipro-city": "м. Дніпро",  # Віртуальний регіон для UI, далі розпадається на ДнЕМ/ЦЕК
    "lvivska-oblast": "Львівська область",
    "kiivska-oblast": "Київська область",
    "odeska-oblast": "Одеська область",
    "dnipropetrovska-oblast": "Дніпропетровська область",
    
    # --- Стандартні регіони (svitlo.live) ---
    "cherkaska-oblast": "Черкаська область",
    "chernigivska-oblast": "Чернігівська область",
    "chernivetska-oblast": "Чернівецька область",
    "donetska-oblast": "Донецька область",
    "harkivska-oblast": "Харківська область",
    "hmelnitska-oblast": "Хмельницька область",
    "ivano-frankivska-oblast": "Івано-Франківська область",
    "kirovogradska-oblast": "Кіровоградська область",
    "mikolaivska-oblast": "Миколаївська область",
    "poltavska-oblast": "Полтавська область",
    "rivnenska-oblast": "Рівненська область",
    "sumska-oblast": "Сумська область",
    "ternopilska-oblast": "Тернопільська область",
    "vinnitska-oblast": "Вінницька область",
    "volinska-oblast": "Волинська область",
    "zakarpatska-oblast": "Закарпатська область",
    "zaporizka-oblast": "Запорізька область",
    "jitomirska-oblast": "Житомирська область",
}

# Мапа режимів вибору черги/групи
REGION_QUEUE_MODE = {
    "chernivetska-oblast": "GRUPA_NUM",
    "donetska-oblast": "GRUPA_NUM",
}

# Основний API (старий)
API_URL = "https://svitlo-proxy.svitlo-proxy.workers.dev"

# Персональний API (Cloudflare Worker)
DTEK_API_URL = "https://dtek-api.svitlo-proxy.workers.dev/"

# POE для Полтавської області
POE_WEBSITE_URL = "https://www.poe.pl.ua/customs/dynamicgpv-info.php"