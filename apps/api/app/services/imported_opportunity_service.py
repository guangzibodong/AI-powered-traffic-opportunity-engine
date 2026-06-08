import hashlib
from typing import Any

from app.services.imported_graph_service import build_imported_signal_graph
from app.services.scoring import ScoreComponents, calculate_trafscore


RULE_VERSION = 1


def generate_imported_opportunities(store_id: str) -> dict[str, Any]:
    graph = build_imported_signal_graph(store_id)
    opportunities = []

    for cluster in graph["query_clusters"]:
        opportunities.extend(_opportunities_for_cluster(store_id, cluster))

    deduped = _dedupe(opportunities)
    return {
        "mode": "imported_opportunities",
        "opportunities": deduped,
        "store_id": store_id,
        "summary": {
            "by_rule": _count_by_rule(deduped),
            "opportunities": len(deduped),
            "source_query_clusters": graph["summary"]["query_clusters"],
        },
    }


def get_imported_opportunity(store_id: str, opportunity_id: str) -> dict[str, Any] | None:
    for opportunity in generate_imported_opportunities(store_id)["opportunities"]:
        if opportunity["id"] == opportunity_id:
            return opportunity
    return None


def _opportunities_for_cluster(store_id: str, cluster: dict[str, Any]) -> list[dict[str, Any]]:
    opportunities = []
    if _is_low_ctr_refresh_candidate(cluster):
        opportunities.append(_build_ctr_refresh_opportunity(store_id, cluster))
    if _is_collection_gap_candidate(cluster):
        opportunities.append(_build_collection_gap_opportunity(store_id, cluster))
    return opportunities


def _is_low_ctr_refresh_candidate(cluster: dict[str, Any]) -> bool:
    return (
        cluster["best_existing_page"] is not None
        and cluster["impressions"] >= 1000
        and cluster["ctr"] <= 0.03
        and cluster["position"] <= 20
    )


def _is_collection_gap_candidate(cluster: dict[str, Any]) -> bool:
    return cluster["best_existing_page"] is None and len(cluster["matched_products"]) >= 3


def _build_ctr_refresh_opportunity(store_id: str, cluster: dict[str, Any]) -> dict[str, Any]:
    page = cluster["best_existing_page"]
    assert page is not None
    score_components = {
        "traffic_potential": min(100, cluster["impressions"] / 20),
        "intent_score": 84,
        "product_fit_score": 78 if cluster["matched_products"] else 62,
        "revenue_fit_score": 72,
        "inventory_score": 82,
        "gap_score": 88,
        "timing_score": 74,
        "execution_ease": 94,
        "confidence_score": 82,
    }
    dedupe_key = f"{store_id}:imported:high_impression_low_ctr:{cluster['cluster_key']}:{page['page_id']}"
    return {
        "confidence": 0.82,
        "dedupe_key": dedupe_key,
        "evidence": [
            {
                "type": "gsc_ctr",
                "text": f"{cluster['impressions']} impressions with {cluster['ctr']:.1%} CTR",
                "metrics": {
                    "clicks": cluster["clicks"],
                    "ctr": cluster["ctr"],
                    "impressions": cluster["impressions"],
                    "position": cluster["position"],
                    "primary_query": cluster["primary_query"],
                },
            },
            {
                "type": "existing_page",
                "text": f"Existing page can be refreshed: {page['title']}",
                "entityRefs": [{"type": "page", "id": page["page_id"]}],
            },
        ],
        "id": _opportunity_id(dedupe_key),
        "opportunity_type": "high_impression_low_ctr",
        "recommended_task_type": "ctr_refresh",
        "related_page": page,
        "related_products": cluster["matched_products"],
        "rule_id": "high_impression_low_ctr",
        "rule_version": RULE_VERSION,
        "score_components": score_components,
        "source_cluster": _source_cluster(cluster),
        "status": "new",
        "summary": "Imported search data shows strong impressions but weak CTR on an existing page.",
        "title": f"Improve CTR for {cluster['primary_query']}",
        "trafscore": _score(score_components),
    }


def _build_collection_gap_opportunity(store_id: str, cluster: dict[str, Any]) -> dict[str, Any]:
    score_components = {
        "traffic_potential": min(100, cluster["impressions"] / 20),
        "intent_score": 88,
        "product_fit_score": 90,
        "revenue_fit_score": 74,
        "inventory_score": 92,
        "gap_score": 96,
        "timing_score": 80,
        "execution_ease": 76,
        "confidence_score": 80,
    }
    dedupe_key = f"{store_id}:imported:collection_page_gap:{cluster['cluster_key']}"
    return {
        "confidence": 0.84,
        "dedupe_key": dedupe_key,
        "evidence": [
            {
                "type": "query_cluster",
                "text": f"{cluster['primary_query']} cluster has {cluster['impressions']} impressions",
                "metrics": {
                    "cluster_key": cluster["cluster_key"],
                    "impressions": cluster["impressions"],
                    "query_count": cluster["query_count"],
                },
            },
            {
                "type": "product_fit",
                "text": f"{len(cluster['matched_products'])} imported products match this cluster",
                "entityRefs": [
                    {"type": "product", "id": product["product_id"]} for product in cluster["matched_products"]
                ],
            },
            {
                "type": "page_gap",
                "text": "No imported WordPress page matches this query cluster.",
            },
        ],
        "id": _opportunity_id(dedupe_key),
        "opportunity_type": "collection_page_gap",
        "recommended_task_type": "collection_page",
        "related_page": None,
        "related_products": cluster["matched_products"],
        "rule_id": "collection_page_gap",
        "rule_version": RULE_VERSION,
        "score_components": score_components,
        "source_cluster": _source_cluster(cluster),
        "status": "new",
        "summary": "Imported demand maps to multiple products, but no imported WordPress page exists.",
        "title": f"Create collection page for {cluster['primary_query'].title()}",
        "trafscore": _score(score_components),
    }


def _source_cluster(cluster: dict[str, Any]) -> dict[str, Any]:
    return {
        "clicks": cluster["clicks"],
        "cluster_key": cluster["cluster_key"],
        "ctr": cluster["ctr"],
        "impressions": cluster["impressions"],
        "position": cluster["position"],
        "primary_query": cluster["primary_query"],
        "query_count": cluster["query_count"],
        "top_pages": cluster["top_pages"],
    }


def _score(values: dict[str, float]) -> float:
    return calculate_trafscore(ScoreComponents(**values))


def _dedupe(opportunities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_key = {}
    for opportunity in opportunities:
        by_key.setdefault(opportunity["dedupe_key"], opportunity)
    return sorted(by_key.values(), key=lambda opportunity: (-opportunity["trafscore"], opportunity["dedupe_key"]))


def _count_by_rule(opportunities: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for opportunity in opportunities:
        counts[opportunity["rule_id"]] = counts.get(opportunity["rule_id"], 0) + 1
    return counts


def _opportunity_id(dedupe_key: str) -> str:
    return f"impopp_{hashlib.sha1(dedupe_key.encode('utf-8')).hexdigest()[:12]}"
