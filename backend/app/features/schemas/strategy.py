from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class StrategyBase(BaseModel):
    """Shared fields for strategy payloads."""

    name: str = Field(min_length=2, max_length=100)
    code: str = Field(min_length=2, max_length=50)
    description: str | None = None
    strategy_type: str = Field(min_length=2, max_length=50)
    timeframe: str = "1m"
    enabled: bool = True
    parameters: dict[str, Any] = Field(default_factory=dict)


class StrategyCreate(StrategyBase):
    """Payload used to create a strategy."""


class StrategyUpdate(BaseModel):
    """Payload used to update a strategy."""

    name: str | None = None
    description: str | None = None
    strategy_type: str | None = None
    timeframe: str | None = None
    enabled: bool | None = None
    parameters: dict[str, Any] | None = None


class StrategyResponse(StrategyBase):
    """Serialized strategy response returned by the API."""

    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)