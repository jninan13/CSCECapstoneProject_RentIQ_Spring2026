"""
API dependencies for authentication and database access.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..core.security import decode_access_token
from typing import Optional

# HTTP Bearer token scheme (required auth - returns 403 when missing)
security = HTTPBearer()

# Optional Bearer - no error when header missing; use for optional-auth routes
security_optional = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get the current authenticated user from JWT token.
    
    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    email = decode_access_token(token)
    
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_optional),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Optional auth: returns current user if valid token present, else None.
    Use for routes that work with or without authentication (e.g. property search).
    """
    if credentials is None:
        return None
    token = credentials.credentials
    email = decode_access_token(token)
    if email is None:
        return None
    user = db.query(User).filter(User.email == email).first()
    return user
