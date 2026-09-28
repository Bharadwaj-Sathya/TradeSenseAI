from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Literal, Sequence


Direction = Literal["BULLISH", "BEARISH", "NO_TRADE"]


@dataclass(frozen=True)
class SignalResult:
    symbol: str
    timeframe: str
    direction: Direction
    score: int
    price: Decimal
    timestamp: datetime


@dataclass(frozen=True)
class PriceBar:
    timestamp: datetime
    open: Decimal
    high: Decimal
    low: Decimal
    close: Decimal
    volume: int = 0


class SignalEngine:
    """
    Calculates live market signals from candle data.

    This is intentionally deterministic.

    Initial scoring model:

    Bullish:
        close > EMA9       +1
        EMA9 > EMA21       +1
        RSI > 55           +1
        momentum > 0       +1

    Bearish:
        close < EMA9       -1
        EMA9 < EMA21       -1
        RSI < 45           -1
        momentum < 0       -1

    Score:
        +3/+4 -> BULLISH
        -3/-4 -> BEARISH
        otherwise -> NO_TRADE

    This is the first live calculation model.
    We can replace the rules later with your actual strategy.
    """

    TIMEFRAMES = {
        "1m": 1,
        "3m": 3,
        "5m": 5,
        "15m": 15,
    }

    def calculate(
        self,
        *,
        symbol: str,
        candles: Sequence[PriceBar],
        timestamp: datetime,
    ) -> list[SignalResult]:
        results: list[SignalResult] = []

        for timeframe, minutes in self.TIMEFRAMES.items():
            bars = self._aggregate(
                candles=candles,
                minutes=minutes,
            )

            if len(bars) < 25:
                results.append(
                    SignalResult(
                        symbol=symbol,
                        timeframe=timeframe,
                        direction="NO_TRADE",
                        score=0,
                        price=candles[-1].close,
                        timestamp=timestamp,
                    )
                )
                continue

            result = self._calculate_signal(
                symbol=symbol,
                timeframe=timeframe,
                bars=bars,
                timestamp=timestamp,
            )

            results.append(result)

        return results

    def _calculate_signal(
        self,
        *,
        symbol: str,
        timeframe: str,
        bars: Sequence[PriceBar],
        timestamp: datetime,
    ) -> SignalResult:
        closes = [bar.close for bar in bars]

        price = closes[-1]

        ema9 = self._ema(closes, 9)
        ema21 = self._ema(closes, 21)

        rsi = self._rsi(closes, 14)

        momentum = closes[-1] - closes[-5]

        score = 0

        if price > ema9:
            score += 1
        elif price < ema9:
            score -= 1

        if ema9 > ema21:
            score += 1
        elif ema9 < ema21:
            score -= 1

        if rsi > 55:
            score += 1
        elif rsi < 45:
            score -= 1

        if momentum > 0:
            score += 1
        elif momentum < 0:
            score -= 1

        if score >= 3:
            direction: Direction = "BULLISH"
        elif score <= -3:
            direction = "BEARISH"
        else:
            direction = "NO_TRADE"

        return SignalResult(
            symbol=symbol,
            timeframe=timeframe,
            direction=direction,
            score=score,
            price=price,
            timestamp=timestamp,
        )

    # ---------------------------------------------------------
    # EMA
    # ---------------------------------------------------------

    @staticmethod
    def _ema(
        values: Sequence[Decimal],
        period: int,
    ) -> Decimal:
        if len(values) < period:
            return values[-1]

        multiplier = Decimal("2") / Decimal(period + 1)

        ema = sum(values[:period]) / Decimal(period)

        for value in values[period:]:
            ema = (
                (value - ema) * multiplier
            ) + ema

        return ema

    # ---------------------------------------------------------
    # RSI
    # ---------------------------------------------------------

    @staticmethod
    def _rsi(
        values: Sequence[Decimal],
        period: int,
    ) -> Decimal:
        if len(values) <= period:
            return Decimal("50")

        gains: list[Decimal] = []
        losses: list[Decimal] = []

        for index in range(1, len(values)):
            change = values[index] - values[index - 1]

            if change > 0:
                gains.append(change)
                losses.append(Decimal("0"))
            else:
                gains.append(Decimal("0"))
                losses.append(abs(change))

        recent_gains = gains[-period:]
        recent_losses = losses[-period:]

        avg_gain = sum(recent_gains) / Decimal(period)
        avg_loss = sum(recent_losses) / Decimal(period)

        if avg_loss == 0:
            return Decimal("100")

        rs = avg_gain / avg_loss

        return Decimal("100") - (
            Decimal("100") / (Decimal("1") + rs)
        )

    # ---------------------------------------------------------
    # Multi-timeframe aggregation
    # ---------------------------------------------------------

    @staticmethod
    def _aggregate(
        *,
        candles: Sequence[PriceBar],
        minutes: int,
    ) -> list[PriceBar]:
        if minutes == 1:
            return list(candles)

        buckets: dict[datetime, list[PriceBar]] = {}

        for candle in candles:
            minute = candle.timestamp.minute

            bucket_minute = (
                minute // minutes
            ) * minutes

            bucket_timestamp = candle.timestamp.replace(
                minute=bucket_minute,
                second=0,
                microsecond=0,
            )

            buckets.setdefault(
                bucket_timestamp,
                [],
            ).append(candle)

        result: list[PriceBar] = []

        for timestamp in sorted(buckets):
            rows = buckets[timestamp]

            result.append(
                PriceBar(
                    timestamp=timestamp,
                    open=rows[0].open,
                    high=max(row.high for row in rows),
                    low=min(row.low for row in rows),
                    close=rows[-1].close,
                    volume=sum(row.volume for row in rows),
                )
            )

        return result