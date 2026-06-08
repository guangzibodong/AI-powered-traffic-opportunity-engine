from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class ScoreComponents:
    traffic_potential: float
    intent_score: float
    product_fit_score: float
    revenue_fit_score: float
    inventory_score: float
    gap_score: float
    timing_score: float
    execution_ease: float
    confidence_score: float


@dataclass(frozen=True)
class ProductReadinessComponents:
    stock_score: float
    content_completeness: float
    structured_data_completeness: float
    review_score: float
    image_score: float
    price_competitiveness: float
    conversion_proxy: float


TRAFSCORE_WEIGHTS = {
    "traffic_potential": 0.18,
    "intent_score": 0.16,
    "product_fit_score": 0.14,
    "revenue_fit_score": 0.14,
    "inventory_score": 0.10,
    "gap_score": 0.12,
    "timing_score": 0.08,
    "execution_ease": 0.05,
    "confidence_score": 0.03,
}

PRODUCT_READINESS_WEIGHTS = {
    "stock_score": 0.25,
    "content_completeness": 0.20,
    "structured_data_completeness": 0.15,
    "review_score": 0.10,
    "image_score": 0.10,
    "price_competitiveness": 0.10,
    "conversion_proxy": 0.10,
}


def calculate_trafscore(components: ScoreComponents) -> float:
    values = asdict(components)
    _validate_score_components(values)
    score = sum(values[name] * weight for name, weight in TRAFSCORE_WEIGHTS.items())
    return round(score, 2)


def calculate_product_readiness(components: ProductReadinessComponents) -> float:
    values = asdict(components)
    _validate_score_components(values)
    score = sum(values[name] * weight for name, weight in PRODUCT_READINESS_WEIGHTS.items())
    return round(score, 2)


def _validate_score_components(values: dict[str, float]) -> None:
    for name, value in values.items():
        if value < 0 or value > 100:
            raise ValueError(f"{name} must be between 0 and 100")

