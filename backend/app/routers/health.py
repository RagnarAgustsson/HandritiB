from datetime import UTC, datetime

from fastapi import APIRouter, Request
from sqlalchemy import text

from app.config import settings
from app.models.database import get_db

router = APIRouter()


async def _check_database_async() -> str:
    """Run a SELECT 1 via SQLAlchemy async session to verify DB connectivity.

    Returns 'connected' or 'unreachable'.
    """
    if not settings.DATABASE_URL:
        return "unreachable"

    try:
        async for session in get_db():
            await session.execute(text("SELECT 1"))
            return "connected"
    except Exception:
        return "unreachable"

    return "unreachable"


@router.get("/health")
async def health_check(request: Request) -> dict:
    """Detailed health check — returns version, uptime, DB status, and timestamp."""
    now = datetime.now(UTC)
    start_time: datetime = request.app.state.start_time
    uptime_seconds = (now - start_time).total_seconds()

    db_status = await _check_database_async()
    overall_status = "ok" if db_status == "connected" else "degraded"

    return {
        "status": overall_status,
        "version": settings.APP_VERSION,
        "uptime_seconds": uptime_seconds,
        "timestamp": now.isoformat(),
        "database": db_status,
    }
