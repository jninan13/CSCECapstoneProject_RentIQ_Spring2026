"""
Favorite model for user-property relationships.
Allows users to save properties they're interested in.
"""
from sqlalchemy import Column, Integer, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..database import Base


class Favorite(Base):
    __tablename__ = "favorites"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    property_id = Column(Integer, ForeignKey("properties.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Ensure a user can't favorite the same property twice
    __table_args__ = (UniqueConstraint('user_id', 'property_id', name='_user_property_uc'),)
    
    # Relationships
    user = relationship("User", back_populates="favorites")
    property = relationship("Property", back_populates="favorites")
