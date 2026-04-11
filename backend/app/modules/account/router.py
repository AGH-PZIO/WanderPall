from fastapi import APIRouter

router = APIRouter(prefix="/account", tags=["module-1-account-auth"])


@router.get("/status")
def account_status() -> dict[str, str]:
    return {"module": "account", "status": "stub"}
