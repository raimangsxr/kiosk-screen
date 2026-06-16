from app.domain.embedded_domains import is_domain_approved, normalize_domain, source_domain


def test_embedded_domain_normalization_and_approval():
    assert normalize_domain("https://www.Example.com/path") == "example.com"
    assert source_domain("https://example.com/dashboard") == "example.com"
    assert is_domain_approved("https://example.com/dashboard", {"example.com"}) is True
    assert is_domain_approved("https://unsafe.example/dashboard", {"example.com"}) is False

