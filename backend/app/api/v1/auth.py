"""
Authentication endpoints: register, login, Google OAuth.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from authlib.integrations.httpx_client import AsyncOAuth2Client

from ...database import get_db
from ...schemas import UserCreate, UserLogin, Token, GoogleAuthRequest, UserResponse
from ...models import User
from ...core.security import verify_password, get_password_hash, create_access_token
from ...config import settings
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """
    Register a new user with email and password.
    
    Validates email uniqueness and creates user with hashed password.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check username uniqueness if provided
    if user_data.username:
        existing_username = db.query(User).filter(User.username == user_data.username).first()
        if existing_username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=hashed_password
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token = create_access_token(data={"sub": new_user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
async def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """
    Authenticate user with email and password.
    
    Returns JWT token on successful authentication.
    """
    user = db.query(User).filter(User.email == user_data.email).first()
    
    if not user or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token(data={"sub": user.email})
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/google", response_model=Token)
async def google_auth(auth_data: GoogleAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate or register user via Google OAuth.
    
    Exchanges authorization code for user info and creates/updates user.
    Note: Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in settings.
    """
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth not configured"
        )
    
    try:
        # Exchange code for token
        client = AsyncOAuth2Client(
            client_id=settings.GOOGLE_CLIENT_ID,
            client_secret=settings.GOOGLE_CLIENT_SECRET,
            redirect_uri=settings.GOOGLE_REDIRECT_URI
        )
        
        token = await client.fetch_token(
            "https://oauth2.googleapis.com/token",
            code=auth_data.code
        )
        
        # Get user info from Google
        resp = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            token=token
        )
        user_info = resp.json()
        
        # Find or create user
        user = db.query(User).filter(User.google_id == user_info["id"]).first()
        
        if not user:
            # Check if email exists
            user = db.query(User).filter(User.email == user_info["email"]).first()
            
            if user:
                # Link Google account to existing user
                user.google_id = user_info["id"]
            else:
                # Create new user
                user = User(
                    email=user_info["email"],
                    google_id=user_info["id"],
                    username=user_info.get("name")
                )
                db.add(user)
            
            db.commit()
            db.refresh(user)
        
        # Create access token
        access_token = create_access_token(data={"sub": user.email})
        
        return {"access_token": access_token, "token_type": "bearer"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Google authentication failed: {str(e)}"
        )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user's information.
    """
    return current_user
