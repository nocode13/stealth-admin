"""Снимок каталога и продажных позиций из admin API — только чтение.

Логин как в админке (`POST /admin/auth/login` → сессионная cookie), дальше постранично по курсору.
"""

from __future__ import annotations

import json
import time
from pathlib import Path

import requests

PAGE_LIMIT = 100
MAX_AGE_SECONDS = 10 * 60


def _paginate(session: requests.Session, url: str) -> list[dict]:
    items: list[dict] = []
    cursor: str | None = None
    while True:
        params = {"limit": PAGE_LIMIT, **({"cursor": cursor} if cursor else {})}
        response = session.get(url, params=params, timeout=60)
        response.raise_for_status()
        page = response.json()
        items.extend(page["items"])
        cursor = page.get("nextCursor")
        if not cursor:
            return items


def _cover_url(media: list[dict]) -> str | None:
    ready = [m for m in sorted(media, key=lambda m: m["sortOrder"]) if m.get("status", "READY") == "READY"]
    for item in ready:
        if item["type"] == "IMAGE":
            return item["url"]
    for item in ready:
        if item.get("posterUrl"):
            return item["posterUrl"]
    return None


def fetch_snapshot(api_base_url: str, email: str, password: str) -> dict:
    session = requests.Session()
    base = api_base_url.rstrip("/")
    login = session.post(f"{base}/admin/auth/login", json={"email": email, "password": password}, timeout=30)
    login.raise_for_status()
    if login.json().get("role") != "SUPER_ADMIN":
        raise RuntimeError("Нужен логин SUPER_ADMIN: продавец видит только свои позиции")

    catalogs = _paginate(session, f"{base}/admin/catalog")
    listings = _paginate(session, f"{base}/admin/listings")

    return {
        "fetchedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "apiBaseUrl": base,
        "catalogs": [
            {
                "id": c["id"],
                "name": c["name"],
                "hasDescription": bool((c.get("description") or "").strip()),
                "status": c["status"],
                "sellerId": c.get("sellerId"),
                "subcategory": (c.get("subcategory") or {}).get("name"),
                "coverUrl": _cover_url(c.get("media") or []),
            }
            for c in catalogs
        ],
        "listings": [
            {
                "id": l["id"],
                "code": l["code"],
                "sku": l.get("sku"),
                "sellerId": l["sellerId"],
                "catalogItemId": l["catalogItemId"],
                "seedling": l.get("seedling", False),
                "potVolumeMl": l.get("potVolumeMl"),
                "stemCount": l.get("stemCount"),
                "heightCm": l.get("heightCm"),
                "coverUrl": _cover_url(l.get("ownMedia") or []),
            }
            for l in listings
        ],
    }


def load_or_fetch(path: Path, refresh: bool, api_base_url: str, email: str, password: str) -> dict:
    """Снимок старше `MAX_AGE_SECONDS` перечитывается сам: между пачками approve создаёт каталоги,
    и следующая пачка должна их видеть при сопоставлении."""
    fresh = path.exists() and time.time() - path.stat().st_mtime < MAX_AGE_SECONDS
    if fresh and not refresh:
        snapshot = json.loads(path.read_text(encoding="utf-8"))
        if snapshot.get("apiBaseUrl") == api_base_url.rstrip("/"):
            return snapshot
    snapshot = fetch_snapshot(api_base_url, email, password)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8")
    return snapshot
