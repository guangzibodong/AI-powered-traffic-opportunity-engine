from dataclasses import dataclass, field


@dataclass(frozen=True)
class DemoProduct:
    id: str
    name: str
    category: str
    attributes: tuple[str, ...]
    stock_status: str
    readiness_score: float


@dataclass(frozen=True)
class DemoPage:
    id: str
    url: str
    title: str
    page_type: str
    indexable: bool = True


@dataclass(frozen=True)
class DemoQueryMetric:
    id: str
    query: str
    page_url: str | None
    impressions_28d: int
    clicks_28d: int
    average_position: float
    intent: str
    cluster_key: str | None = None

    @property
    def ctr(self) -> float:
        if self.impressions_28d == 0:
            return 0.0
        return round(self.clicks_28d / self.impressions_28d, 4)


@dataclass(frozen=True)
class DemoDecisioningFixture:
    store_id: str
    products: tuple[DemoProduct, ...] = field(default_factory=tuple)
    pages: tuple[DemoPage, ...] = field(default_factory=tuple)
    metrics: tuple[DemoQueryMetric, ...] = field(default_factory=tuple)


def load_demo_decisioning_fixture() -> DemoDecisioningFixture:
    products = (
        DemoProduct(
            id="prod-x1",
            name="Portable Espresso Maker X1",
            category="Portable Espresso Makers",
            attributes=("portable", "espresso", "camping", "manual", "outdoor"),
            stock_status="instock",
            readiness_score=86,
        ),
        DemoProduct(
            id="prod-rechargeable",
            name="Rechargeable Portable Espresso Maker",
            category="Portable Espresso Makers",
            attributes=("portable", "espresso", "rechargeable", "camping", "travel"),
            stock_status="instock",
            readiness_score=82,
        ),
        DemoProduct(
            id="prod-manual-pump",
            name="Manual Camping Espresso Pump",
            category="Portable Espresso Makers",
            attributes=("manual", "espresso", "camping", "lightweight"),
            stock_status="instock",
            readiness_score=78,
        ),
        DemoProduct(
            id="prod-outdoor-kit",
            name="Compact Outdoor Espresso Kit",
            category="Portable Espresso Makers",
            attributes=("compact", "espresso", "outdoor", "camping", "portable"),
            stock_status="instock",
            readiness_score=74,
        ),
        DemoProduct(
            id="prod-grinder",
            name="Rechargeable Coffee Grinder",
            category="Coffee Accessories",
            attributes=("rechargeable", "portable", "camping", "coffee"),
            stock_status="instock",
            readiness_score=76,
        ),
        DemoProduct(
            id="prod-kettle",
            name="Camping Kettle",
            category="Camping Coffee Gear",
            attributes=("camping", "kettle", "outdoor"),
            stock_status="outofstock",
            readiness_score=62,
        ),
    )
    pages = (
        DemoPage(
            id="page-x1",
            url="/products/portable-espresso-maker-x1",
            title="Portable Espresso Maker X1",
            page_type="product_page",
        ),
        DemoPage(
            id="page-rechargeable",
            url="/products/rechargeable-portable-espresso-maker",
            title="Rechargeable Portable Espresso Maker",
            page_type="product_page",
        ),
        DemoPage(
            id="page-guide",
            url="/blog/best-camping-coffee-maker",
            title="Best Camping Coffee Maker Guide",
            page_type="guide",
        ),
    )
    metrics = (
        DemoQueryMetric(
            id="query-portable-camping",
            query="portable espresso maker for camping",
            page_url=None,
            impressions_28d=1320,
            clicks_28d=31,
            average_position=18.4,
            intent="collection_commercial",
            cluster_key="portable espresso camping",
        ),
        DemoQueryMetric(
            id="query-manual-camping",
            query="manual portable espresso maker camping",
            page_url=None,
            impressions_28d=640,
            clicks_28d=16,
            average_position=21.0,
            intent="collection_commercial",
            cluster_key="portable espresso camping",
        ),
        DemoQueryMetric(
            id="query-rechargeable",
            query="rechargeable portable espresso maker",
            page_url="/products/rechargeable-portable-espresso-maker",
            impressions_28d=3100,
            clicks_28d=58,
            average_position=6.8,
            intent="product_commercial",
        ),
        DemoQueryMetric(
            id="query-best-camping",
            query="best camping coffee maker",
            page_url="/blog/best-camping-coffee-maker",
            impressions_28d=1680,
            clicks_28d=95,
            average_position=12.4,
            intent="commercial_investigation",
        ),
        DemoQueryMetric(
            id="query-low-noise",
            query="coffee mug lid replacement",
            page_url=None,
            impressions_28d=22,
            clicks_28d=0,
            average_position=54.0,
            intent="support",
        ),
    )
    return DemoDecisioningFixture(
        store_id="store-demo-outdoor-coffee",
        products=products,
        pages=pages,
        metrics=metrics,
    )

