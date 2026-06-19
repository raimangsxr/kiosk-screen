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


class ConflictApplicationError(ApplicationError):
    def __init__(
        self,
        code: str,
        user_message: str,
        details: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(409, code, user_message, "conflict", details=details or {})


class ValidationApplicationError(ApplicationError):
    def __init__(self, code: str, user_message: str, details: dict[str, Any] | None = None):
        super().__init__(400, code, user_message, "validation", details=details or {})


class PermissionApplicationError(ApplicationError):
    def __init__(self, code: str, user_message: str = "You do not have permission to complete this action."):
        super().__init__(403, code, user_message, "permission")


class AuthenticationApplicationError(ApplicationError):
    def __init__(self, code: str, user_message: str = "Authentication is required."):
        super().__init__(401, code, user_message, "permission")


class DependencyApplicationError(ApplicationError):
    def __init__(self, code: str, user_message: str, details: dict[str, Any] | None = None):
        super().__init__(409, code, user_message, "dependency", details=details or {})


class MissingFileError(ValidationApplicationError):
    def __init__(self) -> None:
        super().__init__("file_required", "A file is required.")


class EmptyFileError(ValidationApplicationError):
    def __init__(self) -> None:
        super().__init__("file_empty", "The uploaded file is empty.")


class MissingTitleError(ValidationApplicationError):
    def __init__(self) -> None:
        super().__init__("title_required", "A title is required.")


class TitleTooLongError(ValidationApplicationError):
    def __init__(self, max_length: int) -> None:
        super().__init__(
            "title_too_long",
            f"The title must be {max_length} characters or fewer.",
            details={"maxLength": max_length},
        )


class UnsupportedMediaTypeError(ApplicationError):
    def __init__(self) -> None:
        super().__init__(
            415,
            "unsupported_media_type",
            "This file type is not supported.",
            "upload",
            details={},
        )


class MediaTooLargeError(ApplicationError):
    def __init__(self, max_bytes: int) -> None:
        super().__init__(
            413,
            "media_too_large",
            "The file is too large.",
            "upload",
            details={"maxBytes": max_bytes},
        )


class MissingApiKeyError(AuthenticationApplicationError):
    def __init__(self) -> None:
        super().__init__("missing_api_key", "Authentication is required.")


class InvalidAuthorizationSchemeError(AuthenticationApplicationError):
    def __init__(self) -> None:
        super().__init__("invalid_authorization_scheme", "Authentication is required.")


class InvalidApiKeyError(AuthenticationApplicationError):
    def __init__(self) -> None:
        super().__init__("invalid_api_key", "Authentication is required.")


class InactiveApiKeyError(PermissionApplicationError):
    def __init__(self) -> None:
        super().__init__("inactive_api_key", "This API key is no longer active.")


class ApiKeyNotFoundError(ValidationApplicationError):
    def __init__(self) -> None:
        super().__init__("api_key_not_found", "The API key could not be found.", details={})


class ApiKeyRevokedError(DependencyApplicationError):
    def __init__(self) -> None:
        super().__init__(
            "api_key_revoked",
            "This API key has been revoked and cannot be rotated.",
        )


class ApiKeyNotRevokedError(DependencyApplicationError):
    def __init__(self) -> None:
        super().__init__(
            "api_key_not_revoked",
            "Only revoked keys can be deleted.",
        )


class ReorderIdsMismatchError(ConflictApplicationError):
    """Raised when a reorder request's ``orderedIds`` does not match
    the current set of rows for the organization."""

    def __init__(self) -> None:
        super().__init__(
            "reorder_ids_mismatch",
            "The list changed; refresh and try again.",
        )