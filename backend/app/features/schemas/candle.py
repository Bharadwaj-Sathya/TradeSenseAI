from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class OHLCV(BaseModel):
    """
    Normalized OHLCV candle.

    Used by:
    - indicators
    - strategies
    - backtesting
    - charts
    """

    model_config = ConfigDict(
        frozen=True,
        extra="ignore",
    )

    exchange: str
    symbol: str
    token: str | None = None
    timestamp: datetime
    timeframe: str

    open: Decimal = Field(ge=0, )
    high: Decimal = Field(ge=0, )
    low: Decimal = Field(ge=0,)
    close: Decimal = Field(ge=0,)
    volume: int = Field(default=0, ge=0,)
    open_interest: int | None = Field(default=None, ge=0,)
    source: str = "breeze"
