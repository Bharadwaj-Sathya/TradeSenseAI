from pathlib import Path
import re

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.config.configuration import settings


router = APIRouter(prefix="/settings", tags=["Settings"])
ENV_FILE = Path(__file__).resolve().parents[3] / ".env_local"
BREEZE_SESSION_PATTERN = re.compile(r"^BREEZE_SESSION=.*$", re.MULTILINE)


class BreezeSessionUpdate(BaseModel):
    breeze_session: str = Field(min_length=1, max_length=256)


class BreezeSessionStatus(BaseModel):
    configured: bool
    last_four: str | None = None


def _session_status() -> BreezeSessionStatus:
    token = settings.breeze_session_token.strip()
    return BreezeSessionStatus(configured=bool(token), last_four=token[-4:] if token else None)


def _persist_session(token: str) -> None:
    try:
        content = ENV_FILE.read_text(encoding="utf-8") if ENV_FILE.exists() else ""
        replacement = f"BREEZE_SESSION={token}"
        if BREEZE_SESSION_PATTERN.search(content):
            content = BREEZE_SESSION_PATTERN.sub(replacement, content, count=1)
        else:
            content = content.rstrip() + f"\n\n{replacement}\n"
        ENV_FILE.write_text(content, encoding="utf-8")
    except OSError as exc:
        raise HTTPException(status_code=500, detail="Unable to persist the Breeze session locally") from exc


@router.get("/breeze-session", response_model=BreezeSessionStatus)
def get_breeze_session() -> BreezeSessionStatus:
    return _session_status()


@router.patch("/breeze-session", response_model=BreezeSessionStatus)
def update_breeze_session(data: BreezeSessionUpdate) -> BreezeSessionStatus:
    token = data.breeze_session.strip()
    if not token or "\n" in token or "\r" in token:
        raise HTTPException(status_code=422, detail="Breeze session must be a single non-empty line")
    _persist_session(token)
    settings.breeze_session_token = token
    return _session_status()