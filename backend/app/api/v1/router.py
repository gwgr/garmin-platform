from fastapi import APIRouter

from app.api.v1.endpoints.activities import router as activities_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.metrics import router as metrics_router

router = APIRouter(tags=["v1"])
router.include_router(activities_router)
router.include_router(analytics_router)
router.include_router(health_router)
router.include_router(metrics_router)
