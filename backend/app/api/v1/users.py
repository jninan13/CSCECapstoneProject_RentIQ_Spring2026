"""
User profile management endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ...database import get_db
from ...schemas import UserProfileResponse, UserProfileUpdate, UserProfileCreate
from ...models import User, UserProfile
from ..deps import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's profile information.
    
    Creates an empty profile if one doesn't exist.
    """
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        # Create empty profile
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
    # Inject email from User model
    profile.email = current_user.email
    
    return profile


@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update current user's profile information.
    
    Only updates provided fields, leaving others unchanged.
    """
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    
    if not profile:
        # Create new profile
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
    
    # Update fields
    update_data = profile_data.model_dump(exclude_unset=True)
    
    # Handle email update separately on the User model
    if 'email' in update_data:
        new_email = update_data.pop('email')
        if new_email and new_email != current_user.email:
            # Check if email is already taken
            existing_user = db.query(User).filter(User.email == new_email).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email already registered"
                )
            current_user.email = new_email
            db.add(current_user)

    # Update UserProfile fields
    for field, value in update_data.items():
        setattr(profile, field, value)
    
    db.commit()
    db.refresh(profile)
    
    # Inject email back for the response
    profile.email = current_user.email
    
    return profile
