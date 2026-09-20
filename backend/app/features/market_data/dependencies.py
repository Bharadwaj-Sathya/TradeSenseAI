from functools import lru_cache

from app.config import get_settings
from app.features.market_data.breeze_client import BreezeClient


@lru_cache
def get_breeze_client() -> BreezeClient:
    settings = get_settings()

    client = BreezeClient(
        api_key=settings.breeze_api_key,
        api_secret=settings.breeze_api_secret,
        session_token=settings.breeze_session_token,
    )

    return client