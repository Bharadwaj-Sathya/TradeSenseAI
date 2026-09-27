from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from sqlalchemy import (
    BigInteger,
    DateTime,
    Numeric,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.utils.Base import Base


class Candle(Base):
    """
    PostgreSQL candle model.

    This model represents the `candles` database table.
    Alembic uses this model to generate migrations.
    """

    __tablename__ = "candles"

    __table_args__ = (
        UniqueConstraint(
            "exchange",
            "symbol",
            "timeframe",
            "timestamp",
            name="uq_candle_identity",
        ),
    )

    id: Mapped[int] = mapped_column(
        BigInteger,
        primary_key=True,
        autoincrement=True,
    )

    exchange: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    symbol: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )

    token: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    timeframe: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        index=True,
    )

    open: Mapped[Decimal] = mapped_column(
        Numeric(20, 8),
        nullable=False,
    )

    high: Mapped[Decimal] = mapped_column(
        Numeric(20, 8),
        nullable=False,
    )

    low: Mapped[Decimal] = mapped_column(
        Numeric(20, 8),
        nullable=False,
    )

    close: Mapped[Decimal] = mapped_column(
        Numeric(20, 8),
        nullable=False,
    )

    volume: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        default=0,
    )

    open_interest: Mapped[int | None] = mapped_column(
        BigInteger,
        nullable=True,
    )

    source: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="breeze",
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=datetime.utcnow,
    )




class CandleCreate(BaseModel):
    """
    Schema used when creating/inserting a candle.
    """

    exchange: str = Field(..., max_length=20)
    symbol: str = Field(..., max_length=100)
    token: str | None = Field(default=None, max_length=100)

    timestamp: datetime
    timeframe: str = Field(..., max_length=10)

    open: Decimal = Field(..., ge=0)
    high: Decimal = Field(..., ge=0)
    low: Decimal = Field(..., ge=0)
    close: Decimal = Field(..., ge=0)

    volume: int = Field(default=0, ge=0)
    open_interest: int | None = Field(default=None, ge=0)

    source: str = Field(default="breeze", max_length=30)


class CandleResponse(BaseModel):
    """
    Schema returned by the API.
    """

    model_config = ConfigDict(from_attributes=True)

    id: int
    exchange: str
    symbol: str
    token: str | None

    timestamp: datetime
    timeframe: str

    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal

    volume: int
    open_interest: int | None

    source: str
    created_at: datetime