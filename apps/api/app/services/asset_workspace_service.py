from __future__ import annotations

import re
from copy import deepcopy
from typing import Any


BLOCKED_ASSET_CAPABILITIES = [
    "wordpress_draft_creation",
    "wordpress_publish",
    "woocommerce_writes",
]

_asset_drafts_by_store: dict[str, dict[str, dict[str, Any]]] = {}


def clear_asset_workspace() -> None:
    _asset_drafts_by_store.clear()


def list_asset_drafts(store_id: str) -> dict[str, Any]:
    assets = list(_asset_drafts_by_store.get(store_id, {}).values())
    return {
        "mode": "asset_draft_workspace",
        "store_id": store_id,
        "assets": [deepcopy(asset) for asset in assets],
        "summary": {
            "asset_drafts": len(assets),
            "ready_for_wordpress_draft": 0,
        },
        "external_write_allowed": False,
        "blocked_capabilities": BLOCKED_ASSET_CAPABILITIES,
    }


def get_asset_draft(store_id: str, asset_id: str) -> dict[str, Any] | None:
    asset = _asset_drafts_by_store.get(store_id, {}).get(asset_id)
    return deepcopy(asset) if asset is not None else None


def create_asset_draft_from_task(store_id: str, task: dict[str, Any]) -> dict[str, Any]:
    asset_id = f"asset_{task['id']}"
    asset = {
        "id": asset_id,
        "store_id": store_id,
        "source_task_id": task["id"],
        "source_task_status": task["status"],
        "asset_type": task.get("category", "content_asset"),
        "title": task["title"],
        "slug": _slugify(task["title"]),
        "review_state": "draft_candidate",
        "metadata": {
            "source": "demo_task",
            "opportunity_id": task.get("opportunity_id"),
            "automation_level": task.get("automation_level"),
        },
        "content_blocks": _build_content_blocks(task),
        "faq_items": [],
        "schema_json": {},
        "internal_links": [],
        "claim_ledger": _build_claim_ledger(task),
        "qa_checks": [
            {"key": "seo", "status": "pending"},
            {"key": "geo", "status": "pending"},
            {"key": "factual_grounding", "status": "pending"},
            {"key": "schema", "status": "pending"},
        ],
        "publish_preview": {
            "wordpress_draft_allowed": False,
            "external_write_allowed": False,
        },
        "external_write_allowed": False,
        "blocked_capabilities": BLOCKED_ASSET_CAPABILITIES,
    }
    _asset_drafts_by_store.setdefault(store_id, {})[asset_id] = deepcopy(asset)
    return deepcopy(asset)


def _build_content_blocks(task: dict[str, Any]) -> list[dict[str, Any]]:
    action_plan = task.get("action_plan", {})
    steps = action_plan.get("steps", [])
    acceptance_criteria = action_plan.get("acceptance_criteria", [])
    return [
        {
            "type": "answer_summary",
            "heading": task["title"],
            "body": task.get("summary", ""),
        },
        {
            "type": "internal_link_suggestions",
            "heading": "Execution plan",
            "items": steps,
        },
        {
            "type": "metadata_only",
            "heading": "Acceptance criteria",
            "items": acceptance_criteria,
        },
    ]


def _build_claim_ledger(task: dict[str, Any]) -> list[dict[str, Any]]:
    ledger = []
    for index, evidence in enumerate(task.get("evidence", []), start=1):
        ledger.append(
            {
                "id": f"claim_{index}",
                "source": evidence.get("source", "demo_evidence"),
                "text": evidence.get("text", ""),
            }
        )
    return ledger


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")
    return slug or "asset-draft"
