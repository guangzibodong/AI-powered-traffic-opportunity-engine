from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class QueryProductMatch:
    store_id: str
    query_id: str
    product_id: str
    match_type: str
    confidence: float
    reason: str
    evidence: list[dict[str, Any]] = field(default_factory=list)


@dataclass(frozen=True)
class ProductPageLink:
    store_id: str
    product_id: str
    page_id: str
    link_type: str
    confidence: float
    source: str


@dataclass(frozen=True)
class OpportunityEntity:
    store_id: str
    opportunity_id: str
    entity_type: str
    entity_id: str
    role: str
    confidence: float

