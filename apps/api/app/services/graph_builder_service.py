from dataclasses import dataclass, field

from app.fixtures.demo_decisioning import DemoDecisioningFixture, DemoPage, DemoProduct, DemoQueryMetric


@dataclass(frozen=True)
class QueryCluster:
    key: str
    primary_query: str
    metrics: tuple[DemoQueryMetric, ...]
    matched_products: tuple[DemoProduct, ...]
    best_existing_page: DemoPage | None

    @property
    def total_impressions(self) -> int:
        return sum(metric.impressions_28d for metric in self.metrics)


@dataclass(frozen=True)
class DecisioningGraph:
    store_id: str
    products: tuple[DemoProduct, ...]
    pages: tuple[DemoPage, ...]
    metrics: tuple[DemoQueryMetric, ...]
    query_clusters: dict[str, QueryCluster] = field(default_factory=dict)

    @property
    def pages_by_url(self) -> dict[str, DemoPage]:
        return {page.url: page for page in self.pages}


class GraphBuilderService:
    def build(self, fixture: DemoDecisioningFixture) -> DecisioningGraph:
        clusters: dict[str, QueryCluster] = {}
        grouped_metrics: dict[str, list[DemoQueryMetric]] = {}
        for metric in fixture.metrics:
            if metric.cluster_key:
                grouped_metrics.setdefault(metric.cluster_key, []).append(metric)

        for key, metrics in grouped_metrics.items():
            matched_products = self._match_products(key=key, products=fixture.products)
            clusters[key] = QueryCluster(
                key=key,
                primary_query=max(metrics, key=lambda item: item.impressions_28d).query,
                metrics=tuple(sorted(metrics, key=lambda item: item.query)),
                matched_products=tuple(matched_products),
                best_existing_page=self._find_existing_collection_page(key, fixture.pages),
            )

        return DecisioningGraph(
            store_id=fixture.store_id,
            products=fixture.products,
            pages=fixture.pages,
            metrics=fixture.metrics,
            query_clusters=clusters,
        )

    def _match_products(self, key: str, products: tuple[DemoProduct, ...]) -> list[DemoProduct]:
        terms = set(key.split())
        matches: list[tuple[int, DemoProduct]] = []
        for product in products:
            if product.stock_status != "instock":
                continue
            haystack = " ".join((product.name, product.category, " ".join(product.attributes))).lower()
            overlap = len(terms.intersection(haystack.split()))
            if overlap >= 2:
                matches.append((overlap, product))
        return [product for _, product in sorted(matches, key=lambda item: (-item[0], item[1].id))]

    def _find_existing_collection_page(
        self,
        key: str,
        pages: tuple[DemoPage, ...],
    ) -> DemoPage | None:
        terms = set(key.split())
        for page in pages:
            if page.page_type not in {"collection_page", "category_page"} or not page.indexable:
                continue
            title_terms = set(page.title.lower().split())
            if len(terms.intersection(title_terms)) >= 2:
                return page
        return None

