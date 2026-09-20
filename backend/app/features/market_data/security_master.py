from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from datetime import date
from typing import Any, Optional

from app.core.exceptions import MarketDataException
from app.core.logging import get_logger
from app.features.market_data.breeze_client import BreezeClient


logger = get_logger(__name__)


@dataclass(frozen=True, slots=True)
class Instrument:
    """Normalized internal representation of a market instrument."""

    exchange: str
    symbol: str
    broker_symbol: str
    instrument_type: str
    token: Optional[str] = None
    expiry: Optional[date] = None
    strike: Optional[float] = None
    option_type: Optional[str] = None
    company_name: Optional[str] = None
    level1_token: Optional[str] = None
    level2_token: Optional[str] = None


class SecurityMaster:
    """Instrument lookup service with bounded caching and validation."""

    def __init__(
        self,
        breeze: BreezeClient,
        *,
        max_cache_size: int = 500,
    ) -> None:
        self.breeze = breeze
        self.max_cache_size = max_cache_size
        self._cache: OrderedDict[str, Instrument] = OrderedDict()

    def _get_names(self, **kwargs: Any) -> dict[str, Any]:
        """Access the SDK through a narrow, stable interface."""

        try:
            return self.breeze._client.get_names(**kwargs)
        except Exception as exc:
            raise MarketDataException(
                message="Unable to resolve market instrument",
                details=str(exc),
            ) from exc

    def _add_to_cache(self, key: str, instrument: Instrument) -> Instrument:
        self._cache[key] = instrument
        self._cache.move_to_end(key)

        while len(self._cache) > self.max_cache_size:
            self._cache.popitem(last=False)

        return instrument

    def _validate_symbol(self, value: str, field_name: str) -> str:
        cleaned = (value or "").strip()
        if not cleaned:
            raise MarketDataException(message=f"{field_name} cannot be empty")
        return cleaned.upper()

    def _validate_exchange(self, exchange: str) -> str:
        cleaned = self._validate_symbol(exchange, "exchange")
        valid = {"NSE", "BSE", "NFO", "MCX"}
        if cleaned not in valid:
            raise MarketDataException(
                message=f"Unsupported exchange: {exchange}. Allowed: {sorted(valid)}"
            )
        return cleaned

    # ------------------------------------------------------------------
    # Equity / Index
    # ------------------------------------------------------------------

    def get_equity(
        self,
        symbol: str,
        exchange: str = "NSE",
    ) -> Instrument:
        """Resolve an equity or index instrument."""

        exchange = self._validate_exchange(exchange)
        symbol = self._validate_symbol(symbol, "symbol")

        cache_key = self._equity_key(exchange, symbol)
        cached = self._cache.get(cache_key)
        if cached is not None:
            self._cache.move_to_end(cache_key)
            return cached

        logger.info("Resolving instrument | %s | %s", exchange, symbol)

        response = self._get_names(exchange_code=exchange, stock_code=symbol)

        if not response:
            raise MarketDataException(message=f"Instrument not found: {symbol}")

        instrument = self._parse_get_names_response(response)
        return self._add_to_cache(cache_key, instrument)

    # ------------------------------------------------------------------
    # Options
    # ------------------------------------------------------------------

    def get_option(
        self,
        underlying: str,
        expiry: date,
        strike: float,
        option_type: str,
        exchange: str = "NFO",
    ) -> Instrument:
        """Resolve an option contract."""

        underlying = self._validate_symbol(underlying, "underlying")
        exchange = self._validate_exchange(exchange)
        option_type = option_type.strip().upper()

        if option_type not in {"CE", "PE"}:
            raise MarketDataException(message="option_type must be either 'CE' or 'PE'")

        if not isinstance(strike, (int, float)):
            raise MarketDataException(message="strike must be numeric")

        if not isinstance(expiry, date):
            raise MarketDataException(message="expiry must be a datetime.date value")

        cache_key = self._option_key(exchange, underlying, expiry, float(strike), option_type)
        cached = self._cache.get(cache_key)
        if cached is not None:
            self._cache.move_to_end(cache_key)
            return cached

        broker_right = "Call" if option_type == "CE" else "Put"
        expiry_string = expiry.strftime("%d-%b-%Y")

        response = self._get_names(
            exchange_code=exchange,
            stock_code=underlying,
            product_type="Options",
            expiry_date=expiry_string,
            right=broker_right,
            strike_price=str(strike),
        )

        if not response:
            raise MarketDataException(
                message=f"Option not found: {underlying} {expiry} {strike} {option_type}"
            )

        instrument = self._parse_derivative_response(
            response=response,
            exchange=exchange,
            underlying=underlying,
            expiry=expiry,
            strike=float(strike),
            option_type=option_type,
        )
        return self._add_to_cache(cache_key, instrument)

    # ------------------------------------------------------------------
    # Futures
    # ------------------------------------------------------------------

    def get_future(
        self,
        underlying: str,
        expiry: date,
        exchange: str = "NFO",
    ) -> Instrument:
        """Resolve a futures contract."""

        underlying = self._validate_symbol(underlying, "underlying")
        exchange = self._validate_exchange(exchange)

        if not isinstance(expiry, date):
            raise MarketDataException(message="expiry must be a datetime.date value")

        cache_key = self._future_key(exchange, underlying, expiry)
        cached = self._cache.get(cache_key)
        if cached is not None:
            self._cache.move_to_end(cache_key)
            return cached

        response = self._get_names(
            exchange_code=exchange,
            stock_code=underlying,
            product_type="Futures",
            expiry_date=expiry.strftime("%d-%b-%Y"),
        )

        if not response:
            raise MarketDataException(message=f"Future not found: {underlying} {expiry}")

        instrument = self._parse_derivative_response(
            response=response,
            exchange=exchange,
            underlying=underlying,
            expiry=expiry,
        )
        return self._add_to_cache(cache_key, instrument)

    # ------------------------------------------------------------------
    # Cache
    # ------------------------------------------------------------------

    def clear_cache(self) -> None:
        """Clear all resolved instruments."""

        self._cache.clear()
        logger.info("Security master cache cleared")

    def cache_size(self) -> int:
        """Return number of cached instruments."""

        return len(self._cache)

    # ------------------------------------------------------------------
    # Parsing
    # ------------------------------------------------------------------

    @staticmethod
    def _parse_get_names_response(response: dict[str, Any]) -> Instrument:
        """Normalize a raw equity/index response from Breeze."""

        return Instrument(
            exchange=response.get("exchange_code", ""),
            symbol=response.get("exchange_stock_code", response.get("isec_stock_code", "")),
            broker_symbol=response.get("isec_stock_code", ""),
            instrument_type="EQUITY",
            token=response.get("isec_token"),
            company_name=response.get("company name"),
            level1_token=response.get("isec_token_level1"),
            level2_token=response.get("isec_token_level2"),
        )

    @staticmethod
    def _parse_derivative_response(
        response: dict[str, Any],
        exchange: str,
        underlying: str,
        expiry: date,
        strike: float | None = None,
        option_type: str | None = None,
    ) -> Instrument:
        """Normalize derivative responses across variants."""

        broker_symbol = response.get(
            "isec_stock_code",
            response.get("exchange_stock_code", underlying),
        )

        return Instrument(
            exchange=response.get("exchange_code", exchange),
            symbol=broker_symbol,
            broker_symbol=broker_symbol,
            instrument_type="OPTION" if option_type else "FUTURE",
            token=response.get("isec_token"),
            expiry=expiry,
            strike=strike,
            option_type=option_type,
            company_name=response.get("company name"),
            level1_token=response.get("isec_token_level1"),
            level2_token=response.get("isec_token_level2"),
        )

    # ------------------------------------------------------------------
    # Cache keys
    # ------------------------------------------------------------------

    @staticmethod
    def _equity_key(exchange: str, symbol: str) -> str:
        return f"EQUITY:{exchange}:{symbol}"

    @staticmethod
    def _option_key(
        exchange: str,
        underlying: str,
        expiry: date,
        strike: float,
        option_type: str,
    ) -> str:
        return f"OPTION:{exchange}:{underlying}:{expiry.isoformat()}:{strike}:{option_type}"

    @staticmethod
    def _future_key(exchange: str, underlying: str, expiry: date) -> str:
        return f"FUTURE:{exchange}:{underlying}:{expiry.isoformat()}"