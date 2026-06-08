from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class OpportunityCreate:
    title: str
    opportunity_type: str
    summary: str
    recommended_task_type: str
    trafscore: float
    confidence: float
    evidence: list[dict[str, Any]] = field(default_factory=list)
    rule_id: str = "manual"
    rule_version: int = 1
    score_components: dict[str, float] = field(default_factory=dict)
    dedupe_key: str | None = None
    generated_by_sync_run_id: str | None = None


@dataclass(frozen=True)
class Opportunity(OpportunityCreate):
    id: str = ""
    status: str = "new"
