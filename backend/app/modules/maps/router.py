from fastapi import APIRouter

router = APIRouter(prefix="/maps", tags=["module-4-maps"])


@router.get("/status")
def maps_status() -> dict[str, str]:
    return {"module": "maps", "status": "stub"}
