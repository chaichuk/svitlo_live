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
CONF_OPERATOR = "operator"

# --- 1. REGIONS: ЗАЛИШАЄМО СТАРІ КЛЮЧІ (це важливо для збереження історії) ---
REGIONS = {
    # Спеціальні
    "kyiv": "м. Київ",
    "dnipro-city": "м. Дніпро", 

    # Області (Старі ключі, як були у v2.x)
    "harkivska-oblast": "Харківська область",      # Було harkivska
    "hmelnitska-oblast": "Хмельницька область",    # Було hmelnitska
    "chernigivska-oblast": "Чернігівська область", # Було chernigivska
    "jitomirska-oblast": "Житомирська область",    # Було jitomirska
    
    # Решта регіонів (ключі співпадають або не змінювались критично)
    "cherkaska-oblast": "Черкаська область",
    "chernivetska-oblast": "Чернівецька область",
    "dnipropetrovska-oblast": "Дніпропетровська область",
    "donetska-oblast": "Донецька область",
    "ivano-frankivska-oblast": "Івано-Франківська область",
    "kiivska-oblast": "Київська область",
    "kirovogradska-oblast": "Кіровоградська область",
    "lvivska-oblast": "Львівська область",
    "mikolaivska-oblast": "Миколаївська область",
    "odeska-oblast": "Одеська область",
    "poltavska-oblast": "Полтавська область",
    "rivnenska-oblast": "Рівненська область",
    "sumska-oblast": "Сумська область",
    "ternopilska-oblast": "Тернопільська область",
    "vinnitska-oblast": "Вінницька область",
    "volinska-oblast": "Волинська область",
    "zakarpatska-oblast": "Закарпатська область",
    "zaporizka-oblast": "Запорізька область",
}

# --- 2. МАПА ПЕРЕКЛАДУ: Старий конфіг -> Новий API ---
API_REGION_MAP = {
    "harkivska-oblast": "kharkivska-oblast",
    "hmelnitska-oblast": "khmelnytska-oblast",
    "chernigivska-oblast": "chernihivska-oblast",
    "jitomirska-oblast": "zhytomyrska-oblast",
    # Можна додати інші, якщо помітите невідповідність
}

REGION_QUEUE_MODE = {
    "chernivetska-oblast": "GRUPA_NUM",
    "donetska-oblast": "GRUPA_NUM",
}

# Використовуємо лише новий API
API_URL = "https://dtek-api.svitlo-proxy.workers.dev/" 
# Старий URL можна залишити як константу про всяк випадок, але логіка тепер йде через єдиний
