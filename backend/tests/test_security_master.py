from datetime import date

import pytest

from app.core.exceptions import MarketDataException
from app.features.market_data.security_master import Instrument, SecurityMaster


class DummyBreeze:
    def __init__(self):
        self._client = self

    def get_names(self, **kwargs):
        return {
            "exchange_code": "NSE",
            "exchange_stock_code": "NIFTY",
            "isec_stock_code": "NIFTY",
            "isec_token": "2560",
            "company name": "NIFTY 50",
            "isec_token_level1": "2560",
            "isec_token_level2": "2560",
        }


def test_security_master_get_equity_returns_normalized_instrument():
    security = SecurityMaster(breeze=DummyBreeze())
    instrument = security.get_equity("nifty")

    assert isinstance(instrument, Instrument)
    assert instrument.exchange == "NSE"
    assert instrument.symbol == "NIFTY"
    assert instrument.instrument_type == "EQUITY"
    assert instrument.token == "2560"


def test_security_master_option_type_validation():
    security = SecurityMaster(breeze=DummyBreeze())

    with pytest.raises(MarketDataException):
        security.get_option("NIFTY", date(2026, 9, 24), 25000, "XYZ")


def test_security_master_cache_has_max_size():
    security = SecurityMaster(breeze=DummyBreeze(), max_cache_size=2)
    security.get_equity("NIFTY")
    security.get_equity("BANKNIFTY")
    security.get_equity("RELIANCE")

    assert security.cache_size() <= 2
