from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, Query, status, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.features.repositories.candle import CandleRepository
from app.features.models.candle import CandleCreate, CandleResponse
from app.features.services.candle import CandleService


router = APIRouter(
    prefix="/candles",
    tags=["Candles"],
)


def get_candle_service(
    session: AsyncSession = Depends(get_db),
) -> CandleService:
    repository = CandleRepository(session)
    return CandleService(repository)


def to_response(candle) -> CandleResponse:
    return CandleResponse(
        exchange=candle.exchange,
        symbol=candle.symbol,
        token=candle.token,
        timestamp=candle.timestamp,
        timeframe=candle.timeframe,
        open=candle.open,
        high=candle.high,
        low=candle.low,
        close=candle.close,
        volume=candle.volume,
        open_interest=candle.open_interest,
        source=candle.source,
    )


@router.post(
    "",
    response_model=CandleResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_candle(
    data: CandleCreate,
    service: CandleService = Depends(get_candle_service),
):
    candle = await service.create(data)
    return to_response(candle)


@router.post(
    "/batch",
    status_code=status.HTTP_201_CREATED,
)
async def create_candles(
    data: list[CandleCreate],
    service: CandleService = Depends(get_candle_service),
):
    await service.create_many(data)

    return {
        "message": "Candles created successfully",
        "count": len(data),
    }


@router.post(
    "/upsert",
    status_code=status.HTTP_200_OK,
)
async def upsert_candles(
    data: list[CandleCreate],
    service: CandleService = Depends(get_candle_service),
):
    """
    Insert candles while ignoring existing candles.

    Intended for Breeze historical synchronization.
    """
    await service.upsert_many(data)

    return {
        "message": "Candles synchronized successfully",
        "count": len(data),
    }


@router.get(
    "/latest",
    response_model=CandleResponse | None,
)
async def get_latest_candle(
    exchange: str = Query(...),
    symbol: str = Query(...),
    timeframe: str = Query(...),
    service: CandleService = Depends(get_candle_service),
):
    candle = await service.get_latest(
        exchange=exchange,
        symbol=symbol,
        timeframe=timeframe,
    )

    if candle is None:
        return None

    return to_response(candle)


@router.get(
    "/range",
    response_model=list[CandleResponse],
)
async def get_candle_range(
    exchange: str = Query(...),
    symbol: str = Query(...),
    timeframe: str = Query(...),
    start: datetime = Query(...),
    end: datetime = Query(...),
    service: CandleService = Depends(get_candle_service),
):
    candles = await service.get_range(
        exchange=exchange,
        symbol=symbol,
        timeframe=timeframe,
        start=start,
        end=end,
    )

    return [
        to_response(candle)
        for candle in candles
    ]


@router.get(
    "/exact",
    response_model=CandleResponse | None,
)
async def get_candle(
    exchange: str = Query(...),
    symbol: str = Query(...),
    timeframe: str = Query(...),
    timestamp: datetime = Query(...),
    service: CandleService = Depends(get_candle_service),
):
    candle = await service.get(
        exchange=exchange,
        symbol=symbol,
        timeframe=timeframe,
        timestamp=timestamp,
    )

    if candle is None:
        return None

    return to_response(candle)


@router.delete(
    "/before",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_old_candles(
    exchange: str = Query(...),
    symbol: str = Query(...),
    timeframe: str = Query(...),
    before: datetime = Query(...),
    service: CandleService = Depends(get_candle_service),
):
    await service.delete_before(
        exchange=exchange,
        symbol=symbol,
        timeframe=timeframe,
        before=before,
    )


@router.get("/indices")
async def get_indices(request: Request):
    index_feed = request.app.state.index_feed
    return {
        "data": index_feed.get_prices()
    }


@router.post("/debug/simulate-index")
async def simulate_index_tick(
    request: Request,
    symbol: str,
    price: float,
    change_percent: float = 0.0,
):
    index_feed = request.app.state.index_feed

    index_feed.simulate_tick(
        symbol=symbol,
        price=price,
        change_percent=change_percent,
    )

    return {
        "message": "Simulated tick processed",
        "symbol": symbol.upper(),
        "price": price,
        "change_percent": change_percent,
    }
