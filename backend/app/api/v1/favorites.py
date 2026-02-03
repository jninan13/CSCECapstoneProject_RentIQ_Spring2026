"""
Favorites management endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List

from ...database import get_db
from ...schemas import FavoriteResponse, FavoriteCreate, PropertyResponse
from ...models import Favorite, Property, User
from ..deps import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=List[FavoriteResponse])
async def get_favorites(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all properties favorited by the current user.
    
    Returns list with property details included.
    """
    favorites = (
        db.query(Favorite)
        .filter(Favorite.user_id == current_user.id)
        .order_by(Favorite.created_at.desc())
        .all()
    )
    
    # Convert to response format with property details
    result = []
    for fav in favorites:
        property_data = PropertyResponse.model_validate(fav.property)
        property_data.is_favorited = True
        
        result.append({
            "id": fav.id,
            "user_id": fav.user_id,
            "property_id": fav.property_id,
            "created_at": fav.created_at,
            "property": property_data
        })
    
    return result


@router.post("", response_model=FavoriteResponse, status_code=status.HTTP_201_CREATED)
async def add_favorite(
    favorite_data: FavoriteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Add a property to the current user's favorites.
    
    Prevents duplicate favorites for the same property.
    """
    # Check if property exists
    property_obj = db.query(Property).filter(Property.id == favorite_data.property_id).first()
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    # Check if already favorited
    existing_favorite = db.query(Favorite).filter(
        and_(
            Favorite.user_id == current_user.id,
            Favorite.property_id == favorite_data.property_id
        )
    ).first()
    
    if existing_favorite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Property already in favorites"
        )
    
    # Create favorite
    new_favorite = Favorite(
        user_id=current_user.id,
        property_id=favorite_data.property_id
    )
    
    db.add(new_favorite)
    db.commit()
    db.refresh(new_favorite)
    
    # Build response
    property_data = PropertyResponse.model_validate(property_obj)
    property_data.is_favorited = True
    
    return {
        "id": new_favorite.id,
        "user_id": new_favorite.user_id,
        "property_id": new_favorite.property_id,
        "created_at": new_favorite.created_at,
        "property": property_data
    }


@router.delete("/{favorite_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    favorite_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Remove a property from the current user's favorites.
    
    Only allows users to remove their own favorites.
    """
    favorite = db.query(Favorite).filter(
        and_(
            Favorite.id == favorite_id,
            Favorite.user_id == current_user.id
        )
    ).first()
    
    if not favorite:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )
    
    db.delete(favorite)
    db.commit()
    
    return None
