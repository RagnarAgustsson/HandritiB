from datetime import UTC, datetime

from fastapi import APIRouter, Request

from app.config import settings

router = APIRouter()


def _check_database() -> str:
    """Run a simple SELECT 1 to verify DB connectivity. Returns 'connected' or 'unreachable'."""
    if not settings.DATABASE_URL:
        return "unreachable"

    try:
        import psycopg2

        conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=3)
        cur = conn.cursor()
        cur.execute("SELECT 1")
        cur.close()
        conn.close()
        return "connected"
    except Exception:
        return "unreachable"


@router.get("/health")
def health_check(request: Request) -> dict:
    """Detailed health check — returns version, uptime, DB status, and timestamp."""
    now = datetime.now(UTC)
    start_time: datetime = request.app.state.start_time
    uptime_seconds = (now - start_time).total_seconds()

    db_status = _check_database()
    overall_status = "ok" if db_status == "connected" else "degraded"

    return {
        "status": overall_status,
        "version": settings.APP_VERSION,
        "uptime_seconds": uptime_seconds,
        "timestamp": now.isoformat(),
        "database": db_status,
    }
