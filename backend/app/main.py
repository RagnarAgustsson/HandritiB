from contextlib import asynccontextmanager
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_user
from app.config import settings
from app.models.database import dispose_engine
from app.routers import health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup/shutdown lifecycle."""
    app.state.start_time = datetime.now(UTC)
    yield
    # Dispose SQLAlchemy engine connection pool on shutdown
    await dispose_engine()


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
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["*"],
    )

    app.include_router(health.router)

    # TEMPORARY — for Phase 6 verification only
    @app.get("/auth/me")
    async def auth_me(
        current_user: Annotated[dict, Depends(get_current_user)],
    ) -> dict:
        """Return decoded Clerk JWT claims for the authenticated user.

        TEMPORARY — exists solely to verify Clerk JWT auth works end-to-end.
        Will be removed or replaced in Phase 9 when the meeting agent router is added.
        """
        return current_user

    return app


app = create_app()
