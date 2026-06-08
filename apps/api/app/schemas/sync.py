from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class SyncRun:
    store_id: str
    run_type: str
    status: str = "queued"
    retry_count: int = 0
    metadata: dict[str, Any] = field(default_factory=dict)
    started_at: str | None = None
    finished_at: str | None = None
    error: str | None = None


@dataclass(frozen=True)
class SyncStep:
    sync_run_id: str
    step_name: str
    provider: str
    status: str = "queued"
    records_seen: int = 0
    records_upserted: int = 0
    records_skipped: int = 0
    records_failed: int = 0
    started_at: str | None = None
    finished_at: str | None = None
    error: str | None = None

