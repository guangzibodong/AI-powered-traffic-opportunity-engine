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
    products = [
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
        DemoProduct(
            id="prod-nano-press",
            name="Nano Travel Espresso Press",
            category="Portable Espresso Makers",
            attributes=("portable", "espresso", "travel", "manual", "lightweight"),
            stock_status="instock",
            readiness_score=81,
        ),
        DemoProduct(
            id="prod-camp-barista",
            name="Camp Barista Espresso Brewer",
            category="Portable Espresso Makers",
            attributes=("camping", "espresso", "outdoor", "portable"),
            stock_status="instock",
            readiness_score=79,
        ),
        DemoProduct(
            id="prod-pocket-pump",
            name="Pocket Espresso Pump",
            category="Portable Espresso Makers",
            attributes=("portable", "espresso", "manual", "compact"),
            stock_status="instock",
            readiness_score=77,
        ),
        DemoProduct(
            id="prod-trail-espresso",
            name="Trail Espresso Maker",
            category="Portable Espresso Makers",
            attributes=("camping", "espresso", "trail", "portable"),
            stock_status="instock",
            readiness_score=83,
        ),
        DemoProduct(
            id="prod-ultralight-press",
            name="Ultralight Coffee Press",
            category="Camping Coffee Gear",
            attributes=("ultralight", "camping", "coffee", "portable"),
            stock_status="instock",
            readiness_score=72,
        ),
        DemoProduct(
            id="prod-titanium-mug",
            name="Titanium Camp Coffee Mug",
            category="Camping Coffee Gear",
            attributes=("camping", "mug", "titanium", "outdoor"),
            stock_status="instock",
            readiness_score=69,
        ),
        DemoProduct(
            id="prod-insulated-mug",
            name="Insulated Travel Coffee Mug",
            category="Travel Coffee Gear",
            attributes=("travel", "coffee", "insulated", "portable"),
            stock_status="instock",
            readiness_score=71,
        ),
        DemoProduct(
            id="prod-folding-dripper",
            name="Folding Pour Over Dripper",
            category="Camping Coffee Gear",
            attributes=("camping", "pour", "over", "dripper", "portable"),
            stock_status="instock",
            readiness_score=75,
        ),
        DemoProduct(
            id="prod-paper-filters",
            name="Trail Coffee Paper Filters",
            category="Coffee Accessories",
            attributes=("coffee", "filters", "camping", "portable"),
            stock_status="instock",
            readiness_score=67,
        ),
        DemoProduct(
            id="prod-burr-grinder",
            name="Compact Manual Burr Grinder",
            category="Coffee Grinders",
            attributes=("manual", "grinder", "coffee", "compact", "travel"),
            stock_status="instock",
            readiness_score=84,
        ),
        DemoProduct(
            id="prod-quiet-grinder",
            name="Quiet Rechargeable Burr Grinder",
            category="Coffee Grinders",
            attributes=("rechargeable", "grinder", "quiet", "portable"),
            stock_status="instock",
            readiness_score=80,
        ),
        DemoProduct(
            id="prod-scale",
            name="Pocket Coffee Scale",
            category="Coffee Accessories",
            attributes=("coffee", "scale", "travel", "portable"),
            stock_status="instock",
            readiness_score=73,
        ),
        DemoProduct(
            id="prod-cold-brew-bottle",
            name="Travel Cold Brew Bottle",
            category="Travel Coffee Gear",
            attributes=("travel", "cold", "brew", "coffee", "portable"),
            stock_status="instock",
            readiness_score=76,
        ),
        DemoProduct(
            id="prod-cleaning-kit",
            name="Portable Espresso Cleaning Kit",
            category="Coffee Accessories",
            attributes=("espresso", "cleaning", "portable", "travel"),
            stock_status="instock",
            readiness_score=70,
        ),
        DemoProduct(
            id="prod-replacement-seals",
            name="Espresso Maker Replacement Seals",
            category="Coffee Accessories",
            attributes=("espresso", "replacement", "seals", "portable"),
            stock_status="instock",
            readiness_score=68,
        ),
        DemoProduct(
            id="prod-bean-canister",
            name="Travel Coffee Bean Canister",
            category="Travel Coffee Gear",
            attributes=("travel", "coffee", "beans", "canister"),
            stock_status="instock",
            readiness_score=74,
        ),
        DemoProduct(
            id="prod-camp-stove-adapter",
            name="Camp Stove Coffee Adapter",
            category="Camping Coffee Gear",
            attributes=("camping", "stove", "coffee", "outdoor"),
            stock_status="instock",
            readiness_score=65,
        ),
    ]
    pages = [
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
        DemoPage(
            id="page-manual-grinder",
            url="/products/compact-manual-burr-grinder",
            title="Compact Manual Burr Grinder",
            page_type="product_page",
        ),
        DemoPage(
            id="page-pour-over",
            url="/blog/camping-pour-over-coffee",
            title="Camping Pour Over Coffee Guide",
            page_type="guide",
        ),
        DemoPage(
            id="page-travel-mug",
            url="/products/insulated-travel-coffee-mug",
            title="Insulated Travel Coffee Mug",
            page_type="product_page",
        ),
        DemoPage(
            id="page-cold-brew",
            url="/products/travel-cold-brew-bottle",
            title="Travel Cold Brew Bottle",
            page_type="product_page",
        ),
    ]
    metrics = [
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
    ]

    metrics.extend(
        [
            DemoQueryMetric(
                id="query-x1-ctr",
                query="portable espresso maker x1 review",
                page_url="/products/portable-espresso-maker-x1",
                impressions_28d=2200,
                clicks_28d=42,
                average_position=8.6,
                intent="product_commercial",
            ),
            DemoQueryMetric(
                id="query-manual-grinder-ctr",
                query="compact manual burr grinder",
                page_url="/products/compact-manual-burr-grinder",
                impressions_28d=2600,
                clicks_28d=55,
                average_position=9.2,
                intent="product_commercial",
            ),
            DemoQueryMetric(
                id="query-travel-mug-ctr",
                query="insulated travel coffee mug",
                page_url="/products/insulated-travel-coffee-mug",
                impressions_28d=1840,
                clicks_28d=36,
                average_position=10.4,
                intent="product_commercial",
            ),
            DemoQueryMetric(
                id="query-cold-brew-ctr",
                query="travel cold brew bottle",
                page_url="/products/travel-cold-brew-bottle",
                impressions_28d=1450,
                clicks_28d=24,
                average_position=11.1,
                intent="product_commercial",
            ),
            DemoQueryMetric(
                id="query-pour-over-ranking",
                query="camping pour over coffee",
                page_url="/blog/camping-pour-over-coffee",
                impressions_28d=2100,
                clicks_28d=126,
                average_position=9.8,
                intent="commercial_investigation",
            ),
            DemoQueryMetric(
                id="query-camp-espresso-ranking",
                query="best portable espresso maker camping",
                page_url="/blog/best-camping-coffee-maker",
                impressions_28d=2400,
                clicks_28d=146,
                average_position=7.9,
                intent="commercial_investigation",
            ),
            DemoQueryMetric(
                id="query-x1-ranking",
                query="portable espresso maker for travel",
                page_url="/products/portable-espresso-maker-x1",
                impressions_28d=1900,
                clicks_28d=88,
                average_position=13.2,
                intent="product_commercial",
            ),
            DemoQueryMetric(
                id="query-grinder-ranking",
                query="best manual coffee grinder for camping",
                page_url="/products/compact-manual-burr-grinder",
                impressions_28d=1600,
                clicks_28d=74,
                average_position=14.1,
                intent="commercial_investigation",
            ),
        ]
    )

    long_tail_pages = (
        "/products/portable-espresso-maker-x1",
        "/products/rechargeable-portable-espresso-maker",
        "/blog/best-camping-coffee-maker",
        "/products/compact-manual-burr-grinder",
        "/blog/camping-pour-over-coffee",
        "/products/insulated-travel-coffee-mug",
        "/products/travel-cold-brew-bottle",
    )
    for index in range(1, 39):
        page_url = long_tail_pages[index % len(long_tail_pages)]
        metrics.append(
            DemoQueryMetric(
                id=f"query-long-tail-{index:02d}",
                query=f"camp coffee accessory long tail {index}",
                page_url=page_url,
                impressions_28d=120 + index * 7,
                clicks_28d=1 + index % 4,
                average_position=24.0 + index % 18,
                intent="long_tail_research",
            )
        )

    return DemoDecisioningFixture(
        store_id="store-demo-outdoor-coffee",
        products=tuple(products),
        pages=tuple(pages),
        metrics=tuple(metrics),
    )
