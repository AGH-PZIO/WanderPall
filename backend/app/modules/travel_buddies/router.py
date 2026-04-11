from fastapi import APIRouter

router = APIRouter(prefix="/travel-buddies", tags=["module-3-travel-buddies"])


@router.get("/status")
def travel_buddies_status() -> dict[str, str]:
    return {"module": "travel_buddies", "status": "stub"}
