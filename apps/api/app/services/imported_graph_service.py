from typing import Any

from app.services.gsc_ingestion_service import list_imported_query_clusters
from app.services.page_sync_service import list_imported_pages
from app.services.product_sync_service import list_imported_products


_graph_stopwords = {
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


def build_imported_signal_graph(store_id: str) -> dict[str, Any]:
    products = list_imported_products(store_id)
    pages = list_imported_pages(store_id)
    query_clusters = []
    product_match_count = 0
    page_match_count = 0

    for cluster in list_imported_query_clusters(store_id):
        matched_products = _match_products(cluster, products)
        matched_pages = _match_pages(cluster, pages)
        best_existing_page = _best_existing_page(matched_pages)

        product_match_count += len(matched_products)
        page_match_count += len(matched_pages)
        query_clusters.append(
            {
                "best_existing_page": best_existing_page,
                "clicks": cluster["clicks"],
                "cluster_key": cluster["cluster_key"],
                "ctr": cluster["ctr"],
                "impressions": cluster["impressions"],
                "matched_pages": matched_pages,
                "matched_products": matched_products,
                "position": cluster["position"],
                "primary_query": cluster["primary_query"],
                "query_count": cluster["query_count"],
                "queries": cluster["queries"],
                "row_ids": cluster["row_ids"],
                "top_pages": cluster["top_pages"],
            }
        )

    return {
        "mode": "imported_graph",
        "query_clusters": query_clusters,
        "store_id": store_id,
        "summary": {
            "page_matches": page_match_count,
            "product_matches": product_match_count,
            "query_clusters": len(query_clusters),
        },
    }


def _match_products(cluster: dict[str, Any], products: list[dict[str, Any]]) -> list[dict[str, Any]]:
    cluster_tokens = _cluster_tokens(cluster)
    matches = []

    for product in products:
        product_tokens = _product_tokens(product)
        match_terms = sorted(cluster_tokens.intersection(product_tokens))
        if len(match_terms) < 3:
            continue
        matches.append(
            {
                "categories": product["categories"],
                "external_id": product["external_id"],
                "in_stock": product["in_stock"],
                "match_score": min(100, len(match_terms) * 25),
                "match_terms": match_terms,
                "name": product["name"],
                "product_id": product["id"],
                "sku": product["sku"],
                "status": product["status"],
            }
        )

    return sorted(matches, key=lambda match: (-match["match_score"], not match["in_stock"], match["name"]))[:5]


def _match_pages(cluster: dict[str, Any], pages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    pages_by_url = {page["url"]: page for page in pages}
    matched_by_id: dict[str, dict[str, Any]] = {}

    for top_page_url in cluster["top_pages"]:
        page = pages_by_url.get(top_page_url)
        if page is not None:
            matched_by_id[page["id"]] = _page_match(page, match_type="gsc_top_page", match_score=100)

    cluster_tokens = _cluster_tokens(cluster)
    for page in pages:
        if page["id"] in matched_by_id:
            continue
        page_tokens = _page_tokens(page)
        overlap = sorted(cluster_tokens.intersection(page_tokens))
        if len(overlap) < 3:
            continue
        matched_by_id[page["id"]] = _page_match(
            page,
            match_type="token_overlap",
            match_score=min(100, len(overlap) * 25),
            match_terms=overlap,
        )

    return sorted(
        matched_by_id.values(),
        key=lambda page: (
            page["match_type"] != "gsc_top_page",
            not page["indexable"],
            -page["match_score"],
            page["title"],
        ),
    )[:5]


def _best_existing_page(matched_pages: list[dict[str, Any]]) -> dict[str, Any] | None:
    for page in matched_pages:
        if page["indexable"] and page["status"] == "publish":
            return page
    return None


def _page_match(
    page: dict[str, Any],
    match_type: str,
    match_score: int,
    match_terms: list[str] | None = None,
) -> dict[str, Any]:
    return {
        "external_id": page["external_id"],
        "indexable": page["indexable"],
        "match_score": match_score,
        "match_terms": match_terms or [],
        "match_type": match_type,
        "page_id": page["id"],
        "page_type": page["page_type"],
        "status": page["status"],
        "title": page["title"],
        "url": page["url"],
    }


def _cluster_tokens(cluster: dict[str, Any]) -> set[str]:
    text = " ".join([cluster["primary_query"], *cluster["queries"]])
    return _text_tokens(text)


def _product_tokens(product: dict[str, Any]) -> set[str]:
    attribute_parts = []
    for name, options in product["attributes"].items():
        attribute_parts.append(name)
        attribute_parts.extend(options)
    text = " ".join(
        [
            product["name"],
            product["slug"] or "",
            " ".join(product["categories"]),
            " ".join(attribute_parts),
        ]
    )
    return _text_tokens(text)


def _page_tokens(page: dict[str, Any]) -> set[str]:
    seo = page.get("seo", {})
    text = " ".join(
        [
            page["title"],
            page["slug"] or "",
            page["url"],
            page["excerpt"],
            seo.get("title", ""),
            seo.get("description", ""),
        ]
    )
    return _text_tokens(text)


def _text_tokens(text: str) -> set[str]:
    normalized = "".join(character if character.isalnum() else " " for character in text.casefold())
    return {
        token
        for token in normalized.split()
        if len(token) > 1 and token not in _graph_stopwords
    }
