
import datetime
from typing import Optional

# Mocking HA dt_util and other dependencies
class MockDt:
    def now(self, tz):
        return datetime.datetime(2026, 2, 4, 15, 39, 23, tzinfo=tz) # User's current time
    def utcnow(self):
        return datetime.datetime(2026, 2, 4, 14, 39, 23, tzinfo=datetime.timezone.utc)
    def as_utc(self, dt):
        return dt.astimezone(datetime.timezone.utc)
    def parse_datetime(self, s):
        return datetime.datetime.fromisoformat(s.replace('Z', '+00:00'))

dt_util = MockDt()
TZ_KYIV = datetime.timezone(datetime.timedelta(hours=2)) # Simplified UTC+2

def _find_next_at(target_states: list[str], base_date, today_half: list[str], idx: int, tomorrow_date_iso: Optional[str], tomorrow_half: Optional[list[str]]) -> Optional[str]:
    if not today_half: return None
    today_tail = today_half[idx + 1 :]
    seq = list(today_tail)
    has_tomorrow = bool(tomorrow_date_iso and tomorrow_half)
    if has_tomorrow: seq.extend(tomorrow_half or [])
    
    pos = next((i for i, s in enumerate(seq) if s in target_states), None)
    if pos is None: return None

    if pos < len(today_tail):
        base_local_midnight = datetime.datetime.combine(base_date, datetime.time.min, tzinfo=TZ_KYIV)
        minutes_from_base = (idx + 1 + pos) * 30
        next_local = base_local_midnight + datetime.timedelta(minutes=minutes_from_base)
    else:
        if not has_tomorrow: return None
        tomorrow_date = datetime.date.fromisoformat(tomorrow_date_iso)
        base_local_midnight = datetime.datetime.combine(tomorrow_date, datetime.time.min, tzinfo=TZ_KYIV)
        minutes_into_tomorrow = (pos - len(today_tail)) * 30
        next_local = base_local_midnight + datetime.timedelta(minutes=minutes_into_tomorrow)

    return next_local.astimezone(datetime.timezone.utc).isoformat()

# Data from user request
today_48half = ["off"] * 6 + ["on"] * 7 + ["off"] * 14 + ["on"] * 4 + ["off"] * 17
tomorrow_48half = ["on"] * 48
date_today = "2026-02-04"
date_tomorrow = "2026-02-05"

now_local = dt_util.now(TZ_KYIV)
base_day = datetime.date.fromisoformat(date_today)
idx = now_local.hour * 2 + (1 if now_local.minute >= 30 else 0)

cur = today_48half[idx]
print(f"Current time: {now_local}, Index: {idx}, Status: {cur}")

next_on_at = _find_next_at(["on"], base_day, today_48half, idx, date_tomorrow, tomorrow_48half)
next_off_at = _find_next_at(["off"], base_day, today_48half, idx, date_tomorrow, tomorrow_48half)

print(f"Next ON at: {next_on_at}")
print(f"Next OFF at: {next_off_at}")

next_change_iso = next_on_at if cur == "off" else next_off_at
next_change_hhmm = None
if next_change_iso:
    dt_change = dt_util.parse_datetime(next_change_iso)
    dt_local = dt_change.astimezone(TZ_KYIV)
    next_change_hhmm = dt_local.strftime("%H:%M")

print(f"FINAL next_change_at: {next_change_hhmm}")

# Expected: next_change_at should be 00:00 (of tomorrow) because today tail is all 'off'
# and tomorrow starts with 'on'.
