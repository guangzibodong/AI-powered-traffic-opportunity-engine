import hashlib
from html import unescape
from html.parser import HTMLParser
from typing import Any

from app.integrations.wordpress_client import WordPressClient


_imported_pages_by_store: dict[str, dict[str, dict[str, Any]]] = {}


class PageSyncService:
    def __init__(self, wordpress_client: WordPressClient) -> None:
        self.wordpress_client = wordpress_client

    async def sync_pages(self, store_id: str) -> dict:
        pages = await self.wordpress_client.list_pages()
        summary = import_wordpress_pages(store_id, pages)
        return {**summary, "synced_pages": summary["imported_pages"]}


def clear_imported_pages() -> None:
    _imported_pages_by_store.clear()


def import_wordpress_pages(store_id: str, pages: list[dict[str, Any]]) -> dict[str, Any]:
    pages_for_store = _imported_pages_by_store.setdefault(store_id, {})
    imported_pages = 0
    skipped_pages = 0

    for raw_page in pages:
        try:
            normalized = _normalize_wordpress_page(store_id, raw_page)
        except (TypeError, ValueError):
            skipped_pages += 1
            continue

        pages_for_store[normalized["id"]] = normalized
        imported_pages += 1

    return {
        "imported_pages": imported_pages,
        "mode": "wordpress_import",
        "skipped_pages": skipped_pages,
        "store_id": store_id,
        "total_pages": len(pages_for_store),
    }


def list_imported_pages(store_id: str) -> list[dict[str, Any]]:
    pages = list(_imported_pages_by_store.get(store_id, {}).values())
    return sorted(
        pages,
        key=lambda page: (
            not page["indexable"],
            page["status"] != "publish",
            page["page_type"] != "page",
            page["title"],
            page["external_id"],
        ),
    )


def get_imported_page(store_id: str, page_id: str) -> dict[str, Any] | None:
    return _imported_pages_by_store.get(store_id, {}).get(page_id)


def _normalize_wordpress_page(store_id: str, raw_page: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(raw_page, dict):
        raise TypeError("WordPress page must be an object")

    external_id = _read_external_id(raw_page)
    title = _read_rendered_text(raw_page.get("title"))
    url = _read_string(raw_page.get("link")) or _read_string(raw_page.get("url"))
    if not external_id or not title or not url:
        raise ValueError("WordPress page requires id, title, and link")

    status = _read_string(raw_page.get("status")) or "unknown"
    page_type = _read_string(raw_page.get("type")) or "page"
    seo = _normalize_seo(raw_page.get("yoast_head_json"))
    return {
        "content_hash": _build_content_hash(title, _read_rendered_text(raw_page.get("excerpt")), url),
        "excerpt": _read_rendered_text(raw_page.get("excerpt")),
        "external_id": external_id,
        "id": _build_page_id(store_id, external_id),
        "indexable": _is_indexable(status, seo),
        "page_type": page_type,
        "seo": seo,
        "slug": _read_string(raw_page.get("slug")) or None,
        "source": "wordpress_import",
        "status": status,
        "store_id": store_id,
        "title": title,
        "url": url,
    }


def _read_external_id(raw_page: dict[str, Any]) -> str:
    raw_id = raw_page.get("id")
    if raw_id is None:
        raw_id = raw_page.get("external_id")
    return _read_string(raw_id)


def _read_string(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _read_rendered_text(value: Any) -> str:
    if isinstance(value, dict):
        value = value.get("rendered")
    return _strip_html(_read_string(value))


def _strip_html(value: str) -> str:
    if not value:
        return ""
    parser = _TextExtractor()
    parser.feed(value)
    parser.close()
    return " ".join(unescape(parser.text()).split())


def _normalize_seo(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        return {}

    seo: dict[str, Any] = {}
    title = _read_string(value.get("title"))
    description = _read_string(value.get("description"))
    robots = value.get("robots")
    if title:
        seo["title"] = title
    if description:
        seo["description"] = description
    if isinstance(robots, dict):
        seo["robots"] = robots
    return seo


def _is_indexable(status: str, seo: dict[str, Any]) -> bool:
    robots = seo.get("robots")
    if isinstance(robots, dict) and _read_string(robots.get("index")).casefold() == "noindex":
        return False
    return status == "publish"


def _build_content_hash(title: str, excerpt: str, url: str) -> str:
    key = "|".join([title, excerpt, url])
    return hashlib.sha1(key.encode("utf-8")).hexdigest()[:12]


def _build_page_id(store_id: str, external_id: str) -> str:
    key = "|".join([store_id, external_id])
    return f"wp_{hashlib.sha1(key.encode('utf-8')).hexdigest()[:12]}"


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self._chunks: list[str] = []

    def handle_data(self, data: str) -> None:
        self._chunks.append(data)

    def text(self) -> str:
        return " ".join(self._chunks)
