from fastapi import APIRouter, HTTPException


router = APIRouter()

BLOCKED_ASSET_CAPABILITIES = [
    "wordpress_draft_creation",
    "wordpress_publish",
    "woocommerce_writes",
]


@router.get("/{store_id}/assets")
async def list_assets(store_id: str) -> dict:
    return {
        "mode": "asset_draft_workspace",
        "store_id": store_id,
        "assets": [],
        "summary": {
            "asset_drafts": 0,
            "ready_for_wordpress_draft": 0,
        },
        "external_write_allowed": False,
        "blocked_capabilities": BLOCKED_ASSET_CAPABILITIES,
    }


@router.get("/{store_id}/assets/{asset_id}")
async def get_asset(store_id: str, asset_id: str) -> dict:
    raise HTTPException(status_code=404, detail="Asset draft not found")


@router.patch("/{store_id}/assets/{asset_id}")
async def update_asset(store_id: str, asset_id: str, payload: dict) -> dict:
    raise HTTPException(
        status_code=403,
        detail="Asset draft updates are future-gated until local asset persistence and QA are approved",
    )


@router.post("/{store_id}/assets/{asset_id}/publish-wordpress-draft")
async def publish_wordpress_draft(store_id: str, asset_id: str) -> dict:
    raise HTTPException(
        status_code=403,
        detail="WordPress draft creation is future-gated until asset QA and boundary approval are complete",
    )
