from typing import Any

from pydantic import BaseModel, Field


class ApplicationErrorResponse(BaseModel):
    code: str
    message: str
    category: str = "unexpected"
    details: dict[str, Any] = Field(default_factory=dict)
    correlation_id: str | None = None
