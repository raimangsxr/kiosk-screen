from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal


ErrorCategory = Literal[
    "validation",
    "permission",
    "dependency",
    "upload",
    "storage",
    "migration",
    "not_found",
    "conflict",
    "unexpected",
]


@dataclass(slots=True)
class ApplicationError(Exception):
    status_code: int
    code: str
    user_message: str
    category: ErrorCategory = "unexpected"
    diagnostic_message: str | None = None
    details: dict[str, Any] = field(default_factory=dict)


class ValidationApplicationError(ApplicationError):
    def __init__(self, code: str, user_message: str, details: dict[str, Any] | None = None):
        super().__init__(400, code, user_message, "validation", details=details or {})


class PermissionApplicationError(ApplicationError):
    def __init__(self, code: str, user_message: str = "You do not have permission to complete this action."):
        super().__init__(403, code, user_message, "permission")


class DependencyApplicationError(ApplicationError):
    def __init__(self, code: str, user_message: str, details: dict[str, Any] | None = None):
        super().__init__(409, code, user_message, "dependency", details=details or {})
