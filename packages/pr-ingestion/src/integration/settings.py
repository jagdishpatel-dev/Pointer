"""App-wide settings loaded from environment / .env file."""

from __future__ import annotations

from pydantic import Field, computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    github_token: str = Field("", validation_alias="GITHUB_TOKEN")
    github_repo: str = Field(..., validation_alias="GITHUB_REPO")
    api_host: str = Field("localhost", validation_alias="API_HOST")
    api_port: int = Field(8000, validation_alias="API_PORT")
    db_path: str = Field("./data/pr_doctor.json", validation_alias="DB_PATH")

  

_settings: Settings | None = None


def get_settings() -> Settings:
    global _settings
    if _settings is None:
        _settings = Settings()  # type: ignore[call-arg]
    return _settings
