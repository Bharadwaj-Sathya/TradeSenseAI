from __future__ import annotations

from dataclasses import dataclass

from datetime import datetime

from threading import Lock

from typing import Any, Callable

from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class IndexPrice:

    """

    Latest state of a market index.

    During market hours:

        last_price = live Breeze price

    When market is closed:

        last_price = previous completed close

    previous_close always represents the last completed

    trading-session close.

    """

    symbol: str

    # Current/live price

    last_price: float | None = None

    # Last completed trading-session close

    previous_close: float | None = None

    # Absolute change from previous close

    change: float | None = None

    # Percentage change from previous close

    change_percent: float | None = None

    # LIVE / CLOSED

    status: str = "CLOSED"

    # Time of the latest value

    timestamp: datetime | None = None


class IndexFeedService:

    """

    Maintains the latest state of market indices.

    Sources:

    1. Breeze WebSocket

       -> live price during market hours

    2. Database / historical candle

       -> previous completed close when market is closed

    Supported indices:

        NIFTY

        BANKNIFTY

        SENSEX

    """

    def __init__(
        self,
        on_tick: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        self._lock = Lock()
        self._on_tick_callback = on_tick

        self._prices: dict[str, IndexPrice] = {

            "NIFTY": IndexPrice(

                symbol="NIFTY",

            ),

            "BANKNIFTY": IndexPrice(

                symbol="BANKNIFTY",

            ),

            "SENSEX": IndexPrice(

                symbol="SENSEX",

            ),

        }

    # =========================================================

    # Initialize previous close

    # =========================================================

    def set_previous_close(

        self,

        symbol: str,

        previous_close: float,

        timestamp: datetime | None = None,

    ) -> None:
        """

        Initialize an index with its last completed close.

        This should normally be called from PostgreSQL when

        the application starts.

        """

        symbol = symbol.strip().upper()

        if symbol not in self._prices:

            logger.warning(

                "Unknown index while setting previous close | %s",

                symbol,

            )

            return

        previous_close = float(previous_close)

        with self._lock:

            current = self._prices[symbol]

            current.previous_close = previous_close

            # If there is no live value, use previous close

            # as the value returned to the API.

            if current.last_price is None:

                current.last_price = previous_close

            current.change = 0.0

            current.change_percent = 0.0

            current.status = "CLOSED"

            current.timestamp = timestamp

        logger.info(

            "Previous close initialized | symbol=%s | close=%s | timestamp=%s",

            symbol,

            previous_close,

            timestamp,

        )

    # =========================================================

    # Breeze WebSocket callback

    # =========================================================

    def on_tick(self, tick: dict[str, Any]) -> None:
        """

        Called by Breeze whenever a live market tick arrives.

        """

        # logger.info(

        #     "Breeze tick received: %s",

        #     tick,

        # )

        # -----------------------------------------------------

        # Identify index

        # -----------------------------------------------------

        symbol = self._normalize_symbol(tick)

        if symbol is None:

            logger.debug(

                "Ignoring unsupported Breeze tick: %s",

                tick,

            )

            return

        # -----------------------------------------------------

        # Get live price

        # -----------------------------------------------------

        price = tick.get("last")

        if price is None:

            logger.warning(

                "Tick does not contain last price | symbol=%s | tick=%s",

                symbol,

                tick,

            )

            return

        try:

            price_value = float(price)

        except (TypeError, ValueError):

            logger.warning(

                "Invalid price received | symbol=%s | price=%s",

                symbol,

                price,

            )

            return

        # -----------------------------------------------------

        # Get change

        # -----------------------------------------------------

        change = tick.get("change")

        change_value: float | None = None

        if change is not None:

            try:

                change_value = float(change)

            except (TypeError, ValueError):

                logger.warning(

                    "Invalid change received | symbol=%s | change=%s",

                    symbol,

                    change,

                )

        # -----------------------------------------------------

        # Get previous close from Breeze if available

        # -----------------------------------------------------

        close = tick.get("close")

        close_value: float | None = None

        if close is not None:

            try:

                close_value = float(close)

            except (TypeError, ValueError):

                logger.warning(

                    "Invalid close received | symbol=%s | close=%s",

                    symbol,

                    close,

                )

        # -----------------------------------------------------

        # Calculate change if Breeze didn't provide it

        # -----------------------------------------------------

        with self._lock:

            current = self._prices[symbol]

            if close_value is not None:

                current.previous_close = close_value

            elif current.previous_close is None:

                current.previous_close = None

            previous_close = current.previous_close

            if change_value is None and previous_close is not None:

                change_value = price_value - previous_close

            if (

                previous_close is not None

                and previous_close != 0

            ):

                if previous_close and previous_close != 0:
                    change_percent = (
                        (price_value - previous_close)
                        / previous_close
                    ) * 100
                else:
                    change_percent = None

            else:

                change_percent = None

            current.last_price = price_value

            current.change = change_value

            current.change_percent = change_percent

            current.status = "LIVE"

            current.timestamp = datetime.now().astimezone()

        # Forward the raw Breeze tick to downstream live-data
        # processing, such as the LiveCandleEngine.
        #
        # Keep this callback synchronous/non-blocking because
        # Breeze invokes on_tick from its WebSocket callback.
        if self._on_tick_callback is not None:
            try:
                self._on_tick_callback(tick)
            except Exception:
                logger.exception(
                    "Live tick callback failed | symbol=%s",
                    symbol,
                )

        # logger.info(

        #     "Index updated | symbol=%s | price=%s | "

        #     "previous_close=%s | change=%s | change_percent=%s",

        #     symbol,

        #     price_value,

        #     previous_close,

        #     change_value,

        #     change_percent,

        # )

    # =========================================================

    # Normalize Breeze symbol

    # =========================================================

    @staticmethod

    def _normalize_symbol(

        tick: dict[str, Any],

    ) -> str | None:

        stock_name = str(

            tick.get("stock_name", "")

        ).strip().upper()

        stock_code = str(

            tick.get("stock_code", "")

        ).strip().upper()

        symbol = str(

            tick.get("symbol", "")

        ).strip().upper()

        # -----------------------------------------------------

        # NIFTY

        # -----------------------------------------------------

        if (

            stock_name == "NIFTY 50"

            or stock_code == "NIFTY"

            or "NIFTY 50" in symbol

        ):

            return "NIFTY"

        # -----------------------------------------------------

        # BANKNIFTY

        # -----------------------------------------------------

        if (

            "BANK NIFTY" in stock_name

            or stock_code in {

                "CNXBAN",

                "BANKNIFTY",

            }

            or "CNXBAN" in symbol

            or "BANKNIFTY" in symbol

        ):

            return "BANKNIFTY"

        # -----------------------------------------------------

        # SENSEX

        # -----------------------------------------------------

        if (

            "SENSEX" in stock_name

            or stock_code in {

                "BSESEN",

                "SENSEX",

            }

            or "BSESEN" in symbol

            or "SENSEX" in symbol

        ):

            return "SENSEX"

        return None

    # =========================================================

    # Get all indices

    # =========================================================

    def get_prices(self) -> list[dict[str, Any]]:

        """

        Return the latest state of all indices.

        """

        with self._lock:

            return [

                self._serialize(item)

                for item in self._prices.values()

            ]

    # =========================================================

    # Get one index

    # =========================================================

    def get_price(

        self,

        symbol: str,

    ) -> dict[str, Any] | None:

        symbol = symbol.strip().upper()

        with self._lock:

            item = self._prices.get(symbol)

            if item is None:

                return None

            return self._serialize(item)

    # =========================================================

    # Serialize

    # =========================================================

    @staticmethod

    def _serialize(

        item: IndexPrice,

    ) -> dict[str, Any]:

        return {

            "symbol": item.symbol,

            "price": item.last_price,

            "previous_close": item.previous_close,

            "change": item.change,

            "change_percent": item.change_percent,

            "status": item.status,

            "timestamp": item.timestamp,

        }

    # =========================================================

    # Live data checks

    # =========================================================

    def has_live_data(self) -> bool:

        with self._lock:

            return any(

                item.status == "LIVE"

                for item in self._prices.values()

            )

    def has_live_data_for(

        self,

        symbol: str,

    ) -> bool:

        symbol = symbol.strip().upper()

        with self._lock:

            item = self._prices.get(symbol)

            if item is None:

                return False

            return item.status == "LIVE"

    # =========================================================

    # Development-only fake tick

    # =========================================================

    def simulate_tick(
        self,
        symbol: str,
        price: float,
        change_percent: float = 0.0,
    ) -> None:

        tick_map = {
            "NIFTY": {
                "stock_name": "NIFTY 50",
                "stock_code": "NIFTY",
                "last": price,
                "change": (
                    price * change_percent / 100
                ),
            },
            "BANKNIFTY": {
                "stock_name": "BANK NIFTY",
                "stock_code": "CNXBAN",
                "last": price,
                "change": (
                    price * change_percent / 100
                ),
            },
            "SENSEX": {
                "stock_name": "SENSEX",
                "stock_code": "BSESEN",
                "last": price,
                "change": (
                    price * change_percent / 100
                ),
            },
        }

        tick = tick_map.get(
            symbol.strip().upper()
        )

        if tick is None:
            raise ValueError(
                f"Unsupported symbol: {symbol}"
            )

        self.on_tick(tick)