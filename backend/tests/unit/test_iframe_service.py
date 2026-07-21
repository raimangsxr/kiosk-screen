import pytest

from app.services.iframe_service import IframeService


@pytest.mark.parametrize(
    "url",
    [
        "https://example.com/path?foo=1&bar=2",
        "https://example.com/?token=abc&view=main",
        "https://bull.example.com/live?event=123&tab=scores",
    ],
)
def test_clean_url_preserves_query_parameters(url: str) -> None:
    service = IframeService(session=object())  # type: ignore[arg-type]
    assert service._clean_url(url) == url


def test_clean_url_rejects_non_http_scheme() -> None:
    service = IframeService(session=object())  # type: ignore[arg-type]
    with pytest.raises(ValueError, match="valid http"):
        service._clean_url("ftp://example.com?foo=1")
