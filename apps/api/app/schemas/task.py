from dataclasses import dataclass, field
from typing import Any

from app.schemas.common import AutomationLevel, TaskCategory, TaskStatus


@dataclass(frozen=True)
class Task:
    title: str
    category: TaskCategory
    automation_level: AutomationLevel
    status: TaskStatus = "new"
    priority_score: float = 0.0
    evidence: list[dict[str, Any]] = field(default_factory=list)
    action_plan: dict[str, Any] = field(default_factory=dict)

