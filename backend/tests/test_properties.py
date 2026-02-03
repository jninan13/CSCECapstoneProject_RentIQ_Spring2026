"""
Tests for property search and scoring.
"""
import pytest
from decimal import Decimal
from fastapi import status
from app.models import Property
from app.core.scoring import calculate_profitability_score, estimate_monthly_rent


def test_property_search_by_zip(client, db):
    """Test searching properties by zip code."""
    # Create test properties
    from app.core.scoring import estimate_monthly_rent, calculate_profitability_score
    
    for i in range(3):
        estimated_rent = estimate_monthly_rent(Decimal("300000"), 1500, 3)
        score = calculate_profitability_score(
            price=Decimal("300000"),
            size_sqft=1500,
            estimated_rent=estimated_rent,
            year_built=2015,
            property_type="single_family"
        )
        
        prop = Property(
            address=f"{i} Main St",
            city="TestCity",
            state="CA",
            zip_code="90210",
            price=Decimal("300000"),
            size_sqft=1500,
            bedrooms=3,
            bathrooms=2.0,
            property_type="single_family",
            year_built=2015,
            profitability_score=score,
            estimated_rent=estimated_rent
        )
        db.add(prop)
    
    db.commit()
    
    # Search by zip
    response = client.get("/api/properties?zip_code=90210")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 3


def test_property_search_price_filter(client, db):
    """Test filtering properties by price range."""
    from app.core.scoring import estimate_monthly_rent, calculate_profitability_score
    
    prices = [Decimal("200000"), Decimal("300000"), Decimal("400000")]
    
    for i, price in enumerate(prices):
        estimated_rent = estimate_monthly_rent(price, 1500, 3)
        score = calculate_profitability_score(
            price=price,
            size_sqft=1500,
            estimated_rent=estimated_rent,
            year_built=2015,
            property_type="single_family"
        )
        
        prop = Property(
            address=f"{i} Main St",
            city="TestCity",
            state="CA",
            zip_code="90210",
            price=price,
            size_sqft=1500,
            bedrooms=3,
            bathrooms=2.0,
            property_type="single_family",
            profitability_score=score,
            estimated_rent=estimated_rent
        )
        db.add(prop)
    
    db.commit()
    
    # Filter by price
    response = client.get("/api/properties?min_price=250000&max_price=350000")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert float(data[0]["price"]) == 300000.0


def test_profitability_score_calculation():
    """Test the profitability scoring algorithm."""
    # Good investment property
    score = calculate_profitability_score(
        price=Decimal("200000"),
        size_sqft=1500,
        estimated_rent=Decimal("2000"),  # Good price-to-rent ratio
        year_built=2020,  # New
        property_type="single_family"
    )
    
    assert score > 70  # Should be a high score
    
    # Poor investment property
    poor_score = calculate_profitability_score(
        price=Decimal("500000"),
        size_sqft=1000,
        estimated_rent=Decimal("1500"),  # Poor price-to-rent ratio
        year_built=1950,  # Old
        property_type="condo"
    )
    
    assert poor_score < score  # Should be lower than good property


def test_rent_estimation():
    """Test monthly rent estimation."""
    rent = estimate_monthly_rent(
        price=Decimal("300000"),
        size_sqft=1500,
        bedrooms=3
    )
    
    # Should be roughly 1% of price (with adjustments)
    assert Decimal("2500") < rent < Decimal("3500")


def test_get_property_detail(client, db):
    """Test getting a single property's details."""
    from app.core.scoring import estimate_monthly_rent, calculate_profitability_score
    
    estimated_rent = estimate_monthly_rent(Decimal("300000"), 1500, 3)
    score = calculate_profitability_score(
        price=Decimal("300000"),
        size_sqft=1500,
        estimated_rent=estimated_rent,
        year_built=2015,
        property_type="single_family"
    )
    
    prop = Property(
        address="123 Test St",
        city="TestCity",
        state="CA",
        zip_code="90210",
        price=Decimal("300000"),
        size_sqft=1500,
        bedrooms=3,
        bathrooms=2.0,
        property_type="single_family",
        profitability_score=score,
        estimated_rent=estimated_rent
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    
    response = client.get(f"/api/properties/{prop.id}")
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["address"] == "123 Test St"
    assert "profitability_score" in data
