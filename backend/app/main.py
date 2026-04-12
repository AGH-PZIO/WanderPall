from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import get_cors_origins
from app.core.schemas import TestResponse
from app.modules.account.errors import AccountError
from app.modules.account.router import router as account_router
from app.modules.journal.router import router as journal_router
from app.modules.maps.router import router as maps_router
from app.modules.travel_assistance.router import router as travel_assistance_router
from app.modules.travel_buddies.router import router as travel_buddies_router

app = FastAPI(title="WanderPall API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AccountError)
def account_error_handler(_: Request, exc: AccountError) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": str(exc) or exc.message},
    )


@app.get("/health", tags=["system"])
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/test", response_model=TestResponse, tags=["system"])
def test_endpoint() -> TestResponse:
    return TestResponse(status="ok", message="Frontend-backend connection works")


app.include_router(account_router)
app.include_router(travel_assistance_router)
app.include_router(travel_buddies_router)
app.include_router(maps_router)
app.include_router(journal_router)
