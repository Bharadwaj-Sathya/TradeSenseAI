from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TradeSense AI"
    app_version: str = "1.0.0"
    environment: str = "development"

    breeze_api_key: str = Field(
        default="",
        validation_alias=AliasChoices("BREEZE_API_KEY", "breeze_api_key"),
    )
    breeze_api_secret: str = Field(
        default="",
        validation_alias=AliasChoices("BREEZE_API_SECRET", "breeze_api_secret"),
    )
    breeze_session_token: str = Field(
        default="",
        validation_alias=AliasChoices(
            "BREEZE_SESSION",
            "BREEZE_SESSION_TOKEN",
            "breeze_session_token",
        ),
    )
    breeze_api_login_url: str = Field(
        default="https://api.icicidirect.com/apiuser/tradelogin",
        validation_alias=AliasChoices("BREEZE_API_LOGIN_URL", "breeze_api_login_url"),
    )

    database_url: str = Field(
        default="",
        validation_alias=AliasChoices("DATABASE_URL", "database_url"),
    )
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        validation_alias=AliasChoices("REDIS_URL", "redis_url"),
    )

    secret_key: str = Field(
        default="dev-secret-key",
        validation_alias=AliasChoices("SECRET_KEY", "secret_key"),
    )
    access_token_expire_minutes: int = 60
    environment_mode: str = Field(
        default="dev",
        validation_alias=AliasChoices("ENV", "environment", "environment_mode"),
    )

    @property
    def database_url_resolved(self) -> str:
        if self.database_url:
            return self.database_url

        db_host = self.model_fields.get("database_host")
        db_name = self.model_fields.get("database_name")
        return self.database_url

    model_config = SettingsConfigDict(
        env_file=".env_local",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
