import asyncio
from datetime import datetime, timezone

from app.celery_app import celery_app
from app.config.database import get_session_factory

from app.features.market_data.breeze_client import BreezeClient
from app.features.repositories.candle import CandleRepository
from app.features.market_data.historical_sync_service import (
    HistoricalSyncService,
    INDEXES,
)


@celery_app.task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
)
def sync_historical_data(self) -> None:

    asyncio.run(_sync())


async def _sync() -> None:

    breeze = BreezeClient()

    # Celery is a separate process,
    # so authenticate Breeze inside the worker.
    breeze.connect()

    engine, session_factory = get_session_factory()

    try:

        async with session_factory() as session:

            repository = CandleRepository(session)

            service = HistoricalSyncService(
                breeze=breeze,
                candle_repository=repository,
            )

            today = datetime.now(
                timezone.utc
            ).date()

            for instrument in INDEXES:

                await service.sync_instrument(
                    instrument=instrument,
                    end_date=today,
                )

    finally:

        await engine.dispose()