import hashlib
from typing import Any

from app.services.gsc_ingestion_service import list_imported_gsc_rows


_blocked_capabilities = ["real_gsc_oauth", "wordpress_writes", "woocommerce_writes", "live_publish"]


def list_store_performance_snapshots(store_id: str) -> dict[str, Any]:
    rows = list_imported_gsc_rows(store_id)
    snapshots = [_finalize_snapshot(store_id, window, window_rows) for window, window_rows in _group_rows_by_window(rows)]

    return {
        "blocked_capabilities": _blocked_capabilities,
        "external_write_allowed": False,
        "mode": "performance_snapshots",
        "safety_scope": "local_imported_gsc_only",
        "snapshots": snapshots,
        "store_id": store_id,
        "summary": _summarize_snapshots(snapshots),
    }


def _group_rows_by_window(rows: list[dict[str, Any]]) -> list[tuple[str, list[dict[str, Any]]]]:
    rows_by_window: dict[str, list[dict[str, Any]]] = {}
    for row in rows:
        rows_by_window.setdefault(row["window"], []).append(row)
    return sorted(rows_by_window.items(), key=lambda item: item[0])


def _finalize_snapshot(store_id: str, window: str, rows: list[dict[str, Any]]) -> dict[str, Any]:
    clicks = sum(row["clicks"] for row in rows)
    impressions = sum(row["impressions"] for row in rows)
    weighted_position = sum(row["position"] * row["impressions"] for row in rows)
    pages = {row["page"] for row in rows}
    queries = {row["query"] for row in rows}

    return {
        "clicks": clicks,
        "ctr": round(clicks / impressions, 4) if impressions else 0.0,
        "external_write_allowed": False,
        "id": _build_snapshot_id(store_id, window),
        "impressions": impressions,
        "page_count": len(pages),
        "position": round(weighted_position / impressions, 2) if impressions else 0.0,
        "query_count": len(queries),
        "row_ids": sorted(row["id"] for row in rows),
        "source": "imported_gsc_csv",
        "window": window,
    }


def _summarize_snapshots(snapshots: list[dict[str, Any]]) -> dict[str, Any]:
    clicks = sum(snapshot["clicks"] for snapshot in snapshots)
    impressions = sum(snapshot["impressions"] for snapshot in snapshots)
    weighted_position = sum(snapshot["position"] * snapshot["impressions"] for snapshot in snapshots)

    return {
        "clicks": clicks,
        "ctr": round(clicks / impressions, 4) if impressions else 0.0,
        "impressions": impressions,
        "position": round(weighted_position / impressions, 2) if impressions else 0.0,
        "snapshot_count": len(snapshots),
    }


def _build_snapshot_id(store_id: str, window: str) -> str:
    key = f"{store_id}|{window}"
    return f"perf_{hashlib.sha1(key.encode('utf-8')).hexdigest()[:12]}"
