import logging


def configure_logging(level: int = logging.INFO) -> None:
    logging.basicConfig(level=level, format="%(levelname)s %(name)s %(message)s")


def log_fields(**fields: object) -> dict[str, object]:
    return {key: value for key, value in fields.items() if value is not None}

