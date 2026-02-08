from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List

from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.util import dt as dt_util

from .const import OLD_API_URL, DTEK_API_URL, API_REGION_MAP

_LOGGER = logging.getLogger(__name__)


class SvitloApiHub:
    """Centralized hub for fetching data from both Svitlo APIs and providing dynamic catalogs."""

    def __init__(self, hass: HomeAssistant) -> None:
        self.hass = hass
        self._session = async_get_clientsession(hass)
        self._lock = asyncio.Lock()
        
        # Cache for raw data
        self._data_old: Optional[dict[str, Any]] = None
        self._data_new: Optional[dict[str, Any]] = None
        self._last_fetch_old: Optional[datetime] = None
        self._last_fetch_new: Optional[datetime] = None
        
        # HTTP Caching tags
        self._etags: dict[str, str] = {}
        self._last_modified: dict[str, str] = {}
        
        self._cache_ttl = timedelta(seconds=600)  # 10 minutes

    async def get_regions_catalog(self) -> List[Dict[str, Any]]:
        """Fetch all regions from both APIs and return a unified list."""
        old_data = await self.ensure_data(is_new=False)
        new_data = await self.ensure_data(is_new=True)

        merged_regions = {}

        # Parse New API (usually higher priority or has different slugs)
        for r in new_data.get("regions", []):
            cpu = r.get("cpu")
            if not cpu: continue
            merged_regions[cpu] = {
                "id": cpu,
                "name": r.get("name_ua") or r.get("name_en") or cpu,
                "is_new_api": True,
                "queues": list(r.get("schedule", {}).keys())
            }

        # Parse Old API (fallback or unique regions)
        for r in old_data.get("regions", []):
            cpu = r.get("cpu")
            if not cpu: continue
            
            # Normalize slug using map if present (e.g. harkivska -> kharkivska)
            target_id = API_REGION_MAP.get(cpu, cpu)

            # If already there (under new or normalized ID), we might update or ignore. 
            # Usually keep new API preference if same slug.
            if target_id not in merged_regions:
                # Filter out null schedules (like Crimea in old API)
                schedule = r.get("schedule")
                if schedule is None: continue
                
                merged_regions[target_id] = {
                    "id": target_id,
                    "name": r.get("name_ua") or r.get("name_en") or target_id,
                    "is_new_api": False,
                    "queues": list(schedule.keys())
                }

        return sorted(merged_regions.values(), key=lambda x: x["name"])

    async def ensure_data(self, is_new: bool) -> dict[str, Any]:
        """Ensure we have fresh data for the specified API."""
        now = dt_util.utcnow()
        cache_data = self._data_new if is_new else self._data_old
        cache_time = self._last_fetch_new if is_new else self._last_fetch_old

        if cache_data and cache_time and (now - cache_time) < self._cache_ttl:
            return cache_data

        async with self._lock:
            # Double check inside lock
            cache_data = self._data_new if is_new else self._data_old
            cache_time = self._last_fetch_new if is_new else self._last_fetch_old
            if cache_data and cache_time and (now - cache_time) < self._cache_ttl:
                return cache_data

            url = DTEK_API_URL if is_new else OLD_API_URL
            
            max_retries = 3
            retry_delay = 2  # початкова затримка в секундах

            # Prepare headers for conditional request
            headers = {}
            if url in self._etags:
                headers["If-None-Match"] = self._etags[url]
            if url in self._last_modified:
                headers["If-Modified-Since"] = self._last_modified[url]

            for attempt in range(max_retries + 1):
                try:
                    _LOGGER.debug(
                        "Fetching API (attempt %d/%d): %s", 
                        attempt + 1, max_retries + 1, url
                    )
                    async with self._session.get(url, headers=headers, timeout=30) as resp:
                        # Handle 304 Not Modified
                        if resp.status == 304:
                            _LOGGER.debug("HTTP 304 Not Modified for %s", url)
                            if is_new:
                                self._last_fetch_new = now
                            else:
                                self._last_fetch_old = now
                            return cache_data or {}

                        if resp.status != 200:
                            _LOGGER.warning(
                                "HTTP %s for %s (attempt %d/%d)", 
                                resp.status, url, attempt + 1, max_retries + 1
                            )
                            if attempt < max_retries:
                                await asyncio.sleep(retry_delay)
                                retry_delay *= 2
                                continue
                            return cache_data or {}
                        
                        # Update tags on 200 OK
                        if etag := resp.headers.get("ETag"):
                            self._etags[url] = etag
                        if last_mod := resp.headers.get("Last-Modified"):
                            self._last_modified[url] = last_mod

                        raw = await resp.json(content_type=None)
                        
                        if is_new:
                            # New API Worker format
                            body_str = raw.get("body")
                            if body_str:
                                try:
                                    final_data = json.loads(body_str)
                                except json.JSONDecodeError as err:
                                    _LOGGER.error("Failed to parse New API body: %s", err)
                                    return cache_data or {}
                            else:
                                final_data = raw
                            
                            self._data_new = final_data
                            self._last_fetch_new = now
                        else:
                            self._data_old = raw
                            self._last_fetch_old = now
                            
                        return self._data_new if is_new else self._data_old

                except Exception as e:
                    _LOGGER.error(
                        "Error fetching %s (attempt %d/%d): %s", 
                        url, attempt + 1, max_retries + 1, e
                    )
                    if attempt < max_retries:
                        await asyncio.sleep(retry_delay)
                        retry_delay *= 2
                        continue
                    return cache_data or {}
            
            return cache_data or {}
