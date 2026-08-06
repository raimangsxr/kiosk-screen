"""Shared SSE keep-alive comment lines (not application events)."""


def build_sse_ping_comment() -> str:
    return ": ping\n\n"
