import hashlib
from typing import Any

from app.services.audit_log_service import record_audit_log


_integration_state_by_store: dict[str, dict[str, dict[str, Any]]] = {}
_sync_runs_by_store: dict[str, list[dict[str, Any]]] = {}

_provider_specs = {
    "gsc": {
        "blocked_capabilities": ["real_gsc_oauth"],
        "connection_mode": "csv_import_or_read_only_stub",
        "name": "Google Search Console",
        "safe_operations": ["import_csv", "read_imported_queries", "preview_sync_run"],
        "sync_step": "check_imported_gsc_rows",
    },
    "wordpress": {
        "blocked_capabilities": ["wordpress_writes", "wordpress_drafts", "live_publish"],
        "connection_mode": "stub_read_only",
        "name": "WordPress",
        "safe_operations": ["import_pages_fixture", "read_imported_pages", "preview_sync_run"],
        "sync_step": "check_imported_wordpress_pages",
    },
    "woocommerce": {
        "blocked_capabilities": ["woocommerce_writes"],
        "connection_mode": "stub_read_only",
        "name": "WooCommerce",
        "safe_operations": ["import_products_fixture", "read_imported_products", "preview_sync_run"],
        "sync_step": "check_imported_woocommerce_products",
    },
}

_sync_step_order = ("gsc", "woocommerce", "wordpress")
_blocked_sync_capabilities = ["real_gsc_oauth", "woocommerce_writes", "wordpress_writes", "live_publish"]


def clear_integration_tracking_state() -> None:
    _integration_state_by_store.clear()
    _sync_runs_by_store.clear()


def list_integrations(store_id: str) -> dict[str, Any]:
    return {
        "integrations": [_integration_payload(store_id, provider) for provider in _provider_specs],
        "mode": "integration_status",
        "store_id": store_id,
        "summary": _integration_summary(store_id),
    }


def record_integration_connection(store_id: str, provider: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
    _require_provider(provider)
    state_for_store = _integration_state_by_store.setdefault(store_id, {})
    spec = _provider_specs[provider]
    state_for_store[provider] = {
        "connection_mode": spec["connection_mode"],
        "status": "connected_stub",
    }
    integration = _integration_payload(store_id, provider)
    record_audit_log(
        store_id,
        action="integration.connected_stub",
        actor=_actor_from_payload(payload),
        target_id=provider,
        target_type="integration",
        metadata={
            "connection_mode": integration["connection_mode"],
            "external_write_allowed": integration["external_write_allowed"],
            "provider": provider,
            "safe_operations": integration["safe_operations"],
        },
    )
    return integration


def enqueue_sync_run(store_id: str, requested_by: str = "manual") -> dict[str, Any]:
    runs = _sync_runs_by_store.setdefault(store_id, [])
    sequence = len(runs) + 1
    run_id = _build_id("syncrun", store_id, str(sequence))
    steps = [_sync_step_payload(run_id, provider, index + 1) for index, provider in enumerate(_sync_step_order)]
    run = {
        "blocked_capabilities": list(_blocked_sync_capabilities),
        "execution_mode": "tracking_only",
        "id": run_id,
        "mode": "sync_run_tracking",
        "requested_by": requested_by or "manual",
        "run_type": "store_sync_preview",
        "sequence": sequence,
        "status": "queued",
        "steps": steps,
        "store_id": store_id,
        "summary": {
            "external_writes": 0,
            "steps": len(steps),
        },
    }
    runs.append(run)
    _mark_last_sync_run(store_id, run_id)
    record_audit_log(
        store_id,
        action="sync.queued",
        actor=run["requested_by"],
        target_id=run_id,
        target_type="sync_run",
        metadata={
            "blocked_capabilities": run["blocked_capabilities"],
            "execution_mode": run["execution_mode"],
            "steps": [step["provider"] for step in steps],
        },
    )
    return run


def list_sync_runs(store_id: str) -> dict[str, Any]:
    runs = list(_sync_runs_by_store.get(store_id, []))
    return {
        "mode": "sync_run_tracking",
        "store_id": store_id,
        "summary": {
            "queued": sum(1 for run in runs if run["status"] == "queued"),
            "sync_runs": len(runs),
        },
        "sync_runs": sorted(runs, key=lambda run: (-run["sequence"], run["id"])),
    }


def get_sync_run(store_id: str, sync_run_id: str) -> dict[str, Any] | None:
    return next((run for run in _sync_runs_by_store.get(store_id, []) if run["id"] == sync_run_id), None)


def _integration_payload(store_id: str, provider: str) -> dict[str, Any]:
    _require_provider(provider)
    spec = _provider_specs[provider]
    state = _integration_state_by_store.get(store_id, {}).get(provider, {})
    return {
        "blocked_capabilities": list(spec["blocked_capabilities"]),
        "connection_mode": state.get("connection_mode", "not_connected"),
        "external_write_allowed": False,
        "key": provider,
        "last_sync_run_id": state.get("last_sync_run_id"),
        "name": spec["name"],
        "safe_operations": list(spec["safe_operations"]),
        "status": state.get("status", "not_connected"),
    }


def _integration_summary(store_id: str) -> dict[str, int]:
    integrations = [_integration_payload(store_id, provider) for provider in _provider_specs]
    return {
        "connected_stub": sum(1 for item in integrations if item["status"] == "connected_stub"),
        "external_writes": 0,
        "not_connected": sum(1 for item in integrations if item["status"] == "not_connected"),
    }


def _sync_step_payload(sync_run_id: str, provider: str, sequence: int) -> dict[str, Any]:
    spec = _provider_specs[provider]
    return {
        "blocked_capabilities": list(spec["blocked_capabilities"]),
        "external_write_allowed": False,
        "id": _build_id("syncstep", sync_run_id, provider),
        "operation": "tracking_only",
        "provider": provider,
        "records_failed": 0,
        "records_seen": 0,
        "records_skipped": 0,
        "records_upserted": 0,
        "sequence": sequence,
        "status": "queued",
        "step_name": spec["sync_step"],
        "sync_run_id": sync_run_id,
    }


def _mark_last_sync_run(store_id: str, sync_run_id: str) -> None:
    state_for_store = _integration_state_by_store.setdefault(store_id, {})
    for provider in _provider_specs:
        provider_state = state_for_store.setdefault(provider, {"connection_mode": "not_connected", "status": "not_connected"})
        provider_state["last_sync_run_id"] = sync_run_id


def _require_provider(provider: str) -> None:
    if provider not in _provider_specs:
        raise ValueError(f"Unsupported integration provider: {provider}")


def _actor_from_payload(payload: dict[str, Any] | None) -> str:
    if not isinstance(payload, dict):
        return "system"
    actor = payload.get("actor") or payload.get("requested_by") or "system"
    return actor if isinstance(actor, str) and actor.strip() else "system"


def _build_id(prefix: str, *parts: str) -> str:
    key = "|".join(parts)
    return f"{prefix}_{hashlib.sha1(key.encode('utf-8')).hexdigest()[:12]}"
