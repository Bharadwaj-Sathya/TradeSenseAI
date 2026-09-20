from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class MarketTick(BaseModel):
    """
    Normalized market tick used throughout TradeSense AI.

    This model is broker-independent.
    """

    model_config = ConfigDict(
        frozen=True,
        extra="ignore",
    )

    exchange: str
    symbol: str
    token: str | None = None
    timestamp: datetime

    last_price: Decimal = Field(ge=0,)
    last_quantity: int = Field(default=0, ge=0,)
    volume: int = Field(default=0, ge=0,)
    open: Decimal | None = Field(default=None, ge=0,)
    high: Decimal | None = Field(default=None, ge=0,)
    low: Decimal | None = Field(default=None, ge=0,)
    previous_close: Decimal | None = Field(default=None, ge=0,)
    bid_price: Decimal | None = Field(default=None, ge=0,)
    ask_price: Decimal | None = Field(default=None, ge=0, )
    bid_quantity: int = Field(default=0, ge=0, )
    ask_quantity: int = Field(default=0, ge=0,)
    open_interest: int | None = Field(default=None, ge=0,)
    source: str = "breeze"
