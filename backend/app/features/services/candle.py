from __future__ import annotations

from datetime import datetime

from app.core.exceptions import ValidationException
from app.features.schemas.candle import Candle
from app.features.repositories.candle import CandleRepository
from app.features.models.candle import CandleCreate


class CandleService:
    """Business logic for market candle operations."""

    def __init__(self, repository: CandleRepository):
        self.repository = repository

    async def create(self, data: CandleCreate) -> Candle:
        """Create a single candle."""

        existing = await self.repository.get(
            exchange=data.exchange,
            symbol=data.symbol,
            timeframe=data.timeframe,
            timestamp=data.timestamp,
        )

        if existing:
            raise ValidationException(
                message="Candle already exists",
                code="CANDLE_ALREADY_EXISTS",
                details={
                    "exchange": data.exchange,
                    "symbol": data.symbol,
                    "timeframe": data.timeframe,
                    "timestamp": data.timestamp.isoformat(),
                },
            )

        candle = Candle(
            exchange=data.exchange,
            symbol=data.symbol,
            token=data.token,
            timestamp=data.timestamp,
            timeframe=data.timeframe,
            open=data.open,
            high=data.high,
            low=data.low,
            close=data.close,
            volume=data.volume,
            open_interest=data.open_interest,
            source=data.source,
        )

        return await self.repository.create(candle)

    async def get(
        self,
        *,
        exchange: str,
        symbol: str,
        timeframe: str,
        timestamp: datetime,
    ) -> Candle | None:
        """Get a candle for an exact timestamp."""

        return await self.repository.get(
            exchange=exchange,
            symbol=symbol,
            timeframe=timeframe,
            timestamp=timestamp,
        )

    async def get_latest(
        self,
        *,
        exchange: str,
        symbol: str,
        timeframe: str,
    ) -> Candle | None:
        """Get the latest stored candle."""

        return await self.repository.get_latest(
            exchange=exchange,
            symbol=symbol,
            timeframe=timeframe,
        )

    async def get_range(
        self,
        *,
        exchange: str,
        symbol: str,
        timeframe: str,
        start: datetime,
        end: datetime,
    ) -> list[Candle]:
        """Get candles within a time range."""

        if start >= end:
            raise ValidationException(
                message="Start time must be before end time",
                code="INVALID_CANDLE_RANGE",
                details={
                    "start": start.isoformat(),
                    "end": end.isoformat(),
                },
            )

        return await self.repository.get_range(
            exchange=exchange,
            symbol=symbol,
            timeframe=timeframe,
            start=start,
            end=end,
        )

    async def create_many(
        self,
        candles: list[CandleCreate],
    ) -> None:
        """Create multiple candles."""

        if not candles:
            return

        models = [
            Candle(
                exchange=data.exchange,
                symbol=data.symbol,
                token=data.token,
                timestamp=data.timestamp,
                timeframe=data.timeframe,
                open=data.open,
                high=data.high,
                low=data.low,
                close=data.close,
                volume=data.volume,
                open_interest=data.open_interest,
                source=data.source,
            )
            for data in candles
        ]

        await self.repository.create_many(models)

    async def upsert_many(
        self,
        candles: list[CandleCreate],
    ) -> None:
        """
        Insert a batch of candles.

        Existing candles are ignored.

        This is the preferred method for:
        - Breeze historical downloads
        - reconnect/backfill
        - FastAPI startup synchronization
        """
        if not candles:
            return

        models = [
            Candle(
                exchange=data.exchange,
                symbol=data.symbol,
                token=data.token,
                timestamp=data.timestamp,
                timeframe=data.timeframe,
                open=data.open,
                high=data.high,
                low=data.low,
                close=data.close,
                volume=data.volume,
                open_interest=data.open_interest,
                source=data.source,
            )
            for data in candles
        ]

        await self.repository.upsert_many(models)

    async def delete_before(
        self,
        *,
        exchange: str,
        symbol: str,
        timeframe: str,
        before: datetime,
    ) -> int:
        """Delete candles older than the specified timestamp."""

        return await self.repository.delete_before(
            exchange=exchange,
            symbol=symbol,
            timeframe=timeframe,
            before=before,
        )
