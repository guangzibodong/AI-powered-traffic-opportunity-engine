from dataclasses import asdict
from typing import Any

from app.fixtures.demo_decisioning import load_demo_decisioning_fixture
from app.schemas.opportunity import OpportunityCreate
from app.schemas.task import Task
from app.services.graph_builder_service import GraphBuilderService
from app.services.opportunity_engine import OpportunityEngine
from app.services.task_service import TaskService


def build_demo_planning_payload(store_id: str) -> dict[str, Any]:
    fixture = load_demo_decisioning_fixture()
    graph = GraphBuilderService().build(fixture)
    opportunities = OpportunityEngine().generate(graph)
    tasks = [TaskService().create_from_opportunity(opportunity) for opportunity in opportunities]

    serialized_opportunities = [
        _serialize_opportunity(opportunity, index)
        for index, opportunity in enumerate(opportunities, start=1)
    ]
    serialized_tasks = [
        _serialize_task(task, serialized_opportunities[index - 1]["id"], index)
        for index, task in enumerate(tasks, start=1)
    ]

    return {
        "store_id": store_id,
        "source_fixture_store_id": fixture.store_id,
        "mode": "demo_decisioning",
        "planning_run": {
            "run_id": "planning-run-demo",
            "state": "ready",
            "generated_tasks": len(serialized_tasks),
        },
        "opportunities": serialized_opportunities,
        "tasks": serialized_tasks,
    }


def get_demo_opportunity(store_id: str, opportunity_id: str) -> dict[str, Any] | None:
    payload = build_demo_planning_payload(store_id)
    return next(
        (opportunity for opportunity in payload["opportunities"] if opportunity["id"] == opportunity_id),
        None,
    )


def get_demo_task(store_id: str, task_id: str) -> dict[str, Any] | None:
    payload = build_demo_planning_payload(store_id)
    return next((task for task in payload["tasks"] if task["id"] == task_id), None)


def _serialize_opportunity(opportunity: OpportunityCreate, index: int) -> dict[str, Any]:
    payload = asdict(opportunity)
    payload.update(
        {
            "id": f"opp_{index:03d}",
            "status": "new",
        }
    )
    return payload


def _serialize_task(task: Task, opportunity_id: str, index: int) -> dict[str, Any]:
    payload = asdict(task)
    payload.update(
        {
            "id": f"task_{index:03d}",
            "opportunity_id": opportunity_id,
        }
    )
    return payload
