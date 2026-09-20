from __future__ import annotations

import json

from app.core.exceptions import NotFoundException, ValidationException
from app.features.models.strategy import Strategy
from app.features.repositories.strategy import StrategyRepository
from app.features.schemas.strategy import StrategyCreate, StrategyUpdate


class StrategyService:
    """Business logic for strategy create, read, update, and delete flows."""

    def __init__(self, repository: StrategyRepository):
        self.repository = repository

    async def create(self, data: StrategyCreate) -> Strategy:
        existing = await self.repository.get_by_code(data.code)

        if existing:
            raise ValidationException(
                message="Strategy code already exists",
                code="STRATEGY_CODE_EXISTS",
                details={"code": data.code},
            )

        strategy = Strategy(
            name=data.name,
            code=data.code,
            description=data.description,
            strategy_type=data.strategy_type,
            timeframe=data.timeframe,
            enabled=data.enabled,
            parameters=json.dumps(data.parameters),
        )

        return await self.repository.create(strategy)

    async def get(self, strategy_id: int) -> Strategy:
        strategy = await self.repository.get_by_id(strategy_id)

        if strategy is None:
            raise NotFoundException(
                message="Strategy not found",
                code="STRATEGY_NOT_FOUND",
                details={"strategy_id": strategy_id},
            )

        return strategy

    async def list(self, *, enabled_only: bool = False) -> list[Strategy]:
        return await self.repository.list_all(enabled_only=enabled_only)

    async def update(self, strategy_id: int, data: StrategyUpdate) -> Strategy:
        strategy = await self.get(strategy_id)
        updates = data.model_dump(exclude_unset=True)

        if "parameters" in updates:
            updates["parameters"] = json.dumps(updates["parameters"])

        for field, value in updates.items():
            setattr(strategy, field, value)

        await self.repository.session.commit()
        await self.repository.session.refresh(strategy)
        return strategy

    async def delete(self, strategy_id: int) -> None:
        strategy = await self.get(strategy_id)
        await self.repository.delete(strategy)