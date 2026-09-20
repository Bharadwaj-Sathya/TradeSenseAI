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

from app.core.logging import get_logger      

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

logger = get_logger(__name__)

# -------------------------------------------------
# Lifespan
# -------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting database engine")
    yield
    logger.info("Shutting down database engine")
    # await engine.dispose()


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
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000", "http://127.0.0.1:8000"],
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
        routes=app.routes,    )

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
api_router = APIRouter(prefix="/api", tags=["API"])


@api_router.get("/health")
def health_check():
    return {"status": "ok"}


app.include_router(api_router, prefix="/api/v1")



