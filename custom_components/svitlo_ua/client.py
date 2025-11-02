from __future__ import annotations
ct = r.headers.get("Content-Type", "")
if "json" in ct:
return await r.json()
return await r.text()


async def fetch_queue_gpv(self, city: str, street: str, house: str, update_fact: str) -> str | None:
# NOTE: If the exact method name differs on your side, adjust here.
# We call getHomeNum with the full address as observed.
data = [
("method", "getHomeNum"),
("data[0][name]", "city"), ("data[0][value]", city),
("data[1][name]", "street"), ("data[1][value]", street),
("data[2][name]", "house_num"), ("data[2][value]", str(house)),
("data[3][name]", "updateFact"), ("data[3][value]", update_fact),
]
j = await self.ajax(data)
# Best-effort extraction following observed payloads (sub_type_reason: ["GPV3.2"])
if isinstance(j, dict):
d = j.get("data")
if isinstance(d, dict) and d:
first = next(iter(d.values()))
arr = (first or {}).get("sub_type_reason", [])
if arr:
return arr[0]
# Fallback: try to detect a raw GPV code in any string form
if isinstance(j, str) and "GPV" in j:
# naive grep
import re as _re
m = _re.search(r"GPV\d+(?:\.\d+)?", j)
if m:
return m.group(0)
return None


async def fetch_house_list(self, city: str, street: str, update_fact: str) -> list[str] | None:
"""Best-effort attempt to get house list. If unsupported, return None to fallback to manual input."""
# Some backends return lists when house_num is omitted or via a different method name.
try:
pairs = [
("method", "getHomeNum"),
("data[0][name]", "city"), ("data[0][value]", city),
("data[1][name]", "street"), ("data[1][value]", street),
("data[2][name]", "updateFact"), ("data[2][value]", update_fact),
]
j = await self.ajax(pairs)
# Try common shapes
houses: list[str] = []
if isinstance(j, dict):
# Look for list-like data
for v in j.values():
if isinstance(v, list):
for item in v:
if isinstance(item, dict):
num = item.get("house") or item.get("number") or item.get("value")
if num:
houses.append(str(num))
if houses:
return sorted(set(houses), key=lambda x: (len(x), x))
except Exception:
return None
return None


async def get_schedule_html_for_gpv(self, gpv_code: str) -> str:
# Parameter name can differ (gpv= / turn= / queue=). We use 'gpv' by default.
params = {"gpv": gpv_code.replace("GPV", "")}
async with self._session.get(f"{BASE}/ua/shutdowns", params=params, timeout=TIMEOUT) as r:
return await r.text()
