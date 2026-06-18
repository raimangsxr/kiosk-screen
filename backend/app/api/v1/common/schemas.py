from typing import Literal

from pydantic import BaseModel


class StatusMessage(BaseModel):
    status: Literal["ok", "error"]
    message: str
