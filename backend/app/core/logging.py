import logging
import os
import sys
from datetime import datetime
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Final


DEFAULT_LOG_DIR: Final[Path] = Path("logs")
MAX_LOG_BYTES: Final[int] = 5 * 1024 * 1024
BACKUP_COUNT: Final[int] = 5


class PipeFormatter(logging.Formatter):
    """Emit compact single-line logs with operational metadata."""

    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.fromtimestamp(record.created).strftime("%Y-%m-%d %H:%M:%S")
        milliseconds = int(record.msecs)
        timestamp = f"{timestamp},{milliseconds:03d}"
        level = record.levelname
        logger_name = record.name
        message = record.getMessage()

        metadata: list[str] = []
        metadata.append(f"app={os.getenv('APP_NAME', 'TradeSenseAI')}")
        metadata.append(f"env={os.getenv('ENVIRONMENT', os.getenv('ENV', 'development'))}")
        metadata.append(f"version={os.getenv('APP_VERSION', '1.0.0')}")
        metadata.append(f"pid={os.getpid()}")
        metadata.append(f"host={os.getenv('HOSTNAME', 'localhost')}")

        for key, value in record.__dict__.items():
            if key in {
                "args",
                "asctime",
                "created",
                "exc_info",
                "exc_text",
                "filename",
                "funcName",
                "levelname",
                "levelno",
                "lineno",
                "module",
                "msecs",
                "message",
                "msg",
                "name",
                "pathname",
                "process",
                "processName",
                "relativeCreated",
                "stack_info",
                "thread",
                "threadName",
            }:
                continue
            if key.startswith("_"):
                continue
            metadata.append(f"{key}={value}")

        if record.exc_info:
            message = f"{message} | EXCEPTION | {self.formatException(record.exc_info)}"

        return f"{timestamp} | {level} | {logger_name} | {' '.join(metadata)} | {message}"


def setup_logging(
    level: int = logging.INFO,
    log_dir: str | os.PathLike[str] | None = None,
    *,
    use_console: bool = True,
) -> None:
    """Configure application-wide logging with JSON output and rotating files."""

    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    for handler in list(root_logger.handlers):
        root_logger.removeHandler(handler)
        handler.close()

    formatter = PipeFormatter()

    if log_dir is None:
        log_dir = os.getenv("LOG_DIR", DEFAULT_LOG_DIR)

    log_path = Path(log_dir)
    log_path.mkdir(parents=True, exist_ok=True)

    file_handler = RotatingFileHandler(
        log_path / "app.log",
        maxBytes=MAX_LOG_BYTES,
        backupCount=BACKUP_COUNT,
        encoding="utf-8",
    )
    file_handler.setLevel(level)
    file_handler.setFormatter(formatter)
    root_logger.addHandler(file_handler)

    if use_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setLevel(level)
        console_handler.setFormatter(formatter)
        root_logger.addHandler(console_handler)

    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("uvicorn").setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """Return a logger for a module."""

    return logging.getLogger(name)