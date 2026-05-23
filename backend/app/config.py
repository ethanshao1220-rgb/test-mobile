from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "FitDiet Mobile API"
    database_url: str = "sqlite:///./backend/app.db"
    default_user_id: str = "u_001"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


settings = Settings()