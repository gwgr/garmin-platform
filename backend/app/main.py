from fastapi import FastAPI

from app.api.router import api_router
from app.config import get_settings
from app.db import get_engine, get_session_factory


def create_app() -> FastAPI:
    """Create the FastAPI application for the Garmin platform backend."""
    settings = get_settings()
    app = FastAPI(
        title="Garmin Platform API",
        version="0.1.0",
        description="Backend API for the local-first Garmin data platform.",
    )
    app.state.settings = settings
    app.state.engine = get_engine()
    app.state.session_factory = get_session_factory()
    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
