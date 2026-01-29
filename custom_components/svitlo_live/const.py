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
CONF_PRESERVE_ID = "preserve_id"

# Static mappings are deprecated in favor of dynamic fetching, but kept for migration if needed.
API_REGION_MAP = {
    "harkivska-oblast": "kharkivska-oblast",
    "hmelnitska-oblast": "khmelnytska-oblast",
    "chernigivska-oblast": "chernihivska-oblast",
    "jitomirska-oblast": "zhytomyrska-oblast",
}

NEW_API_REGIONS = {
    "kiivska-oblast", "odeska-oblast", "dnipropetrovska-oblast", "lvivska-oblast",
    "kyiv", "dnipro-dnem", "dnipro-cek", "dnipro-city",
    "kharkivska-oblast", "poltavska-oblast", "cherkaska-oblast", "chernihivska-oblast",
    "khmelnytska-oblast", "ivano-frankivska-oblast", "rivnenska-oblast", 
    "ternopilska-oblast", "zakarpatska-oblast", "zaporizka-oblast", 
    "zhytomyrska-oblast", "sumska-oblast"
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
