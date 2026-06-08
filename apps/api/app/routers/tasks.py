from fastapi import APIRouter, HTTPException

from app.services.demo_planning_service import (
    build_demo_planning_payload,
    get_demo_task,
    update_demo_task_status,
)


router = APIRouter()


@router.get("/{store_id}/tasks")
async def list_tasks(store_id: str) -> dict:
    payload = build_demo_planning_payload(store_id)
    return {
        "store_id": store_id,
        "mode": payload["mode"],
        "planning_run": payload["planning_run"],
        "tasks": payload["tasks"],
    }


@router.get("/{store_id}/tasks/{task_id}")
async def get_task(store_id: str, task_id: str) -> dict:
    task = get_demo_task(store_id, task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"store_id": store_id, "task": task}


@router.patch("/{store_id}/tasks/{task_id}")
async def update_task(store_id: str, task_id: str, payload: dict) -> dict:
    status = payload.get("status")
    if not isinstance(status, str):
        raise HTTPException(status_code=400, detail="Missing task status")

    try:
        task = update_demo_task_status(store_id, task_id, status)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error

    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")

    return {"store_id": store_id, "task": task}


@router.post("/{store_id}/tasks/{task_id}/generate-draft")
async def generate_task_draft(store_id: str, task_id: str) -> dict:
    raise HTTPException(
        status_code=403,
        detail="WordPress draft creation is future-gated in Sprint 1",
    )


@router.post("/{store_id}/tasks/{task_id}/approve")
async def approve_task(store_id: str, task_id: str) -> dict:
    task = update_demo_task_status(store_id, task_id, "approved")
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"store_id": store_id, "task": task}


@router.post("/{store_id}/tasks/{task_id}/reject")
async def reject_task(store_id: str, task_id: str) -> dict:
    task = update_demo_task_status(store_id, task_id, "rejected")
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"store_id": store_id, "task": task}


@router.post("/{store_id}/tasks/{task_id}/snooze")
async def snooze_task(store_id: str, task_id: str) -> dict:
    task = update_demo_task_status(store_id, task_id, "snoozed")
    if task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"store_id": store_id, "task": task}
