import logging
from pathlib import Path

from app.core.logging import get_logger, setup_logging


def test_setup_logging_creates_rotating_file_handler(tmp_path):
    log_dir = tmp_path / "logs"

    setup_logging(level=logging.INFO, log_dir=log_dir)

    root_logger = logging.getLogger()
    file_handlers = [
        handler for handler in root_logger.handlers
        if handler.__class__.__name__ == "RotatingFileHandler"
    ]

    assert file_handlers
    assert log_dir.exists()
    assert any("app.log" in str(handler.baseFilename) for handler in file_handlers)


def test_get_logger_returns_named_logger():
    logger = get_logger("app.test")

    assert logger.name == "app.test"
    assert isinstance(logger, logging.Logger)
