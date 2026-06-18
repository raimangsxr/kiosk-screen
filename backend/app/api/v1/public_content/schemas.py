"""Schemas for the public content upload endpoint (spec 009)."""
from fastapi import Form, File, UploadFile

from app.shared.errors.application_errors import (
    EmptyFileError,
    MissingFileError,
    MissingTitleError,
    TitleTooLongError,
)


TITLE_MAX_LENGTH = 255


def parse_public_upload(
    file: UploadFile | None = File(default=None),
    title: str = Form(default=""),
) -> tuple[UploadFile, str]:
    """Validate the multipart form fields for the public upload endpoint.

    Returns a sanitized (file, title) tuple or raises the typed errors that the
    application error handler maps to the documented HTTP responses (FR-005–FR-007).
    """
    if file is None:
        raise MissingFileError()
    if file.size is not None and file.size == 0:
        raise EmptyFileError()
    cleaned_title = (title or "").strip()
    if not cleaned_title:
        raise MissingTitleError()
    if len(cleaned_title) > TITLE_MAX_LENGTH:
        raise TitleTooLongError(TITLE_MAX_LENGTH)
    return file, cleaned_title
