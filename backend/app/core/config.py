from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://wanderpall:wanderpall@localhost:5432/wanderpall"
    cors_origins: str = "http://localhost:5173"

    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    google_oauth_redirect_uri: str = "http://localhost:8000/travel-assistance/gmail/oauth/callback"
    gmail_token_encryption_key: str = ""
    oauth_state_ttl_seconds: int = 900
    frontend_oauth_redirect_url: str = ""
    gmail_sync_max_results_per_page: int = 100

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @computed_field  # type: ignore[prop-decorator]
    @property
    def postgres_dsn(self) -> str:
        url = self.database_url
        if url.startswith("postgresql+psycopg://"):
            return "postgresql://" + url.removeprefix("postgresql+psycopg://")
        return url


settings = Settings()


def get_cors_origins() -> list[str]:
    return [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
