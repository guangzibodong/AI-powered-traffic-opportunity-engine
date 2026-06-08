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

_cluster_stopwords = {
    "a",
    "an",
    "and",
    "best",
    "buy",
    "for",
    "near",
    "of",
    "on",
    "the",
    "to",
    "with",
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


def list_imported_query_clusters(store_id: str) -> list[dict[str, Any]]:
    clusters: list[dict[str, Any]] = []

    for row in list_imported_gsc_rows(store_id):
        tokens = _query_cluster_tokens(row["query"])
        matched_cluster = _find_matching_cluster(clusters, tokens)
        if matched_cluster is None:
            matched_cluster = {
                "clicks": 0,
                "cluster_key": "-".join(tokens),
                "ctr": 0.0,
                "impressions": 0,
                "position": 0.0,
                "primary_query": row["query"],
                "query_count": 0,
                "queries": [],
                "row_ids": [],
                "top_pages": [],
                "_page_impressions": {},
                "_position_weighted_sum": 0.0,
                "_primary_query_impressions": 0,
                "_tokens": tokens,
            }
            clusters.append(matched_cluster)

        _add_row_to_cluster(matched_cluster, row)

    return [_finalize_cluster(cluster) for cluster in sorted(clusters, key=_cluster_sort_key)]


def _normalize_fieldnames(fieldnames: list[str]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for fieldname in fieldnames:
        key = _normalize_column_name(fieldname)
        if key in _required_columns:
            normalized[key] = fieldname
    return normalized


def _normalize_column_name(value: str) -> str:
    return value.strip().lower().replace(" ", "_").replace("-", "_")


def _query_cluster_tokens(query: str) -> tuple[str, ...]:
    tokens = [
        token
        for token in "".join(character if character.isalnum() else " " for character in query.casefold()).split()
        if len(token) > 1 and token not in _cluster_stopwords
    ]
    return tuple(sorted(dict.fromkeys(tokens)))


def _find_matching_cluster(clusters: list[dict[str, Any]], tokens: tuple[str, ...]) -> dict[str, Any] | None:
    token_set = set(tokens)
    if not token_set:
        return None

    for cluster in clusters:
        cluster_token_set = set(cluster["_tokens"])
        overlap = token_set.intersection(cluster_token_set)
        if len(overlap) >= 2:
            return cluster

    return None


def _add_row_to_cluster(cluster: dict[str, Any], row: dict[str, Any]) -> None:
    cluster["clicks"] += row["clicks"]
    cluster["impressions"] += row["impressions"]
    cluster["query_count"] += 1
    cluster["queries"].append(row["query"])
    cluster["row_ids"].append(row["id"])
    cluster["_position_weighted_sum"] += row["position"] * row["impressions"]
    cluster["_page_impressions"][row["page"]] = cluster["_page_impressions"].get(row["page"], 0) + row["impressions"]

    if row["impressions"] > cluster["_primary_query_impressions"]:
        cluster["primary_query"] = row["query"]
        cluster["_primary_query_impressions"] = row["impressions"]


def _finalize_cluster(cluster: dict[str, Any]) -> dict[str, Any]:
    impressions = cluster["impressions"]
    page_impressions = cluster["_page_impressions"]
    top_pages = sorted(page_impressions, key=lambda page: (-page_impressions[page], page))[:3]

    return {
        "clicks": cluster["clicks"],
        "cluster_key": cluster["cluster_key"],
        "ctr": round(cluster["clicks"] / impressions, 4) if impressions else 0.0,
        "impressions": impressions,
        "position": round(cluster["_position_weighted_sum"] / impressions, 2) if impressions else 0.0,
        "primary_query": cluster["primary_query"],
        "query_count": cluster["query_count"],
        "queries": sorted(cluster["queries"]),
        "row_ids": sorted(cluster["row_ids"]),
        "top_pages": top_pages,
    }


def _cluster_sort_key(cluster: dict[str, Any]) -> tuple[int, int, str]:
    return (-cluster["impressions"], -cluster["clicks"], cluster["primary_query"])


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
