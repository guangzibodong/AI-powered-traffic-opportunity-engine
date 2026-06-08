import csv
import hashlib
from io import StringIO
from typing import Any

from app.integrations.gsc_client import GSCClient


_imported_gsc_rows_by_store: dict[str, dict[str, dict[str, Any]]] = {}

_required_columns = {
    "query": "query",
    "page": "page",
    "clicks": "clicks",
    "impressions": "impressions",
    "ctr": "ctr",
    "position": "position",
}


class GSCIngestionService:
    def __init__(self, gsc_client: GSCClient) -> None:
        self.gsc_client = gsc_client

    async def sync_metrics(self, store_id: str, site_url: str) -> dict:
        rows = await self.gsc_client.query_search_analytics(site_url=site_url)
        return {"store_id": store_id, "synced_rows": len(rows)}


def clear_imported_gsc_rows() -> None:
    _imported_gsc_rows_by_store.clear()


def import_gsc_csv(store_id: str, csv_text: str, window: str = "28d") -> dict[str, Any]:
    reader = csv.DictReader(StringIO(csv_text.strip()))
    if not reader.fieldnames:
        raise ValueError("Missing required GSC CSV columns: query, page, clicks, impressions, ctr, position")

    field_map = _normalize_fieldnames(reader.fieldnames)
    missing = [column for column in _required_columns if column not in field_map]
    if missing:
        raise ValueError(f"Missing required GSC CSV columns: {', '.join(missing)}")

    rows_for_store = _imported_gsc_rows_by_store.setdefault(store_id, {})
    imported_rows = 0
    skipped_rows = 0

    for raw_row in reader:
        try:
            normalized = _normalize_csv_row(store_id, raw_row, field_map, window)
        except ValueError:
            skipped_rows += 1
            continue

        rows_for_store[normalized["id"]] = normalized
        imported_rows += 1

    return {
        "imported_rows": imported_rows,
        "mode": "csv_import",
        "skipped_rows": skipped_rows,
        "store_id": store_id,
        "total_rows": len(rows_for_store),
        "window": window,
    }


def list_imported_gsc_rows(store_id: str) -> list[dict[str, Any]]:
    rows = list(_imported_gsc_rows_by_store.get(store_id, {}).values())
    return sorted(rows, key=lambda row: (-row["impressions"], -row["clicks"], row["query"], row["page"]))


def get_imported_gsc_row(store_id: str, query_id: str) -> dict[str, Any] | None:
    return _imported_gsc_rows_by_store.get(store_id, {}).get(query_id)


def _normalize_fieldnames(fieldnames: list[str]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for fieldname in fieldnames:
        key = _normalize_column_name(fieldname)
        if key in _required_columns:
            normalized[key] = fieldname
    return normalized


def _normalize_column_name(value: str) -> str:
    return value.strip().lower().replace(" ", "_").replace("-", "_")


def _normalize_csv_row(
    store_id: str,
    raw_row: dict[str, str | None],
    field_map: dict[str, str],
    window: str,
) -> dict[str, Any]:
    query = _read_string(raw_row, field_map["query"])
    page = _read_string(raw_row, field_map["page"])
    if not query or not page:
        raise ValueError("Query and page are required")

    clicks = _read_int(raw_row, field_map["clicks"])
    impressions = _read_int(raw_row, field_map["impressions"])
    ctr = _read_ctr(raw_row, field_map["ctr"])
    position = _read_float(raw_row, field_map["position"])
    if impressions <= 0 or clicks < 0 or position <= 0:
        raise ValueError("Clicks, impressions, and position must be valid")

    row_id = _build_gsc_row_id(store_id, query, page, window)
    return {
        "clicks": clicks,
        "ctr": ctr,
        "id": row_id,
        "impressions": impressions,
        "page": page,
        "position": position,
        "query": query,
        "source": "csv_import",
        "store_id": store_id,
        "window": window,
    }


def _read_string(row: dict[str, str | None], field: str) -> str:
    return (row.get(field) or "").strip()


def _read_int(row: dict[str, str | None], field: str) -> int:
    raw = _read_string(row, field).replace(",", "")
    return int(raw)


def _read_float(row: dict[str, str | None], field: str) -> float:
    raw = _read_string(row, field).replace(",", "")
    return float(raw)


def _read_ctr(row: dict[str, str | None], field: str) -> float:
    raw = _read_string(row, field).replace(",", "")
    if raw.endswith("%"):
        return float(raw[:-1]) / 100
    value = float(raw)
    return value / 100 if value > 1 else value


def _build_gsc_row_id(store_id: str, query: str, page: str, window: str) -> str:
    key = "|".join([store_id, window, query.casefold(), page.casefold()])
    return f"gsc_{hashlib.sha1(key.encode('utf-8')).hexdigest()[:12]}"
