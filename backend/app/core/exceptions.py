from typing import Any


class TradeSenseException(Exception):
    """Base exception for TradeSense AI."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        details: Any | None = None,
    ) -> None:
        self.message = message
        self.code = code
        self.details = details

        super().__init__(message)


class NotFoundException(TradeSenseException):
    """Resource was not found."""

    def __init__(
        self,
        message: str = "Resource not found",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="NOT_FOUND",
            details=details,
        )


class ValidationException(TradeSenseException):
    """Business validation failed."""

    def __init__(
        self,
        message: str = "Validation failed",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            details=details,
        )


class AuthenticationException(TradeSenseException):
    """Authentication failed."""

    def __init__(
        self,
        message: str = "Authentication failed",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            details=details,
        )


class AuthorizationException(TradeSenseException):
    """User is authenticated but not authorized."""

    def __init__(
        self,
        message: str = "Not authorized",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            details=details,
        )


class MarketDataException(TradeSenseException):
    """Market-data related failure."""

    def __init__(
        self,
        message: str = "Market data error",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="MARKET_DATA_ERROR",
            details=details,
        )


class StrategyException(TradeSenseException):
    """Trading strategy execution failure."""

    def __init__(
        self,
        message: str = "Strategy execution error",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="STRATEGY_ERROR",
            details=details,
        )


class RiskException(TradeSenseException):
    """Risk validation failure."""

    def __init__(
        self,
        message: str = "Risk validation failed",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="RISK_ERROR",
            details=details,
        )


class ExecutionException(TradeSenseException):
    """Order execution failure."""

    def __init__(
        self,
        message: str = "Order execution failed",
        details: Any | None = None,
    ) -> None:
        super().__init__(
            message=message,
            code="EXECUTION_ERROR",
            details=details,
        )