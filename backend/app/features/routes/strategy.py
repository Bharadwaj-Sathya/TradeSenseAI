from __future__ import annotations

import json

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.features.repositories.strategy import StrategyRepository
from app.features.schemas.strategy import StrategyCreate, StrategyResponse, StrategyUpdate
from app.features.services.strategy import StrategyService


router = APIRouter(
    prefix="/strategies",
    tags=["Strategies"],
)


def get_strategy_service(
    session: AsyncSession = Depends(get_db),
) -> StrategyService:
    repository = StrategyRepository(session)
    return StrategyService(repository)


def to_response(strategy) -> StrategyResponse:
    return StrategyResponse(
        id=strategy.id,
        name=strategy.name,
        code=strategy.code,
        description=strategy.description,
        strategy_type=strategy.strategy_type,
        timeframe=strategy.timeframe,
        enabled=strategy.enabled,
        parameters=json.loads(strategy.parameters) if strategy.parameters else {},
        created_at=strategy.created_at,
        updated_at=strategy.updated_at,
    )


@router.post(
    "",
    response_model=StrategyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_strategy(
    data: StrategyCreate,
    service: StrategyService = Depends(get_strategy_service),
):
    strategy = await service.create(data)
    return to_response(strategy)


@router.get(
    "",
    response_model=list[StrategyResponse],
)
async def list_strategies(
    enabled_only: bool = Query(default=False),
    service: StrategyService = Depends(get_strategy_service),
):
    strategies = await service.list(enabled_only=enabled_only)
    return [to_response(strategy) for strategy in strategies]


@router.get(
    "/{strategy_id}",
    response_model=StrategyResponse,
)
async def get_strategy(
    strategy_id: int,
    service: StrategyService = Depends(get_strategy_service),
):
    strategy = await service.get(strategy_id)
    return to_response(strategy)


@router.patch(
    "/{strategy_id}",
    response_model=StrategyResponse,
)
async def update_strategy(
    strategy_id: int,
    data: StrategyUpdate,
    service: StrategyService = Depends(get_strategy_service),
):
    strategy = await service.update(strategy_id, data)
    return to_response(strategy)


@router.delete(
    "/{strategy_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_strategy(
    strategy_id: int,
    service: StrategyService = Depends(get_strategy_service),
):
    await service.delete(strategy_id)