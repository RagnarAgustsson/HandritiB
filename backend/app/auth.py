"""Clerk JWT authentication dependency for FastAPI.

Uses fastapi-clerk-auth to verify Clerk-signed JWTs from the Next.js frontend.
The JWKS URL is derived from CLERK_FRONTEND_API_URL or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.
"""

from fastapi import HTTPException, Request, status
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer

from app.config import settings


def _build_clerk_auth() -> ClerkHTTPBearer:
    """Build the Clerk auth guard from config.

    Priority:
    1. settings.CLERK_FRONTEND_API_URL — explicit URL (recommended for Railway)
    2. settings.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY — derive frontend API URL from key prefix
    """
    if settings.CLERK_FRONTEND_API_URL:
        jwks_url = f"{settings.CLERK_FRONTEND_API_URL.rstrip('/')}/.well-known/jwks.json"
    elif settings.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:
        # Clerk publishable keys have the format pk_live_<base64-encoded-frontend-api>
        key = settings.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
        prefix = "pk_live_" if key.startswith("pk_live_") else "pk_test_"
        import base64

        encoded = key.removeprefix(prefix)
        padded = encoded + "=" * (-len(encoded) % 4)
        try:
            frontend_api = base64.b64decode(padded).decode("utf-8").rstrip("$")
            jwks_url = f"https://{frontend_api}/.well-known/jwks.json"
        except Exception as exc:
            raise ValueError(
                "Cannot derive JWKS URL from NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. "
                "Set CLERK_FRONTEND_API_URL explicitly."
            ) from exc
    else:
        raise ValueError(
            "Set CLERK_FRONTEND_API_URL or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY "
            "to enable Clerk JWT verification."
        )

    config = ClerkConfig(jwks_url=jwks_url)
    return ClerkHTTPBearer(config=config)


# Module-level guard — instantiated once at startup
_clerk_guard: ClerkHTTPBearer | None = None


def _get_clerk_guard() -> ClerkHTTPBearer:
    """Return the shared Clerk auth guard, creating it lazily on first call."""
    global _clerk_guard
    if _clerk_guard is None:
        try:
            _clerk_guard = _build_clerk_auth()
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Auth not configured: {exc}",
            ) from exc
    return _clerk_guard


async def get_current_user(request: Request) -> dict:
    """FastAPI dependency that verifies a Clerk JWT and returns the decoded claims.

    Calls the ClerkHTTPBearer guard directly (it's an async callable that takes Request),
    then extracts the decoded payload from the returned HTTPAuthorizationCredentials.

    Returns a dict with at minimum:
        user_id (str): The Clerk user ID (sub claim)
        claims (dict): Full decoded JWT payload

    Raises:
        HTTPException 401: If the token is missing or invalid
        HTTPException 503: If Clerk is not configured
    """
    guard = _get_clerk_guard()
    credentials = await guard(request)

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload: dict | None = getattr(credentials, "decoded", None)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: could not decode",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing sub claim",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"user_id": user_id, "claims": payload}
