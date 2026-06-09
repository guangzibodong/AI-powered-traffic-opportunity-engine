import hashlib
from typing import Any

from app.services.imported_opportunity_service import generate_imported_opportunities


def generate_imported_tasks(store_id: str) -> dict[str, Any]:
    opportunity_payload = generate_imported_opportunities(store_id)
    tasks = [_task_from_opportunity(opportunity) for opportunity in opportunity_payload["opportunities"]]

    return {
        "mode": "imported_task_previews",
        "store_id": store_id,
        "summary": {
            "by_automation_level": _count_by_automation_level(tasks),
            "by_category": _count_by_category(tasks),
            "by_rule": _count_by_rule(tasks),
            "by_status": _count_by_status(tasks),
            "source_opportunities": opportunity_payload["summary"]["opportunities"],
            "tasks": len(tasks),
        },
        "tasks": tasks,
    }


def get_imported_task(store_id: str, task_id: str) -> dict[str, Any] | None:
    tasks = generate_imported_tasks(store_id)["tasks"]
    return next((task for task in tasks if task["id"] == task_id), None)


def _task_from_opportunity(opportunity: dict[str, Any]) -> dict[str, Any]:
    category = opportunity["recommended_task_type"]
    task_id = _task_id(opportunity["dedupe_key"])
    return {
        "action_plan": _action_plan_for_opportunity(opportunity),
        "automation_level": "recommend_only",
        "category": category,
        "evidence": opportunity["evidence"],
        "id": task_id,
        "opportunity_id": opportunity["id"],
        "priority_score": opportunity["trafscore"],
        "related_page": opportunity["related_page"],
        "related_products": opportunity["related_products"],
        "source_opportunity": {
            "dedupe_key": opportunity["dedupe_key"],
            "rule_id": opportunity["rule_id"],
            "rule_version": opportunity["rule_version"],
        },
        "status": "new",
        "title": opportunity["title"],
    }


def _action_plan_for_opportunity(opportunity: dict[str, Any]) -> dict[str, Any]:
    if opportunity["recommended_task_type"] == "collection_page":
        steps = [
            "Review matched imported products and query cluster",
            "Draft page brief and URL recommendation",
            "List internal links and product inclusion criteria",
            "Do not create WordPress draft from this preview",
        ]
        acceptance_criteria = [
            "Task preview references imported query and product evidence",
            "Matched products are reviewed before any content work",
            "WordPress draft is not created by this preview",
        ]
    elif opportunity["recommended_task_type"] == "ctr_refresh":
        steps = [
            "Review existing title and meta against imported query evidence",
            "Draft title and meta recommendations for human review",
            "Record baseline clicks, impressions, CTR, and position",
            "Do not publish or update WordPress from this preview",
        ]
        acceptance_criteria = [
            "Task preview references imported GSC and page evidence",
            "Recommendation is reviewed by a human before execution",
            "No WordPress update is made by this preview",
        ]
    elif opportunity["recommended_task_type"] == "ranking_push":
        steps = [
            "Review existing page ranking evidence and SERP intent",
            "Draft internal link and on-page improvement recommendations for human review",
            "Record baseline clicks, impressions, CTR, and position",
            "Do not publish or update WordPress from this preview",
        ]
        acceptance_criteria = [
            "Task preview references imported GSC and existing page evidence",
            "Recommendation is reviewed by a human before execution",
            "No WordPress update is made by this preview",
        ]
    elif opportunity["recommended_task_type"] == "buying_guide":
        steps = [
            "Review buying-guide query intent and imported product evidence",
            "Draft comparison criteria, outline, and product inclusion notes for human review",
            "Record baseline impressions, CTR, and average position",
            "Do not create a WordPress draft from this preview",
        ]
        acceptance_criteria = [
            "Task preview references buying-guide intent and product evidence",
            "Product inclusion criteria are reviewed by a human before execution",
            "No WordPress draft or product update is created by this preview",
        ]
    elif opportunity["recommended_task_type"] == "product_seo":
        steps = [
            "Review imported product match and query cluster evidence",
            "Draft product title, meta, and copy recommendations for human review",
            "Record baseline clicks, impressions, CTR, and position",
            "Do not update WooCommerce from this preview",
        ]
        acceptance_criteria = [
            "Task preview references imported GSC and product evidence",
            "Recommendation is reviewed by a human before execution",
            "No WooCommerce product data is changed by this preview",
        ]
    else:
        steps = [
            "Review imported opportunity evidence",
            "Decide the next manual action",
            "Track outcome after execution",
        ]
        acceptance_criteria = [
            "Task preview has evidence and a measurable follow-up",
            "No external write is made by this preview",
        ]

    return {
        "acceptance_criteria": acceptance_criteria,
        "automation_level": "recommend_only",
        "confidence": opportunity["confidence"],
        "source_summary": opportunity["summary"],
        "steps": steps,
        "task_category": opportunity["recommended_task_type"],
        "task_title": opportunity["title"],
    }


def _count_by_category(tasks: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for task in tasks:
        counts[task["category"]] = counts.get(task["category"], 0) + 1
    return counts


def _count_by_automation_level(tasks: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for task in tasks:
        automation_level = task["automation_level"]
        counts[automation_level] = counts.get(automation_level, 0) + 1
    return counts


def _count_by_rule(tasks: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for task in tasks:
        rule_id = task["source_opportunity"]["rule_id"]
        counts[rule_id] = counts.get(rule_id, 0) + 1
    return counts


def _count_by_status(tasks: list[dict[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for task in tasks:
        status = task["status"]
        counts[status] = counts.get(status, 0) + 1
    return counts


def _task_id(dedupe_key: str) -> str:
    return f"imptask_{hashlib.sha1(dedupe_key.encode('utf-8')).hexdigest()[:12]}"
