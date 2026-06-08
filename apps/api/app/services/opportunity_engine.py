from app.schemas.opportunity import OpportunityCreate
from app.services.graph_builder_service import DecisioningGraph, QueryCluster
from app.services.scoring import ScoreComponents, calculate_trafscore


RULE_VERSION = 1


class OpportunityEngine:
    def generate(self, graph: DecisioningGraph) -> list[OpportunityCreate]:
        opportunities = []
        opportunities.extend(self._collection_page_gaps(graph))
        opportunities.extend(self._high_impression_low_ctr(graph))
        opportunities.extend(self._ranking_push(graph))
        return self._dedupe(opportunities)

    def _collection_page_gaps(self, graph: DecisioningGraph) -> list[OpportunityCreate]:
        opportunities = []
        for cluster in graph.query_clusters.values():
            if cluster.best_existing_page is not None or len(cluster.matched_products) < 3:
                continue
            score_components = {
                "traffic_potential": min(100, cluster.total_impressions / 20),
                "intent_score": 88,
                "product_fit_score": 90,
                "revenue_fit_score": 72,
                "inventory_score": 94,
                "gap_score": 96,
                "timing_score": 82,
                "execution_ease": 78,
                "confidence_score": 84,
            }
            opportunities.append(
                OpportunityCreate(
                    title=f"Create collection page for {cluster.primary_query.title()}",
                    opportunity_type="collection_page_gap",
                    summary=(
                        "Search demand maps to multiple in-stock products, but no dedicated "
                        "collection page exists."
                    ),
                    recommended_task_type="collection_page",
                    trafscore=self._score(score_components),
                    confidence=0.84,
                    evidence=self._collection_evidence(cluster),
                    rule_id="collection_page_gap",
                    rule_version=RULE_VERSION,
                    score_components=score_components,
                    dedupe_key=f"{graph.store_id}:collection_page_gap:{cluster.key}",
                )
            )
        return opportunities

    def _high_impression_low_ctr(self, graph: DecisioningGraph) -> list[OpportunityCreate]:
        pages_by_url = graph.pages_by_url
        opportunities = []
        for metric in graph.metrics:
            page = pages_by_url.get(metric.page_url or "")
            if page is None:
                continue
            if metric.impressions_28d < 1000 or metric.ctr > 0.03 or metric.average_position > 20:
                continue
            score_components = {
                "traffic_potential": 92,
                "intent_score": 86,
                "product_fit_score": 82,
                "revenue_fit_score": 76,
                "inventory_score": 80,
                "gap_score": 88,
                "timing_score": 74,
                "execution_ease": 96,
                "confidence_score": 82,
            }
            opportunities.append(
                OpportunityCreate(
                    title=f"Improve CTR for {metric.query}",
                    opportunity_type="high_impression_low_ctr",
                    summary="The page receives strong impressions but underperforms on CTR.",
                    recommended_task_type="ctr_refresh",
                    trafscore=self._score(score_components),
                    confidence=0.82,
                    evidence=[
                        {
                            "type": "gsc_ctr",
                            "text": f"{metric.impressions_28d} impressions with {metric.ctr:.1%} CTR",
                            "metrics": {
                                "query": metric.query,
                                "page_url": page.url,
                                "impressions": metric.impressions_28d,
                                "clicks": metric.clicks_28d,
                                "ctr": metric.ctr,
                                "position": metric.average_position,
                            },
                        },
                        {
                            "type": "existing_page",
                            "text": f"Existing page can be refreshed: {page.title}",
                            "entityRefs": [{"type": "page", "id": page.id}],
                        },
                    ],
                    rule_id="high_impression_low_ctr",
                    rule_version=RULE_VERSION,
                    score_components=score_components,
                    dedupe_key=f"{graph.store_id}:high_impression_low_ctr:{metric.id}:{page.id}",
                )
            )
        return opportunities

    def _ranking_push(self, graph: DecisioningGraph) -> list[OpportunityCreate]:
        pages_by_url = graph.pages_by_url
        opportunities = []
        for metric in graph.metrics:
            page = pages_by_url.get(metric.page_url or "")
            if page is None:
                continue
            if not (4 <= metric.average_position <= 20):
                continue
            if metric.impressions_28d < 800 or metric.ctr <= 0.03:
                continue
            score_components = {
                "traffic_potential": 84,
                "intent_score": 80,
                "product_fit_score": 74,
                "revenue_fit_score": 68,
                "inventory_score": 76,
                "gap_score": 82,
                "timing_score": 70,
                "execution_ease": 82,
                "confidence_score": 80,
            }
            opportunities.append(
                OpportunityCreate(
                    title=f"Push ranking for {metric.query}",
                    opportunity_type="ranking_push",
                    summary="The page is within striking distance and can be expanded or internally linked.",
                    recommended_task_type="ranking_push",
                    trafscore=self._score(score_components),
                    confidence=0.8,
                    evidence=[
                        {
                            "type": "gsc_position",
                            "text": f"Average position {metric.average_position} with {metric.impressions_28d} impressions",
                            "metrics": {
                                "query": metric.query,
                                "page_url": page.url,
                                "impressions": metric.impressions_28d,
                                "clicks": metric.clicks_28d,
                                "ctr": metric.ctr,
                                "position": metric.average_position,
                            },
                        },
                        {
                            "type": "existing_page",
                            "text": f"Existing page can receive content and internal-link support: {page.title}",
                            "entityRefs": [{"type": "page", "id": page.id}],
                        },
                    ],
                    rule_id="ranking_push",
                    rule_version=RULE_VERSION,
                    score_components=score_components,
                    dedupe_key=f"{graph.store_id}:ranking_push:{metric.id}:{page.id}",
                )
            )
        return opportunities

    def _collection_evidence(self, cluster: QueryCluster) -> list[dict]:
        return [
            {
                "type": "query_cluster",
                "text": f"{cluster.primary_query} cluster has {cluster.total_impressions} impressions",
                "metrics": {
                    "cluster_key": cluster.key,
                    "total_impressions": cluster.total_impressions,
                },
            },
            {
                "type": "product_fit",
                "text": f"{len(cluster.matched_products)} in-stock products match this cluster",
                "entityRefs": [
                    {"type": "product", "id": product.id} for product in cluster.matched_products
                ],
            },
            {
                "type": "page_gap",
                "text": "No existing collection or category page strongly matches this cluster",
            },
        ]

    def _score(self, values: dict[str, float]) -> float:
        return calculate_trafscore(ScoreComponents(**values))

    def _dedupe(self, opportunities: list[OpportunityCreate]) -> list[OpportunityCreate]:
        by_key = {}
        for opportunity in opportunities:
            key = opportunity.dedupe_key or opportunity.title
            if key not in by_key:
                by_key[key] = opportunity
        return sorted(by_key.values(), key=lambda item: (-item.trafscore, item.dedupe_key or ""))

