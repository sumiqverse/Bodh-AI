"""Structured JSON logging configuration using structlog."""

import logging
import sys
from typing import Any, cast

import structlog
from structlog.types import EventDict, Processor


def add_app_context(_logger: Any, _method_name: str, event_dict: EventDict) -> EventDict:
    """Inject application context to all log events."""
    event_dict["app"] = "bodhai-api"
    return event_dict


def configure_logging(debug: bool = False) -> None:
    """Configure structlog for standard output in structured JSON format."""
    log_level = logging.DEBUG if debug else logging.INFO

    # Configure standard library logging handler
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=log_level,
    )

    shared_processors: list[Processor] = [
        structlog.contextvars.merge_contextvars,
        add_app_context,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
    ]

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Attach JSON formatter to root handlers
    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            structlog.processors.JSONRenderer(),
        ],
        foreign_pre_chain=shared_processors,
    )

    for handler in logging.root.handlers:
        handler.setFormatter(formatter)


def get_logger(name: str | None = None) -> structlog.stdlib.BoundLogger:
    """Retrieve a bound structured logger."""
    return cast(structlog.stdlib.BoundLogger, structlog.get_logger(name))
