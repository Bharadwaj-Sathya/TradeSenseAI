from __future__ import annotations

import time
from datetime import datetime
from typing import Any, Callable

from breeze_connect import BreezeConnect

from app.config.configuration import settings
from app.core.exceptions import MarketDataException
from app.core.logging import get_logger


logger = get_logger(__name__)


class BreezeClient:
    """Production-safe wrapper around the ICICI Breeze Connect API."""

    def __init__(
        self,
        api_key: str | None = None,
        api_secret: str | None = None,
        session_token: str | None = None,
        *,
        max_retries: int = 3,
        retry_delay_seconds: float = 0.5,
        request_timeout_seconds: float = 15.0,
    ) -> None:
        self.api_key = (settings.breeze_api_key if api_key is None else api_key).strip()
        self.api_secret = (settings.breeze_api_secret if api_secret is None else api_secret).strip()
        self.session_token = (settings.breeze_session_token if session_token is None else session_token).strip()
        self.max_retries = max_retries
        self.retry_delay_seconds = retry_delay_seconds
        self.request_timeout_seconds = request_timeout_seconds

        self._validate_credentials()

        self._client = BreezeConnect(api_key=self.api_key)
        self._connected = False
        self._websocket_connected = False

    def _validate_credentials(self) -> None:
        if not self.api_key:
            raise ValueError("api_key cannot be empty")
        if not self.api_secret:
            raise ValueError("api_secret cannot be empty")
        if not self.session_token:
            raise ValueError("session_token cannot be empty")

    def _retry_request(self, action: Callable[[], Any], action_name: str) -> Any:
        last_error: Exception | None = None

        for attempt in range(1, self.max_retries + 1):
            try:
                return action()
            except (TimeoutError, ConnectionError, OSError) as exc:
                last_error = exc
                logger.warning(
                    "Transient Breeze failure for %s on attempt %s/%s: %s",
                    action_name,
                    attempt,
                    self.max_retries,
                    exc,
                )
                if attempt == self.max_retries:
                    break
                time.sleep(self.retry_delay_seconds * attempt)
            except Exception as exc:
                raise exc

        raise MarketDataException(
            message=f"Breeze request failed for {action_name}",
            details=str(
                last_error) if last_error else "unknown transient failure",
        )

    # ------------------------------------------------------------------
    # Authentication
    # ------------------------------------------------------------------

    def connect(self) -> None:
        """Authenticate with Breeze."""

        try:
            logger.info("Connecting to ICICI Breeze")

            self._retry_request(
                lambda: self._client.generate_session(
                    api_secret=self.api_secret,
                    session_token=self.session_token,
                ),
                "authenticate",
            )

            self._connected = True
            logger.info("ICICI Breeze authentication successful")

        except MarketDataException:
            self._connected = False
            raise
        except Exception as exc:
            self._connected = False
            logger.exception("ICICI Breeze authentication failed")
            raise MarketDataException(
                message="Failed to authenticate with ICICI Breeze",
                details=str(exc),
            ) from exc

    @property
    def is_connected(self) -> bool:
        """Return REST API authentication status."""

        return self._connected

    @property
    def is_websocket_connected(self) -> bool:
        """Return WebSocket connection status."""

        return self._websocket_connected

    def _ensure_connected(self) -> None:
        """Ensure Breeze REST session is available."""

        if not self._connected:
            raise MarketDataException(message="Breeze client is not connected")

    # ------------------------------------------------------------------
    # Quotes
    # ------------------------------------------------------------------

    def get_quote(
        self,
        stock_code: str,
        exchange_code: str,
        product_type: str = "cash",
        expiry_date: str = "",
        right: str = "",
        strike_price: str = "",
    ) -> dict[str, Any]:
        """Fetch quote for an instrument."""

        self._ensure_connected()

        try:
            response = self._retry_request(
                lambda: self._client.get_quotes(
                    stock_code=stock_code,
                    exchange_code=exchange_code,
                    product_type=product_type,
                    expiry_date=expiry_date,
                    right=right,
                    strike_price=strike_price,
                ),
                f"quote:{stock_code}",
            )

            self._check_response(response)
            return response

        except MarketDataException:
            raise
        except Exception as exc:
            logger.exception("Failed to fetch quote for %s", stock_code)
            raise MarketDataException(
                message=f"Failed to fetch quote for {stock_code}",
                details=str(exc),
            ) from exc

    # ------------------------------------------------------------------
    # Historical data
    # ------------------------------------------------------------------

    def get_historical_data(
        self,
        stock_code: str,
        exchange_code: str,
        product_type: str,
        interval: str,
        from_date: datetime,
        to_date: datetime,
        expiry_date: str = "",
        right: str = "",
        strike_price: str = "",
    ) -> dict[str, Any]:
        """Fetch historical OHLC data from Breeze."""

        self._ensure_connected()

        try:
            response = self._retry_request(
                lambda: self._client.get_historical_data(
                    interval=interval,
                    from_date=from_date.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                    to_date=to_date.strftime("%Y-%m-%dT%H:%M:%S.000Z"),
                    stock_code=stock_code,
                    exchange_code=exchange_code,
                    product_type=product_type,
                    expiry_date=expiry_date,
                    right=right,
                    strike_price=strike_price,
                ),
                f"historical:{stock_code}",
            )

            self._check_response(response)
            return response

        except MarketDataException:
            raise
        except Exception as exc:
            logger.exception("Historical data request failed | %s", stock_code)
            raise MarketDataException(
                message=f"Failed to fetch historical data for {stock_code}",
                details=str(exc),
            ) from exc

    # ------------------------------------------------------------------
    # WebSocket
    # ------------------------------------------------------------------

    def connect_websocket(
        self,
        on_tick: Callable[[dict[str, Any]], None],
    ) -> None:
        """Connect to Breeze live market-data WebSocket."""

        self._ensure_connected()

        try:
            self._client.on_ticks = on_tick
            self._client.ws_connect()
            self._websocket_connected = True
            logger.info("Breeze WebSocket connected")

        except Exception as exc:
            self._websocket_connected = False
            logger.exception("Breeze WebSocket connection failed")
            raise MarketDataException(
                message="Failed to connect to Breeze WebSocket",
                details=str(exc),
            ) from exc

    # ------------------------------------------------------------------
    # Subscribe
    # ------------------------------------------------------------------

    def subscribe_equity(self, stock_token: str) -> dict[str, Any]:
        """Subscribe to an equity market-data feed."""

        self._ensure_websocket_connected()

        try:
            response = self._client.subscribe_feeds(stock_token=stock_token)
            logger.info("Subscribed to market feed | %s", stock_token)
            return response
        except Exception as exc:
            logger.exception("Failed to subscribe | %s", stock_token)
            raise MarketDataException(
                message=f"Failed to subscribe to {stock_token}",
                details=str(exc),
            ) from exc

    def subscribe(
        self,
        *,
        exchange_code: str,
        stock_code: str,
        product_type: str = "cash",
        expiry_date: str = "",
        strike_price: str = "",
        right: str = "",
        get_exchange_quotes: bool = True,
        get_market_depth: bool = False,
    ) -> dict[str, Any]:
        """Subscribe using Breeze instrument parameters."""

        self._ensure_websocket_connected()

        try:
            response = self._client.subscribe_feeds(
                exchange_code=exchange_code,
                stock_code=stock_code,
                product_type=product_type,
                expiry_date=expiry_date,
                strike_price=strike_price,
                right=right,
                get_exchange_quotes=get_exchange_quotes,
                get_market_depth=get_market_depth,
            )

            logger.info(
                "Subscribed | %s | %s | %s",
                exchange_code,
                stock_code,
                product_type,
            )
            return response
        except Exception as exc:
            logger.exception("Breeze subscription failed | %s", stock_code)
            raise MarketDataException(
                message=f"Failed to subscribe to {stock_code}",
                details=str(exc),
            ) from exc

    # ------------------------------------------------------------------
    # Unsubscribe
    # ------------------------------------------------------------------

    def unsubscribe(self, stock_token: str) -> dict[str, Any]:
        """Unsubscribe from a market feed."""

        self._ensure_websocket_connected()

        try:
            response = self._client.unsubscribe_feeds(stock_token=stock_token)
            logger.info("Unsubscribed | %s", stock_token)
            return response
        except Exception as exc:
            logger.exception("Failed to unsubscribe | %s", stock_token)
            raise MarketDataException(
                message=f"Failed to unsubscribe from {stock_token}",
                details=str(exc),
            ) from exc

    # ------------------------------------------------------------------
    # Disconnect
    # ------------------------------------------------------------------

    def disconnect_websocket(self) -> None:
        """Disconnect Breeze WebSocket."""

        if not self._websocket_connected:
            return

        try:
            self._client.ws_disconnect()
            self._websocket_connected = False
            logger.info("Breeze WebSocket disconnected")
        except Exception as exc:
            logger.exception("Error disconnecting Breeze WebSocket")
            raise MarketDataException(
                message="Failed to disconnect from Breeze WebSocket",
                details=str(exc),
            ) from exc

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _ensure_websocket_connected(self) -> None:
        """Ensure WebSocket is connected."""

        if not self._websocket_connected:
            raise MarketDataException(
                message="Breeze WebSocket is not connected")

    @staticmethod
    def _check_response(response: dict[str, Any]) -> None:
        """Validate Breeze API response."""

        if not isinstance(response, dict):
            raise MarketDataException(
                message="Invalid response received from Breeze",
                details=response,
            )

        status = response.get("Status")
        error = response.get("Error")

        if status not in (None, 200):
            raise MarketDataException(
                message="Breeze API returned an error",
                details=error or response,
            )

        if error:
            raise MarketDataException(
                message="Breeze API returned an error",
                details=error,
            )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _ensure_websocket_connected(self) -> None:
        """Ensure WebSocket is connected."""

        if not self._websocket_connected:
            raise MarketDataException(
                message="Breeze WebSocket is not connected"
            )

    @staticmethod
    def _check_response(
        response: dict[str, Any],
    ) -> None:
        """Validate Breeze API response."""

        if not isinstance(response, dict):
            raise MarketDataException(
                message="Invalid response received from Breeze",
                details=response,
            )

        status = response.get("Status")

        error = response.get("Error")

        if status not in (None, 200):
            raise MarketDataException(
                message="Breeze API returned an error",
                details=error or response,
            )

        if error:
            raise MarketDataException(
                message="Breeze API returned an error",
                details=error,
            )
