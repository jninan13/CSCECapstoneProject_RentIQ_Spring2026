"""
Pydantic schemas for property data.
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from decimal import Decimal


class PropertyBase(BaseModel):
    address: str
    city: str
    state: str = Field(..., max_length=2)
    zip_code: str
    price: Decimal
    size_sqft: int
    bedrooms: int
    bathrooms: float
    property_type: str
    year_built: Optional[int] = None
    lat: Optional[float] = None
    lng: Optional[float] = None


class PropertyCreate(PropertyBase):
    pass


class PropertyResponse(PropertyBase):
    id: int
    profitability_score: float
    estimated_rent: Optional[Decimal] = None
    created_at: datetime
    is_favorited: bool = False  # Set dynamically based on user
    
    class Config:
        from_attributes = True


class PropertySearchParams(BaseModel):
    """Query parameters for property search."""
    zip_code: Optional[str] = None
    min_price: Optional[Decimal] = None
    max_price: Optional[Decimal] = None
    min_size: Optional[int] = None
    max_size: Optional[int] = None
    bedrooms: Optional[int] = None
    bathrooms: Optional[float] = None
    property_type: Optional[str] = None
    radius_miles: Optional[float] = Field(None, ge=0, le=50)  # Max 50 miles
    min_score: Optional[float] = Field(None, ge=0, le=100)
    skip: int = Field(0, ge=0)
    limit: int = Field(20, ge=1, le=100)


class FavoriteCreate(BaseModel):
    property_id: int


class FavoriteResponse(BaseModel):
    id: int
    user_id: int
    property_id: int
    created_at: datetime
    property: PropertyResponse
    
    class Config:
        from_attributes = True
