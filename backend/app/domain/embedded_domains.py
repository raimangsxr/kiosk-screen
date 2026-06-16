from urllib.parse import urlparse


def normalize_domain(domain: str) -> str:
    candidate = domain.strip().lower()
    if "://" in candidate:
        candidate = urlparse(candidate).netloc
    return candidate.removeprefix("www.")


def source_domain(source_reference: str) -> str:
    parsed = urlparse(source_reference)
    host = parsed.netloc or parsed.path.split("/", 1)[0]
    return normalize_domain(host)


def is_domain_approved(source_reference: str, approved_domains: set[str]) -> bool:
    source = source_domain(source_reference)
    normalized = {normalize_domain(domain) for domain in approved_domains}
    return source in normalized

