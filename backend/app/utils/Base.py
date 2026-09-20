from sqlalchemy.orm import DeclarativeBase

# ---------------------------------------------------------
# SQLAlchemy Base
# ---------------------------------------------------------

class Base(DeclarativeBase):
    """
    Base class for all SQLAlchemy ORM models.

    Every database model should inherit from this class.

    Example:

        class Candle(Base):
            __tablename__ = "candles"
            ...
    """

    pass