from fastapi import APIRouter

router = APIRouter(prefix="/travel-assistance", tags=["module-2-travel-assistance"])


@router.get("/status")
def travel_assistance_status() -> dict[str, str]:
    return {"module": "travel_assistance", "status": "stub"}
