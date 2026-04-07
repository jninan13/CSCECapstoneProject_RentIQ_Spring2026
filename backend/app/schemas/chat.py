from pydantic import BaseModel, Field
from typing import List, Literal, Optional


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    history: List[ChatMessage] = Field(default_factory=list)
    property_id: Optional[int] = None


class ChatResponse(BaseModel):
    reply: str
