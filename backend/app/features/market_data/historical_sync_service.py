from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal
from typing import Any

from app.features.market_data.breeze_client import BreezeClient
from app.features.models.candle import Candle
from app.features.repositories.candle import CandleRepository


logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class HistoricalInstrument:
    exchange: str
    symbol: str
    breeze_stock_code: str


INDEXES = (
    HistoricalInstrument(
        exchange="NSE",
        symbol="NIFTY",
        breeze_stock_code="NIFTY",
    ),
    HistoricalInstrument(
        exchange="NSE",
        symbol="BANKNIFTY",
        breeze_stock_code="CNXBAN",
    ),
    HistoricalInstrument(
        exchange="BSE",
        symbol="SENSEX",
        breeze_stock_code="BSESEN",
    ),
)


class HistoricalSyncService:

    TIMEFRAME = "1m"
    BREEZE_INTERVAL = "1minute"

    MARKET_OPEN = time(9, 15)
    MARKET_CLOSE = time(15, 30)

    def __init__(
        self,
        *,
        breeze: BreezeClient,
        candle_repository: CandleRepository,
    ) -> None:
        self.breeze = breeze
        self.candle_repository = candle_repository

    @staticmethod
    def _ten_years_ago(
        value: date,
    ) -> date:

        try:
            return value.replace(
                year=value.year - 10
            )

        except ValueError:
            # Handles February 29 when the target year
            # is not a leap year.
            return value.replace(
                year=value.year - 10,
                day=28,
            )
        
    # =========================================================
    # SYNC INSTRUMENT
    # =========================================================

    async def sync_instrument(
        self,
        instrument: HistoricalInstrument,
        end_date: date,
    ) -> None:

        logger.info(
            "Starting historical sync | %s | end=%s",
            instrument.symbol,
            end_date,
        )

        # -----------------------------------------------------
        # Find the latest candle already stored in DB
        # -----------------------------------------------------

        last_candle = await self.candle_repository.get_latest(
            exchange=instrument.exchange,
            symbol=instrument.symbol,
            timeframe=self.TIMEFRAME,
        )

        if last_candle is not None:

            last_timestamp = self._ensure_utc(
                last_candle.timestamp
            )

            # Start from the date of the latest stored candle.
            # Re-downloading this day is safe because upsert_many()
            # ignores existing candles.
            cursor_date = last_timestamp.date()

            logger.info(
                "Existing data found | %s | last=%s | continuing from=%s",
                instrument.symbol,
                last_timestamp,
                cursor_date,
            )

        else:

            # -------------------------------------------------
            # No data exists.
            #
            # Start 10 years before today.
            # -------------------------------------------------

            cursor_date = self._ten_years_ago(end_date)

            logger.info(
                "No existing data | %s | starting 10-year history from=%s",
                instrument.symbol,
                cursor_date,
            )

        # -----------------------------------------------------
        # Download one calendar day at a time.
        #
        # Weekends / holidays simply return no data from Breeze.
        # -----------------------------------------------------

        current_date = cursor_date

        while current_date <= end_date:

            try:

                await self.sync_day(
                    instrument=instrument,
                    trading_date=current_date,
                )

            except Exception:

                logger.exception(
                    "Historical sync failed | %s | %s",
                    instrument.symbol,
                    current_date,
                )

                # Let Celery retry the task.
                raise

            current_date += timedelta(days=1)

        logger.info(
            "Historical sync completed | %s",
            instrument.symbol,
        )
    # =========================================================
    # SYNC ONE DAY
    # =========================================================

    async def sync_day(
        self,
        *,
        instrument: HistoricalInstrument,
        trading_date: date,
    ) -> None:

        start_datetime = datetime.combine(
            trading_date,
            self.MARKET_OPEN,
        )

        end_datetime = datetime.combine(
            trading_date,
            self.MARKET_CLOSE,
        )

        logger.info(
            "Downloading historical data | %s | %s",
            instrument.symbol,
            trading_date,
        )

        response = self.breeze.get_historical_data_v2(
            stock_code=instrument.breeze_stock_code,
            exchange_code=instrument.exchange,
            product_type="cash",
            interval=self.BREEZE_INTERVAL,
            from_date=start_datetime,
            to_date=end_datetime,
        )

        rows = self._extract_rows(response)

        if not rows:

            logger.info(
                "No candles returned | %s | %s",
                instrument.symbol,
                trading_date,
            )

            return

        candles: list[Candle] = []

        for row in rows:

            candle = self._to_candle(
                row=row,
                instrument=instrument,
            )

            if candle is not None:
                candles.append(candle)

        if not candles:

            logger.warning(
                "No valid candles after parsing | %s | %s",
                instrument.symbol,
                trading_date,
            )

            return

        await self.candle_repository.upsert_many(
            candles
        )

        logger.info(
            "Stored candles | %s | %s | count=%d",
            instrument.symbol,
            trading_date,
            len(candles),
        )

    # =========================================================
    # BREEZE RESPONSE
    # =========================================================

    @staticmethod
    def _extract_rows(
        response: dict[str, Any],
    ) -> list[dict[str, Any]]:

        if not isinstance(response, dict):
            raise TypeError(
                "Invalid Breeze historical response"
            )

        rows = response.get("Success")

        if rows is None:
            return []

        if not isinstance(rows, list):
            raise TypeError(
                "Breeze historical Success is not a list"
            )

        return [
            row
            for row in rows
            if isinstance(row, dict)
        ]

    # =========================================================
    # BREEZE ROW → CANDLE
    # =========================================================

    @staticmethod
    def _to_candle(
        *,
        row: dict[str, Any],
        instrument: HistoricalInstrument,
    ) -> Candle | None:

        timestamp = HistoricalSyncService._parse_timestamp(
            row.get("datetime")
            or row.get("date")
            or row.get("timestamp")
        )

        if timestamp is None:

            logger.warning(
                "Skipping candle without timestamp | row=%s",
                row,
            )

            return None

        open_price = HistoricalSyncService._decimal(
            row.get("open")
        )

        high_price = HistoricalSyncService._decimal(
            row.get("high")
        )

        low_price = HistoricalSyncService._decimal(
            row.get("low")
        )

        close_price = HistoricalSyncService._decimal(
            row.get("close")
        )

        if None in (
            open_price,
            high_price,
            low_price,
            close_price,
        ):

            logger.warning(
                "Skipping invalid OHLC row | row=%s",
                row,
            )

            return None

        volume = HistoricalSyncService._integer(
            row.get("volume"),
            default=0,
        )

        open_interest = HistoricalSyncService._integer(
            row.get("open_interest"),
            default=None,
        )

        return Candle(
            exchange=instrument.exchange,
            symbol=instrument.symbol,
            token=None,
            timestamp=timestamp,
            timeframe=HistoricalSyncService.TIMEFRAME,
            open=open_price,
            high=high_price,
            low=low_price,
            close=close_price,
            volume=volume,
            open_interest=open_interest,
            source="breeze",
        )

    # =========================================================
    # HELPERS
    # =========================================================

    @staticmethod
    def _decimal(
        value: Any,
    ) -> Decimal | None:

        if value is None:
            return None

        try:
            return Decimal(str(value))

        except (TypeError, ValueError, ArithmeticError):
            return None

    @staticmethod
    def _integer(
        value: Any,
        default: int | None = None,
    ) -> int | None:

        if value is None:
            return default

        try:
            return int(value)

        except (TypeError, ValueError):
            return default

    @staticmethod
    def _parse_timestamp(
        value: Any,
    ) -> datetime | None:

        if value is None:
            return None

        if isinstance(value, datetime):

            if value.tzinfo is None:
                return value.replace(
                    tzinfo=timezone.utc
                )

            return value.astimezone(timezone.utc)

        value = str(value).strip()

        if not value:
            return None

        # ISO 8601
        try:

            parsed = datetime.fromisoformat(
                value.replace("Z", "+00:00")
            )

            if parsed.tzinfo is None:
                parsed = parsed.replace(
                    tzinfo=timezone.utc
                )

            return parsed.astimezone(timezone.utc)

        except ValueError:
            pass

        # Common Breeze format
        for fmt in (
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%dT%H:%M:%S",
        ):

            try:

                parsed = datetime.strptime(
                    value,
                    fmt,
                )

                return parsed.replace(
                    tzinfo=timezone.utc
                )

            except ValueError:
                continue

        logger.warning(
            "Unable to parse Breeze timestamp | value=%s",
            value,
        )

        return None

    @staticmethod
    def _ensure_utc(
        value: datetime,
    ) -> datetime:

        if value.tzinfo is None:
            return value.replace(
                tzinfo=timezone.utc
            )

        return value.astimezone(timezone.utc)