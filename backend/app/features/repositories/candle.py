from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.models.candle import Candle

class CandleRepository:
    """Repository for CRUD and query operations on market candles."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, candle: Candle) -> Candle:
        """Create a single candle."""
        self.session.add(candle)
        await self.session.commit()
        await self.session.refresh(candle)
        return candle

    async def get(
        self,
        *,
        exchange: str,
        symbol: str,
        timeframe: str,
        timestamp: datetime,
    ) -> Candle | None:
        """Get a candle for an exact timestamp."""
        result = await self.session.execute(
            select(Candle).where(
                Candle.exchange == exchange,
                Candle.symbol == symbol,
                Candle.timeframe == timeframe,
                Candle.timestamp == timestamp,
            )
        )
        return result.scalar_one_or_none()

    async def get_latest(
        self,
        *,
        exchange: str,
        symbol: str,
        timeframe: str,
    ) -> Candle | None:
        """Get the latest candle for an instrument/timeframe."""
        result = await self.session.execute(
            select(Candle)
            .where(
                Candle.exchange == exchange,
                Candle.symbol == symbol,
                Candle.timeframe == timeframe,
            )
            .order_by(Candle.timestamp.desc())
            .limit(1)
        )

        return result.scalar_one_or_none()

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
        result = await self.session.execute(
            select(Candle)
            .where(
                Candle.exchange == exchange,
                Candle.symbol == symbol,
                Candle.timeframe == timeframe,
                Candle.timestamp >= start,
                Candle.timestamp < end,
            )
            .order_by(Candle.timestamp.asc())
        )

        return list(result.scalars().all())

    async def create_many(
        self,
        candles: list[Candle],
    ) -> None:
        """Insert multiple candles in one transaction."""
        if not candles:
            return

        self.session.add_all(candles)
        await self.session.commit()

    async def upsert_many(
        self,
        candles: list[Candle],
    ) -> None:
        """
        Insert candles and ignore duplicates.

        Useful when synchronizing historical data from Breeze,
        because the same candle may be downloaded more than once.
        """
        if not candles:
            return

        values = [
            {
                "exchange": candle.exchange,
                "symbol": candle.symbol,
                "token": candle.token,
                "timestamp": candle.timestamp,
                "timeframe": candle.timeframe,
                "open": candle.open,
                "high": candle.high,
                "low": candle.low,
                "close": candle.close,
                "volume": candle.volume,
                "open_interest": candle.open_interest,
                "source": candle.source,
            }
            for candle in candles
        ]

        stmt = insert(Candle).values(values)

        stmt = stmt.on_conflict_do_nothing(
            index_elements=[
                Candle.exchange,
                Candle.symbol,
                Candle.timeframe,
                Candle.timestamp,
            ]
        )

        await self.session.execute(stmt)
        await self.session.commit()

    async def delete_before(
        self,
        *,
        exchange: str,
        symbol: str,
        timeframe: str,
        before: datetime,
    ) -> int:
        """Delete candles older than a specified timestamp."""
        from sqlalchemy import delete

        result = await self.session.execute(
            delete(Candle).where(
                Candle.exchange == exchange,
                Candle.symbol == symbol,
                Candle.timeframe == timeframe,
                Candle.timestamp < before,
            )
        )

        await self.session.commit()

        return result.rowcount or 0
