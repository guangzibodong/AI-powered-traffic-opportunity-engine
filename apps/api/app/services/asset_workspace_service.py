from __future__ import annotations

import re
from copy import deepcopy
from typing import Any


BLOCKED_ASSET_CAPABILITIES = [
    "wordpress_draft_creation",
    "wordpress_publish",
    "woocommerce_writes",
]

ALLOWED_ASSET_UPDATE_FIELDS = {
    "title",
    "slug",
    "meta_title",
    "meta_description",
    "content_blocks",
    "faq_items",
    "schema_json",
    "internal_links",
    "editor_note",
}

ALLOWED_CONTENT_BLOCK_TYPES = {
    "answer_summary",
    "section",
    "faq",
    "internal_link_suggestions",
    "metadata_only",
    "product_grid_notes",
}

FORBIDDEN_ASSET_UPDATE_FIELDS = {
    "id",
    "store_id",
    "source_task_id",
    "source_task_status",
    "asset_type",
    "review_state",
    "claim_ledger",
    "qa_checks",
    "publish_preview",
    "external_write_allowed",
    "blocked_capabilities",
    "wordpress_draft_id",
    "wordpress_post_id",
    "wp_post_id",
    "published_url",
    "wordpress_status",
    "wordpress_url",
    "external_url",
    "permalink",
    "href",
}

CREDENTIAL_FIELD_MARKERS = {
    "api_key",
    "credential",
    "credentials",
    "oauth",
    "password",
    "secret",
    "token",
}

_asset_drafts_by_store: dict[str, dict[str, dict[str, Any]]] = {}


class AssetDraftUpdateError(ValueError):
    def __init__(self, status_code: int, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


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


def update_asset_draft(store_id: str, asset_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    asset = _asset_drafts_by_store.get(store_id, {}).get(asset_id)
    if asset is None:
        return None
    if not isinstance(payload, dict) or not payload:
        raise AssetDraftUpdateError(400, "Asset update payload must be a non-empty object")

    _reject_unsafe_update_payload(payload)

    updated = deepcopy(asset)
    for field, value in payload.items():
        if field == "title":
            updated[field] = _clean_text(value, field)
        elif field == "slug":
            updated[field] = _slugify(_clean_text(value, field))
        elif field in {"meta_title", "meta_description", "editor_note"}:
            updated[field] = _clean_text(value, field)
        elif field == "content_blocks":
            updated[field] = _validate_content_blocks(value)
        elif field == "faq_items":
            updated[field] = _validate_faq_items(value)
        elif field == "schema_json":
            updated[field] = _validate_schema_json(value)
        elif field == "internal_links":
            updated[field] = _validate_internal_links(value)

    updated["external_write_allowed"] = False
    updated["blocked_capabilities"] = BLOCKED_ASSET_CAPABILITIES
    updated.setdefault("publish_preview", {})
    updated["publish_preview"]["wordpress_draft_allowed"] = False
    updated["publish_preview"]["external_write_allowed"] = False

    _asset_drafts_by_store[store_id][asset_id] = deepcopy(updated)
    return deepcopy(updated)


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


def _reject_unsafe_update_payload(payload: dict[str, Any]) -> None:
    for key in _iter_payload_keys(payload):
        normalized = key.casefold()
        if normalized in CREDENTIAL_FIELD_MARKERS or any(marker in normalized for marker in CREDENTIAL_FIELD_MARKERS):
            raise AssetDraftUpdateError(403, "Credential-like asset update fields are not allowed")
        if normalized in FORBIDDEN_ASSET_UPDATE_FIELDS:
            raise AssetDraftUpdateError(403, "External write asset fields are not allowed")

    for field in payload:
        if field not in ALLOWED_ASSET_UPDATE_FIELDS:
            raise AssetDraftUpdateError(400, f"Unknown asset update field: {field}")


def _iter_payload_keys(value: Any) -> list[str]:
    keys: list[str] = []
    if isinstance(value, dict):
        for key, nested_value in value.items():
            keys.append(str(key))
            keys.extend(_iter_payload_keys(nested_value))
    elif isinstance(value, list):
        for item in value:
            keys.extend(_iter_payload_keys(item))
    return keys


def _clean_text(value: Any, field: str) -> str:
    if not isinstance(value, str):
        raise AssetDraftUpdateError(400, f"{field} must be a string")
    cleaned = value.strip()
    _reject_raw_html(cleaned)
    return cleaned


def _reject_raw_html(value: str) -> None:
    if "<" in value or ">" in value:
        raise AssetDraftUpdateError(400, "Raw HTML is not allowed in local asset edits")
    if re.search(r"https?://", value, flags=re.IGNORECASE):
        raise AssetDraftUpdateError(400, "External href values are not allowed in local asset edits")


def _validate_content_blocks(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        raise AssetDraftUpdateError(400, "content_blocks must be a list")

    blocks = []
    for block in value:
        if not isinstance(block, dict):
            raise AssetDraftUpdateError(400, "content block entries must be objects")
        block_type = block.get("type")
        if block_type not in ALLOWED_CONTENT_BLOCK_TYPES:
            raise AssetDraftUpdateError(400, "Unsupported content block type")

        clean_block: dict[str, Any] = {"type": block_type}
        if "heading" in block:
            clean_block["heading"] = _clean_text(block["heading"], "content block heading")
        if "body" in block:
            clean_block["body"] = _clean_text(block["body"], "content block body")
        if "items" in block:
            clean_block["items"] = _validate_text_list(block["items"], "content block items")
        blocks.append(clean_block)
    return blocks


def _validate_faq_items(value: Any) -> list[dict[str, str]]:
    if not isinstance(value, list):
        raise AssetDraftUpdateError(400, "faq_items must be a list")

    items = []
    for item in value:
        if not isinstance(item, dict):
            raise AssetDraftUpdateError(400, "FAQ item entries must be objects")
        items.append(
            {
                "question": _clean_text(item.get("question", ""), "FAQ question"),
                "answer": _clean_text(item.get("answer", ""), "FAQ answer"),
            }
        )
    return items


def _validate_schema_json(value: Any) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise AssetDraftUpdateError(400, "schema_json must be an object")
    for nested_value in _iter_payload_strings(value):
        _reject_raw_html(nested_value)
    return deepcopy(value)


def _validate_internal_links(value: Any) -> list[str]:
    return _validate_text_list(value, "internal_links")


def _validate_text_list(value: Any, field: str) -> list[str]:
    if not isinstance(value, list):
        raise AssetDraftUpdateError(400, f"{field} must be a list")
    return [_clean_text(item, field) for item in value]


def _iter_payload_strings(value: Any) -> list[str]:
    strings: list[str] = []
    if isinstance(value, str):
        strings.append(value)
    elif isinstance(value, dict):
        for nested_value in value.values():
            strings.extend(_iter_payload_strings(nested_value))
    elif isinstance(value, list):
        for item in value:
            strings.extend(_iter_payload_strings(item))
    return strings
