from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = ""
    CLERK_SECRET_KEY: str = ""
    # Clerk JWT verification — one of these must be set for auth to work
    CLERK_FRONTEND_API_URL: str = ""
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: str = ""
    CORS_ORIGINS: str = "https://handriti.is"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "production"

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse comma-separated CORS_ORIGINS into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
