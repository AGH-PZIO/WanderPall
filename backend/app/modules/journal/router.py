from fastapi import APIRouter

router = APIRouter(prefix="/journals", tags=["module-5-journal"])


@router.get("/status")
def journal_status() -> dict[str, str]:
    return {"module": "journal", "status": "stub"}
