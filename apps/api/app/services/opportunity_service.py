from app.schemas.opportunity import OpportunityCreate
from app.services.scoring import ScoreComponents, calculate_trafscore


class OpportunityService:
    def create_collection_page_opportunity(
        self,
        title: str,
        summary: str,
        evidence: list[dict],
        score_components: ScoreComponents,
        confidence: float,
    ) -> OpportunityCreate:
        return OpportunityCreate(
            title=title,
            opportunity_type="collection_page",
            summary=summary,
            recommended_task_type="collection_page",
            trafscore=calculate_trafscore(score_components),
            confidence=confidence,
            evidence=evidence,
        )

