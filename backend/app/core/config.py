from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    APP_NAME: str = 'Inventario Mantenimiento API'
    ENVIRONMENT: str = 'local'
    API_PREFIX: str = '/api/v1'
    FRONTEND_URL: str = 'http://localhost:4200'

    DATABASE_URL: str = 'postgresql+psycopg://postgres:postgres@localhost:5432/inventario_mantenimiento'
    CREATE_TABLES_ON_STARTUP: bool = True

    SECRET_KEY: str = Field(default='change-me')
    ALGORITHM: str = 'HS256'
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    SMTP_ENABLED: bool = False
    SMTP_HOST: str = 'smtp.office365.com'
    SMTP_PORT: int = 587
    SMTP_USER: str = ''
    SMTP_PASSWORD: str = ''
    SMTP_FROM_NAME: str = 'Inventario Mantenimiento'
    SMTP_FROM_EMAIL: str = ''
    STOCK_ALERT_EXTRA_RECIPIENTS: str = ''

    @property
    def stock_alert_recipients(self) -> list[str]:
        if not self.STOCK_ALERT_EXTRA_RECIPIENTS:
            return []

        return [
        email.strip()
        for email in self.STOCK_ALERT_EXTRA_RECIPIENTS.split(",")
        if email.strip()
    ]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
