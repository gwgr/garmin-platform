from fastapi import APIRouter

from app.api.v1.endpoints.health import router as health_router

router = APIRouter(tags=["v1"])
router.include_router(health_router)
