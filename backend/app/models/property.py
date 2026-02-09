"""
Property model for storing real estate listings.
Includes profitability score calculation.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Property(Base):
    __tablename__ = "properties"
    
    id = Column(Integer, primary_key=True, index=True)
    address = Column(String, nullable=False)
    city = Column(String, nullable=False, index=True)
    state = Column(String(2), nullable=False)
    zip_code = Column(String(10), nullable=False, index=True)
    price = Column(Numeric(12, 2), nullable=False)
    size_sqft = Column(Integer, nullable=False)
    bedrooms = Column(Integer, nullable=False)
    bathrooms = Column(Float, nullable=False)
    property_type = Column(String, nullable=False)  # house, condo, townhouse, etc.
    year_built = Column(Integer, nullable=True)
    image_url = Column(String, nullable=True)
    
    # Location coordinates for radius search
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    
    # Investment metrics
    profitability_score = Column(Float, nullable=False, index=True)  # 0-100 scale
    estimated_rent = Column(Numeric(10, 2), nullable=True)  # Monthly rent estimate
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    favorites = relationship("Favorite", back_populates="property", cascade="all, delete-orphan")
