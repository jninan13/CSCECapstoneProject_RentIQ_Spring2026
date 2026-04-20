"""
Pydantic schemas for user property notes.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class NoteUpsert(BaseModel):
    body: str = Field(..., max_length=5000)


class NoteResponse(BaseModel):
    id: int
    property_id: int
    body: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
