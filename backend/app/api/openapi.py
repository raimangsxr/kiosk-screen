import json

from app.main import app


def export_openapi() -> dict:
    return app.openapi()


def main() -> None:
    print(json.dumps(export_openapi(), indent=2, sort_keys=True))
