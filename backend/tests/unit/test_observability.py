from app.api.middleware import RequestIdMiddleware
from app.observability.logging import log_fields


def test_log_fields_omit_none_values():
    assert log_fields(request_id="abc", user_id=None, outcome="ok") == {
        "request_id": "abc",
        "outcome": "ok"
    }


def test_request_id_middleware_class_exists():
    assert RequestIdMiddleware.__name__ == "RequestIdMiddleware"

