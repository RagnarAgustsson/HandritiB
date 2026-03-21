from contextlib import asynccontextmanager
from datetime import UTC, datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle — store start time for uptime calculation."""
    app.state.start_time = datetime.now(UTC)
    yield
    # shutdown: nothing to clean up yet


def create_app() -> FastAPI:
    app = FastAPI(
        title="Handriti Backend",
        version=settings.APP_VERSION,
        description="Meeting intelligence agent — WebSocket backend for Handriti",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)

    return app


app = create_app()
