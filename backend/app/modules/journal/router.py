from fastapi import APIRouter

from app.modules.journal.editor.router import router as editor_router
from app.modules.journal.explorer.router import router as explorer_router

# Aggregator router: submodules own their own prefixes.
router = APIRouter(tags=["module-5-journal"])


@router.get("/journals/status")
def journal_status() -> dict[str, str]:
    return {"module": "journal", "status": "ok"}


# Explorer endpoints (more specific, must come first)
router.include_router(explorer_router)

# Editor endpoints
router.include_router(editor_router)
