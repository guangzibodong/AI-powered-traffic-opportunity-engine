from fastapi import APIRouter


router = APIRouter()


@router.get("/{store_id}/tasks")
async def list_tasks(store_id: str) -> dict:
    return {"store_id": store_id, "tasks": []}


@router.get("/{store_id}/tasks/{task_id}")
async def get_task(store_id: str, task_id: str) -> dict:
    return {"store_id": store_id, "id": task_id}


@router.patch("/{store_id}/tasks/{task_id}")
async def update_task(store_id: str, task_id: str, payload: dict) -> dict:
    return {"store_id": store_id, "id": task_id, "status": "updated", "changes": payload}


@router.post("/{store_id}/tasks/{task_id}/generate-draft")
async def generate_task_draft(store_id: str, task_id: str) -> dict:
    return {"store_id": store_id, "task_id": task_id, "status": "drafting"}


@router.post("/{store_id}/tasks/{task_id}/approve")
async def approve_task(store_id: str, task_id: str) -> dict:
    return {"store_id": store_id, "task_id": task_id, "status": "approved"}


@router.post("/{store_id}/tasks/{task_id}/reject")
async def reject_task(store_id: str, task_id: str) -> dict:
    return {"store_id": store_id, "task_id": task_id, "status": "rejected"}

