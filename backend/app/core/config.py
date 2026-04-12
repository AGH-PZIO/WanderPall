from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql://wanderpall:wanderpall@localhost:5432/wanderpall"
    cors_origins: str = "http://localhost:5173"
    jwt_secret_key: str = "change-me-in-env"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 30
    verification_code_expire_minutes: int = 15
    password_reset_expire_minutes: int = 30

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()


def get_cors_origins() -> list[str]:
    return [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
