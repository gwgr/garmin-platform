import logging

from fastapi import FastAPI

from app.api.router import api_router
from app.config import get_settings
from app.db import get_engine, get_session_factory
from app.observability import configure_logging, log_event
from app.services import get_garmin_client
from app.startup_checks import validate_startup


def create_app() -> FastAPI:
    """Create the FastAPI application for the Garmin platform backend."""
    settings = get_settings()
    configure_logging(settings.log_level)
    logger = logging.getLogger(__name__)
    app = FastAPI(
        title="Garmin Platform API",
        version="0.1.0",
        description="Backend API for the local-first Garmin data platform.",
    )
    engine = get_engine()
    session_factory = get_session_factory()
    validate_startup(settings, engine)
    app.state.settings = settings
    app.state.engine = engine
    app.state.session_factory = session_factory
    app.state.garmin_client = get_garmin_client()
    app.include_router(api_router, prefix="/api")
    log_event(
        logger,
        logging.INFO,
        "app.initialized",
        app_env=settings.app_env,
        log_level=settings.log_level,
    )
    return app


app = create_app()
