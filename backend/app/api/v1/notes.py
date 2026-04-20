"""
User property notes endpoints.
Each user can store at most one note per property (upsert semantics on PUT).
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional

from ...database import get_db
from ...schemas import NoteUpsert, NoteResponse
from ...models import Note, Property, User
from ..deps import get_current_user

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("", response_model=List[NoteResponse])
async def get_notes_for_properties(
    property_ids: str = Query(..., description="Comma-separated property IDs"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Bulk fetch notes for the current user across multiple properties.
    Returns only notes that exist; properties without a note are omitted.
    """
    try:
        ids = [int(pid.strip()) for pid in property_ids.split(",") if pid.strip()]
    except ValueError:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="property_ids must be comma-separated integers")

    notes = (
        db.query(Note)
        .filter(and_(Note.user_id == current_user.id, Note.property_id.in_(ids)))
        .all()
    )
    return notes


@router.get("/{property_id}", response_model=NoteResponse)
async def get_note(
    property_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the current user's note for a specific property.
    Returns 404 if no note exists yet.
    """
    note = db.query(Note).filter(
        and_(Note.user_id == current_user.id, Note.property_id == property_id)
    ).first()

    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No note found for this property")

    return note


@router.put("/{property_id}", response_model=NoteResponse)
async def upsert_note(
    property_id: int,
    note_data: NoteUpsert,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create or update the current user's note for a property.
    Idempotent: a second PUT updates the existing note rather than creating a duplicate.
    """
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    if not property_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")

    note = db.query(Note).filter(
        and_(Note.user_id == current_user.id, Note.property_id == property_id)
    ).first()

    if note:
        note.body = note_data.body
    else:
        note = Note(user_id=current_user.id, property_id=property_id, body=note_data.body)
        db.add(note)

    db.commit()
    db.refresh(note)
    return note


@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    property_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete the current user's note for a property.
    """
    note = db.query(Note).filter(
        and_(Note.user_id == current_user.id, Note.property_id == property_id)
    ).first()

    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    db.delete(note)
    db.commit()
    return None
