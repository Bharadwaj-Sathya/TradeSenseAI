from __future__ import annotations

import asyncio
from collections import deque
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Awaitable, Callable

from sqlalchemy import select

from app.core.logging import get_logger
from app.features.models.candle import Candle
from app.features.repositories.candle import CandleRepository
from app.features.market_data.signal_engine import (
    PriceBar,
    SignalEngine,
)


logger = get_logger(__name__)


BroadcastCallback = Callable[
    [dict[str, Any]],
    Awaitable[None],
]


class LiveCandleEngine:
    """
    Converts Breeze live ticks into 1-minute candles.

    Flow:

        Breeze WebSocket
              |
              v
        IndexFeedService
              |
              v
        LiveCandleEngine
              |
              +----> current 1m candle
              |
              +----> PostgreSQL
              |
              +----> SignalEngine
              |
              v
        WebSocket broadcast
              |
              v
        React Live Market page

    Supported indexes:

        NIFTY
        BANKNIFTY
        SENSEX
    """

    TIMEFRAME = "1m"

    HISTORY_SIZE = 250

    SUPPORTED_SYMBOLS = {
        "NIFTY",
        "BANKNIFTY",
        "SENSEX",
    }

    def __init__(
        self,
        *,
        session_factory,
        signal_engine: SignalEngine,
        broadcast: BroadcastCallback,
    ) -> None:

        self.session_factory = session_factory

        self.signal_engine = signal_engine

        self.broadcast = broadcast

        # -----------------------------------------------------
        # Event loop
        # -----------------------------------------------------
        #
        # Breeze WebSocket callbacks may execute outside the
        # asyncio event-loop thread.
        #
        # We capture the FastAPI event loop during start().
        #
        self._loop: asyncio.AbstractEventLoop | None = None

        # -----------------------------------------------------
        # Queue
        # -----------------------------------------------------

        self._queue: asyncio.Queue[
            dict[str, Any]
        ] = asyncio.Queue()

        self._worker_task: asyncio.Task | None = None

        self._running = False

        # -----------------------------------------------------
        # Historical 1-minute candles
        # -----------------------------------------------------
        #
        # Each symbol gets its own history.
        #
        # This is important.
        #
        # DO NOT use one shared list for all indexes.
        #
        self._history: dict[
            str,
            deque[PriceBar],
        ] = {
            "NIFTY": deque(
                maxlen=self.HISTORY_SIZE
            ),
            "BANKNIFTY": deque(
                maxlen=self.HISTORY_SIZE
            ),
            "SENSEX": deque(
                maxlen=self.HISTORY_SIZE
            ),
        }

        # -----------------------------------------------------
        # Current unfinished candle
        # -----------------------------------------------------
        #
        # Example:
        #
        # 09:31:00 -> 09:31:59
        #
        # All ticks during that minute update this object.
        #
        self._current_candles: dict[
            str,
            dict[str, Any] | None,
        ] = {
            "NIFTY": None,
            "BANKNIFTY": None,
            "SENSEX": None,
        }

    # =========================================================
    # START
    # =========================================================

    async def start(self) -> None:
        """
        Start the live candle engine.

        Called from FastAPI lifespan.
        """

        if self._running:
            return

        self._loop = asyncio.get_running_loop()

        self._running = True

        # -----------------------------------------------------
        # Load historical candles before accepting live ticks.
        # -----------------------------------------------------

        await self._load_history()

        # -----------------------------------------------------
        # Start background worker.
        # -----------------------------------------------------

        self._worker_task = asyncio.create_task(
            self._worker(),
            name="live-candle-engine",
        )

        # logger.info(
        #     "LiveCandleEngine started"
        # )

    # =========================================================
    # STOP
    # =========================================================

    async def stop(self) -> None:
        """
        Stop the live candle engine.
        """

        if not self._running:
            return

        self._running = False

        # -----------------------------------------------------
        # Stop worker.
        # -----------------------------------------------------

        if self._worker_task is not None:

            try:

                await self._worker_task

            except asyncio.CancelledError:

                pass

            finally:

                self._worker_task = None

        # -----------------------------------------------------
        # Flush current candles.
        # -----------------------------------------------------

        for symbol in self.SUPPORTED_SYMBOLS:

            current = self._current_candles.get(symbol)

            if current is not None:

                try:

                    await self._finalize_candle(
                        symbol=symbol,
                        candle=current,
                    )

                except Exception:

                    # logger.exception(
                    #     "Failed to finalize candle during shutdown | symbol=%s",
                    #     symbol,
                    # )

                    pass

                self._current_candles[symbol] = None

        # logger.info(
        #     "LiveCandleEngine stopped"
        # )

    # =========================================================
    # SUBMIT TICK
    # =========================================================

    def submit_tick(
        self,
        tick: dict[str, Any],
    ) -> None:
        """
        Receive a Breeze tick.

        This method is intentionally synchronous because
        Breeze calls its callback synchronously.

        We then safely transfer the tick into the asyncio
        event loop.
        """

        if not self._running:

            return

        if self._loop is None:

            return

        try:

            self._loop.call_soon_threadsafe(
                self._queue.put_nowait,
                tick,
            )

        except RuntimeError:

            # Event loop is already shutting down.

            pass

    # =========================================================
    # WORKER
    # =========================================================

    async def _worker(self) -> None:
        """
        Process ticks sequentially.

        Sequential processing prevents two ticks from modifying
        the same candle at the same time.
        """

        while self._running:

            try:

                tick = await self._queue.get()

                try:

                    await self._process_tick(
                        tick
                    )

                except Exception:

                    # logger.exception(
                    #     "Live tick processing failed | tick=%s",
                    #     tick,
                    # )

                    pass

                finally:

                    self._queue.task_done()

            except asyncio.CancelledError:

                break

            except Exception:

                # logger.exception(
                #     "Live candle worker error"
                # )

                await asyncio.sleep(0.1)

    # =========================================================
    # PROCESS TICK
    # =========================================================

    async def _process_tick(
        self,
        tick: dict[str, Any],
    ) -> None:

        # -----------------------------------------------------
        # Identify symbol.
        # -----------------------------------------------------

        symbol = self._normalize_symbol(tick)

        if symbol is None:

            return

        # -----------------------------------------------------
        # Get price.
        # -----------------------------------------------------

        price = self._to_decimal(
            tick.get("last")
        )

        if price is None:

            return

        # -----------------------------------------------------
        # Get timestamp.
        # -----------------------------------------------------

        timestamp = self._extract_timestamp(
            tick
        )

        if timestamp is None:

            timestamp = datetime.now(
                timezone.utc
            )

        timestamp = self._ensure_utc(
            timestamp
        )

        # -----------------------------------------------------
        # Round timestamp down to the minute.
        #
        # Example:
        #
        # 09:31:12
        #
        # becomes:
        #
        # 09:31:00
        # -----------------------------------------------------

        minute_timestamp = timestamp.replace(
            second=0,
            microsecond=0,
        )

        # -----------------------------------------------------
        # Volume
        # -----------------------------------------------------

        tick_volume = self._to_int(
            tick.get("volume")
        )

        if tick_volume is None:

            tick_volume = 0

        # -----------------------------------------------------
        # Current candle.
        # -----------------------------------------------------

        current = self._current_candles.get(
            symbol
        )

        # =====================================================
        # FIRST TICK FOR SYMBOL
        # =====================================================

        if current is None:

            current = self._new_candle(
                symbol=symbol,
                timestamp=minute_timestamp,
                price=price,
                volume=tick_volume,
            )

            self._current_candles[symbol] = current

        # =====================================================
        # SAME MINUTE
        # =====================================================

        elif (
            current["timestamp"]
            == minute_timestamp
        ):

            self._update_candle(
                candle=current,
                price=price,
                volume=tick_volume,
            )

        # =====================================================
        # NEW MINUTE
        # =====================================================

        else:

            # -------------------------------------------------
            # Finalize previous candle.
            # -------------------------------------------------

            await self._finalize_candle(
                symbol=symbol,
                candle=current,
            )

            # -------------------------------------------------
            # Create new candle.
            # -------------------------------------------------

            current = self._new_candle(
                symbol=symbol,
                timestamp=minute_timestamp,
                price=price,
                volume=tick_volume,
            )

            self._current_candles[symbol] = current

        # -----------------------------------------------------
        # Calculate signals using historical candles + current
        # unfinished candle.
        # -----------------------------------------------------

        await self._calculate_and_broadcast(
            symbol=symbol,
            current=current,
        )

    # =========================================================
    # CREATE CANDLE
    # =========================================================

    @staticmethod
    def _new_candle(
        *,
        symbol: str,
        timestamp: datetime,
        price: Decimal,
        volume: int,
    ) -> dict[str, Any]:

        return {
            "symbol": symbol,
            "timestamp": timestamp,
            "open": price,
            "high": price,
            "low": price,
            "close": price,
            "volume": volume,
        }

    # =========================================================
    # UPDATE CANDLE
    # =========================================================

    @staticmethod
    def _update_candle(
        *,
        candle: dict[str, Any],
        price: Decimal,
        volume: int,
    ) -> None:

        candle["high"] = max(
            candle["high"],
            price,
        )

        candle["low"] = min(
            candle["low"],
            price,
        )

        candle["close"] = price

        candle["volume"] += volume

    # =========================================================
    # FINALIZE CANDLE
    # =========================================================

    async def _finalize_candle(
        self,
        *,
        symbol: str,
        candle: dict[str, Any],
    ) -> None:

        timestamp = candle["timestamp"]

        # -----------------------------------------------------
        # Convert to PriceBar for in-memory history.
        # -----------------------------------------------------

        price_bar = PriceBar(
            timestamp=timestamp,
            open=candle["open"],
            high=candle["high"],
            low=candle["low"],
            close=candle["close"],
            volume=candle["volume"],
        )

        # -----------------------------------------------------
        # Add to symbol-specific history.
        # -----------------------------------------------------

        history = self._history[symbol]

        # -----------------------------------------------------
        # Prevent duplicate minute.
        # -----------------------------------------------------

        if not history or history[-1].timestamp != timestamp:

            history.append(price_bar)

        # -----------------------------------------------------
        # Store in PostgreSQL.
        # -----------------------------------------------------

        await self._store_candle(
            symbol=symbol,
            candle=candle,
        )

        # logger.info(
        #     "1m candle finalized | symbol=%s | timestamp=%s | "
        #     "open=%s | high=%s | low=%s | close=%s",
        #     symbol,
        #     timestamp,
        #     candle["open"],
        #     candle["high"],
        #     candle["low"],
        #     candle["close"],
        # )

    # =========================================================
    # STORE CANDLE
    # =========================================================

    async def _store_candle(
        self,
        *,
        symbol: str,
        candle: dict[str, Any],
    ) -> None:

        exchange = self._exchange_for_symbol(
            symbol
        )

        db_candle = Candle(
            exchange=exchange,
            symbol=symbol,
            token=None,
            timestamp=candle["timestamp"],
            timeframe=self.TIMEFRAME,
            open=candle["open"],
            high=candle["high"],
            low=candle["low"],
            close=candle["close"],
            volume=candle["volume"],
            open_interest=None,
            source="breeze_live",
        )

        async with self.session_factory() as session:

            repository = CandleRepository(
                session
            )

            await repository.upsert_many(
                [db_candle]
            )

            await session.commit()

    # =========================================================
    # LOAD HISTORY
    # =========================================================

    async def _load_history(self) -> None:
        """
        Load the most recent 250 1-minute candles for every
        supported index.

        This is critical for calculating indicators immediately
        after FastAPI starts.
        """

        async with self.session_factory() as session:

            for symbol in self.SUPPORTED_SYMBOLS:

                exchange = self._exchange_for_symbol(
                    symbol
                )

                result = await session.execute(
                    select(Candle)
                    .where(
                        Candle.exchange == exchange,
                        Candle.symbol == symbol,
                        Candle.timeframe
                        == self.TIMEFRAME,
                    )
                    .order_by(
                        Candle.timestamp.desc()
                    )
                    .limit(
                        self.HISTORY_SIZE
                    )
                )

                rows = list(
                    reversed(
                        result.scalars().all()
                    )
                )

                history = self._history[
                    symbol
                ]

                history.clear()

                for row in rows:

                    history.append(
                        PriceBar(
                            timestamp=self._ensure_utc(
                                row.timestamp
                            ),
                            open=self._to_decimal(
                                row.open
                            ),
                            high=self._to_decimal(
                                row.high
                            ),
                            low=self._to_decimal(
                                row.low
                            ),
                            close=self._to_decimal(
                                row.close
                            ),
                            volume=int(
                                row.volume or 0
                            ),
                        )
                    )

                # logger.info(
                #     "Loaded candle history | symbol=%s | count=%s",
                #     symbol,
                #     len(history),
                # )

    # =========================================================
    # CALCULATE SIGNALS
    # =========================================================

    async def _calculate_and_broadcast(
        self,
        *,
        symbol: str,
        current: dict[str, Any],
    ) -> None:

        # -----------------------------------------------------
        # Start with completed candles.
        # -----------------------------------------------------

        candles = list(
            self._history[symbol]
        )

        # -----------------------------------------------------
        # Add current unfinished candle.
        # -----------------------------------------------------

        current_bar = PriceBar(
            timestamp=current["timestamp"],
            open=current["open"],
            high=current["high"],
            low=current["low"],
            close=current["close"],
            volume=current["volume"],
        )

        if (
            not candles
            or candles[-1].timestamp
            != current_bar.timestamp
        ):

            candles.append(
                current_bar
            )

        else:

            candles[-1] = current_bar

        # -----------------------------------------------------
        # Calculate all configured timeframes.
        # -----------------------------------------------------

        results = self.signal_engine.calculate(
            symbol=symbol,
            candles=candles,
            timestamp=current["timestamp"],
        )

        # -----------------------------------------------------
        # Convert SignalResult objects into JSON.
        #
        # IMPORTANT:
        #
        # React expects:
        #
        #     signal
        #
        # not:
        #
        #     direction
        #
        # -----------------------------------------------------

        signals = []

        for result in results:

            signals.append(
                {
                    "timeframe": result.timeframe,

                    "signal": result.direction,

                    "score": result.score,

                    "price": float(
                        result.price
                    ),

                    "timestamp": (
                        result.timestamp
                        .isoformat()
                    ),
                }
            )

        # -----------------------------------------------------
        # Payload sent to React.
        # -----------------------------------------------------

        payload = {
            "type": "market_signal",
            "symbol": symbol,
            "timestamp": current[
                "timestamp"
            ].isoformat(),
            "signals": signals,
        }

        # -----------------------------------------------------
        # Send through WebSocket manager.
        # -----------------------------------------------------

        try:

            await self.broadcast(
                payload
            )

        except Exception:

            # logger.exception(
            #     "Market signal broadcast failed | symbol=%s",
            #     symbol,
            # )

            pass

    # =========================================================
    # SYMBOL NORMALIZATION
    # =========================================================

    @staticmethod
    def _normalize_symbol(
        tick: dict[str, Any],
    ) -> str | None:

        stock_name = str(
            tick.get("stock_name")
            or ""
        ).upper()

        stock_code = str(
            tick.get("stock_code")
            or ""
        ).upper()

        symbol = str(
            tick.get("symbol")
            or ""
        ).upper()

        combined = (
            f"{stock_name} "
            f"{stock_code} "
            f"{symbol}"
        )

        if (
            "NIFTY 50" in combined
            or stock_code == "NIFTY"
        ):

            return "NIFTY"

        if (
            "BANK NIFTY" in combined
            or stock_code == "CNXBAN"
            or "BANKNIFTY" in combined
        ):

            return "BANKNIFTY"

        if (
            "SENSEX" in combined
            or stock_code == "BSESEN"
        ):

            return "SENSEX"

        return None

    # =========================================================
    # TIMESTAMP
    # =========================================================

    @staticmethod
    def _extract_timestamp(
        tick: dict[str, Any],
    ) -> datetime | None:

        value = (
            tick.get("ltt")
            or tick.get("datetime")
            or tick.get("timestamp")
            or tick.get("time")
        )

        if value is None:

            return None

        if isinstance(
            value,
            datetime,
        ):

            return value

        try:

            value_string = str(
                value
            ).strip()

            # ---------------------------------------------
            # ISO timestamp
            # ---------------------------------------------

            if value_string.endswith(
                "Z"
            ):

                value_string = (
                    value_string[:-1]
                    + "+00:00"
                )

            return datetime.fromisoformat(
                value_string
            )

        except (
            TypeError,
            ValueError,
        ):

            return None

    # =========================================================
    # UTC
    # =========================================================

    @staticmethod
    def _ensure_utc(
        value: datetime,
    ) -> datetime:

        if value.tzinfo is None:

            return value.replace(
                tzinfo=timezone.utc
            )

        return value.astimezone(
            timezone.utc
        )

    # =========================================================
    # DECIMAL
    # =========================================================

    @staticmethod
    def _to_decimal(
        value: Any,
    ) -> Decimal | None:

        if value is None:

            return None

        try:

            return Decimal(
                str(value)
            )

        except (
            TypeError,
            ValueError,
            ArithmeticError,
        ):

            return None

    # =========================================================
    # INTEGER
    # =========================================================

    @staticmethod
    def _to_int(
        value: Any,
    ) -> int | None:

        if value is None:

            return None

        try:

            return int(value)

        except (
            TypeError,
            ValueError,
        ):

            return None

    # =========================================================
    # EXCHANGE
    # =========================================================

    @staticmethod
    def _exchange_for_symbol(
        symbol: str,
    ) -> str:

        if symbol == "SENSEX":

            return "BSE"

        return "NSE"
