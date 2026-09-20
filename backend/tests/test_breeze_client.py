import pytest

from app.features.market_data.breeze_client import BreezeClient
from app.core.exceptions import MarketDataException
from app.features.market_data.dependencies import get_breeze_client


def test_breeze_connection():
    client = get_breeze_client()

    client.connect()

    assert client.is_connected is True

def test_breeze_client_validates_credentials():
    with pytest.raises(ValueError):
        BreezeClient(api_key="", api_secret="secret", session_token="token")

    with pytest.raises(ValueError):
        BreezeClient(api_key="key", api_secret="", session_token="token")

    with pytest.raises(ValueError):
        BreezeClient(api_key="key", api_secret="secret", session_token="")


def test_check_response_rejects_failed_status():
    with pytest.raises(MarketDataException):
        BreezeClient._check_response({"Status": 500, "Error": "broker down"})


def test_retry_helper_retries_transient_errors():
    client = BreezeClient(api_key="key", api_secret="secret", session_token="token")

    calls = {"count": 0}

    def flaky():
        calls["count"] += 1
        if calls["count"] < 2:
            raise TimeoutError("temporary network issue")
        return {"Status": 200, "data": "ok"}

    result = client._retry_request(flaky, "fetch")

    assert result == {"Status": 200, "data": "ok"}
    assert calls["count"] == 2
