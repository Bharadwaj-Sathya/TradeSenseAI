from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.features.models.strategy import Strategy


class StrategyRepository:
    """Repository for CRUD operations on trading strategies."""

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, strategy: Strategy) -> Strategy:
        self.session.add(strategy)
        await self.session.commit()
        await self.session.refresh(strategy)
        return strategy

    async def get_by_id(self, strategy_id: int) -> Strategy | None:
        result = await self.session.execute(
            select(Strategy).where(Strategy.id == strategy_id)
        )
        return result.scalar_one_or_none()

    async def get_by_code(self, code: str) -> Strategy | None:
        result = await self.session.execute(
            select(Strategy).where(Strategy.code == code)
        )
        return result.scalar_one_or_none()

    async def list_all(self, *, enabled_only: bool = False) -> list[Strategy]:
        query = select(Strategy)

        if enabled_only:
            query = query.where(Strategy.enabled.is_(True))

        query = query.order_by(Strategy.created_at.desc())
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def delete(self, strategy: Strategy) -> None:
        await self.session.delete(strategy)
        await self.session.commit()
