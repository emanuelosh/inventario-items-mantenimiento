from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.alerts import router as alerts_router
from app.api.auth import router as auth_router
from app.api.items import router as items_router
from app.api.movements import router as movements_router
from app.api.reports import router as reports_router
from app.api.users import router as users_router
from app.core.config import settings
from app.models import InventoryItem, InventoryMovement, StockAlert, User  # noqa: F401

app = FastAPI(title=settings.APP_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:4200",
        "http://127.0.0.1:4200",
        "http://10.1.23.192:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {
        "ok": True,
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
    }


app.include_router(auth_router, prefix=settings.API_PREFIX)
app.include_router(users_router, prefix=settings.API_PREFIX)
app.include_router(items_router, prefix=settings.API_PREFIX)
app.include_router(movements_router, prefix=settings.API_PREFIX)
app.include_router(reports_router, prefix=settings.API_PREFIX)
app.include_router(alerts_router, prefix=settings.API_PREFIX)