import hashlib
from typing import Any


_audit_logs_by_store: dict[str, list[dict[str, Any]]] = {}
_sensitive_key_fragments = ("password", "secret", "token", "api_key", "access_key")


def clear_audit_logs() -> None:
    _audit_logs_by_store.clear()


def record_audit_log(
    store_id: str,
    *,
    action: str,
    target_type: str,
    target_id: str,
    actor: str = "system",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    logs = _audit_logs_by_store.setdefault(store_id, [])
    sequence = len(logs) + 1
    entry = {
        "action": action,
        "actor": actor or "system",
        "external_write_allowed": False,
        "id": _build_audit_id(store_id, sequence, action, target_type, target_id),
        "metadata": _sanitize_metadata(metadata or {}),
        "mode": "audit_logs",
        "safety_scope": "local_tracking_only",
        "sequence": sequence,
        "store_id": store_id,
        "target_id": target_id,
        "target_type": target_type,
    }
    logs.append(entry)
    return entry


def list_audit_logs(store_id: str) -> dict[str, Any]:
    logs = list(_audit_logs_by_store.get(store_id, []))
    return {
        "audit_logs": sorted(logs, key=lambda entry: (-entry["sequence"], entry["id"])),
        "mode": "audit_logs",
        "store_id": store_id,
        "summary": {
            "audit_logs": len(logs),
            "external_writes": 0,
        },
    }


def get_audit_log(store_id: str, audit_log_id: str) -> dict[str, Any] | None:
    return next((entry for entry in _audit_logs_by_store.get(store_id, []) if entry["id"] == audit_log_id), None)


def _sanitize_metadata(value: Any) -> Any:
    if isinstance(value, dict):
        return {key: _sanitize_value(key, item) for key, item in value.items()}
    if isinstance(value, list):
        return [_sanitize_metadata(item) for item in value]
    return value


def _sanitize_value(key: str, value: Any) -> Any:
    normalized_key = key.casefold()
    if any(fragment in normalized_key for fragment in _sensitive_key_fragments):
        return "[redacted]"
    return _sanitize_metadata(value)


def _build_audit_id(store_id: str, sequence: int, action: str, target_type: str, target_id: str) -> str:
    key = "|".join([store_id, str(sequence), action, target_type, target_id])
    return f"audit_{hashlib.sha1(key.encode('utf-8')).hexdigest()[:12]}"
