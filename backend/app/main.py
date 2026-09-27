import logging
import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.httpsredirect import HTTPSRedirectMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config.configuration import settings
from app.config.database import engine
from app.core.logging import get_logger, setup_logging

# Routes
from app.features.routes.strategy import router as strategy_router
from app.features.routes.settings import router as settings_router
from app.features.routes.candle import router as candle_router
from app.features.market_data.breeze_client import BreezeClient
from app.features.market_data.index_feed import IndexFeedService
from app.tasks.historical_sync import sync_historical_data
# -------------------------------------------------
# Load environment variables
# -------------------------------------------------
load_dotenv()

APP_NAME = os.getenv("APP_NAME", "TradeSense AI")
DEBUG = os.getenv("DEBUG", "False") == "True"
APP_VERSION = os.getenv("APP_VERSION")

# -------------------------------------------------
# Logging
# -------------------------------------------------
setup_logging(level=logging.INFO, use_console=True)
logger = get_logger(__name__)

# -------------------------------------------------
# Lifespan
# -------------------------------------------------


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Application startup begin")

    # =========================================================
    # Database
    # =========================================================

    database_url = (settings.database_url or "").strip()

    if not database_url:
        logger.warning(
            "DATABASE_URL is not configured; "
            "skipping DB connectivity check"
        )
    else:
        try:
            async with engine.begin() as conn:
                await conn.execute(text("SELECT 1"))

            logger.info("Database connection verified")

        except Exception:
            logger.exception(
                "Database connection failed during startup"
            )
            raise

    # =========================================================
    # Breeze
    # =========================================================

    breeze_client = None

    try:
        logger.info("Creating ICICI Breeze client")

        breeze_client = BreezeClient()

        logger.info("Connecting to ICICI Breeze REST API")

        breeze_client.connect()

        if not breeze_client.is_connected:
            raise RuntimeError(
                "Breeze REST connection could not be established"
            )

        logger.info("Breeze REST connection verified")

        # Store Breeze client in FastAPI application state
        app.state.breeze = breeze_client

    except Exception:
        logger.exception(
            "Breeze REST connection failed during startup"
        )
        raise

    # =========================================================
    # Index Feed
    # =========================================================

    try:
        logger.info("Initializing index feed service")

        index_feed = IndexFeedService()

        app.state.index_feed = index_feed

        # -----------------------------------------------------
        # Breeze WebSocket
        # -----------------------------------------------------

        logger.info("Connecting to Breeze WebSocket")

        breeze_client.connect_websocket(
            on_tick=index_feed.on_tick,
        )

        if not breeze_client.is_websocket_connected:
            raise RuntimeError(
                "Breeze WebSocket connection could not be established"
            )

        logger.info("Breeze WebSocket connected")

    except Exception:
        logger.exception(
            "Breeze market-data WebSocket startup failed"
        )

        # If WebSocket connection partially succeeded,
        # try to clean it up.
        if breeze_client is not None:
            try:
                breeze_client.disconnect_websocket()
            except Exception:
                logger.exception(
                    "Failed to cleanup Breeze WebSocket"
                )

        raise

    # ----------------------------------------
    # Subscribe NIFTY
    # ----------------------------------------

    response = breeze_client.subscribe_indices()

    logger.info("INDEX subscription response: %s", response, )

    try:

        task = sync_historical_data.delay()

        logger.info(
            "Historical sync task queued | task_id=%s",
            task.id,
        )

    except Exception:

        logger.exception(
            "Failed to queue historical sync task"
        )

    # =========================================================
    # Application is ready
    # =========================================================

    logger.info("Application startup completed")

    try:
        yield

    finally:
        # =====================================================
        # Shutdown
        # =====================================================

        logger.info("Application shutdown begin")

        # -----------------------------------------------------
        # Breeze WebSocket
        # -----------------------------------------------------

        if breeze_client is not None:
            try:
                breeze_client.disconnect_websocket()
                logger.info("Breeze WebSocket disconnected")
            except Exception:
                logger.exception(
                    "Failed to disconnect Breeze WebSocket"
                )

        # -----------------------------------------------------
        # Database
        # -----------------------------------------------------

        try:
            await engine.dispose()
            logger.info("Database engine disposed")
        except Exception:
            logger.exception(
                "Failed to dispose database engine"
            )

        logger.info("Application shutdown complete")


# -------------------------------------------------
# FastAPI App Configuration
# -------------------------------------------------
app = FastAPI(
    title=APP_NAME,
    description="TradeSense AI backend services",
    version=APP_VERSION,
    debug=DEBUG,

    # App lifecycle
    lifespan=lifespan,

    # OpenAPI metadata
    terms_of_service="https://tradesenseai.com/terms",
    contact={
        "name": "TradeSense AI Support",
        "url": "https://tradesenseai.com/support",
        "email": "support@tradesenseai.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },

    # Swagger / OpenAPI URLs
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# -------------------------------------------------
# Security Headers Middleware
# -------------------------------------------------
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response


if not DEBUG:
    app.add_middleware(HTTPSRedirectMiddleware)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=[
        "localhost",
        "127.0.0.1",
    ],
)

# -------------------------------------------------
# CORS Configuration
# -------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173",
                   "http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -------------------------------------------------
# Global Exception Handler
# -------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "details": str(exc) if DEBUG else None,
        },
    )


# -------------------------------------------------
# Custom Swagger / OpenAPI Configuration
# -------------------------------------------------
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=APP_NAME,
        version=app.version,
        description="TradeSense AI backend services",
        terms_of_service=app.terms_of_service,
        contact=app.contact,
        license_info=app.license_info,
        routes=app.routes,)

    # Optional: API Logo in Swagger
    openapi_schema["info"]["x-logo"] = {
        "url": "https://tradesenseai.com/logo.png"
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi


# -------------------------------------------------
# Media
# -------------------------------------------------

MEDIA_DIR = "media/profile_images"
os.makedirs(MEDIA_DIR, exist_ok=True)

# Serve media folder
app.mount("/media", StaticFiles(directory="media"), name="media")

# -------------------------------------------------
# API Routers
# -------------------------------------------------
api_router = APIRouter(tags=["API"])


@api_router.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(api_router, prefix="/api/v1")
app.include_router(candle_router, prefix="/api/v1")
app.include_router(settings_router, prefix="/api/v1")
app.include_router(strategy_router, prefix="/api/v1")
