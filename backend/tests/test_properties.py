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


def _make_property(db, address, city, state, zip_code, price=Decimal("300000")):
    """Helper to insert a property with minimal required fields."""
    from app.core.scoring import estimate_monthly_rent, calculate_profitability_score
    estimated_rent = estimate_monthly_rent(price, 1500, 3)
    score = calculate_profitability_score(
        price=price, size_sqft=1500, estimated_rent=estimated_rent,
        year_built=2015, property_type="single_family"
    )
    prop = Property(
        address=address, city=city, state=state, zip_code=zip_code,
        price=price, size_sqft=1500, bedrooms=3, bathrooms=2.0,
        property_type="single_family", year_built=2015,
        profitability_score=score, estimated_rent=estimated_rent,
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


def test_q_search_by_zip(client, db):
    """q param matches properties whose zip_code contains the token."""
    _make_property(db, "1 Oak Ave", "Springfield", "IL", "62701")
    _make_property(db, "2 Elm St", "Shelbyville", "IL", "62565")

    response = client.get("/api/properties?q=62701")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["zip_code"] == "62701"


def test_q_search_by_city(client, db):
    """q param matches properties by city name."""
    _make_property(db, "10 Main St", "Beverly Hills", "CA", "90210")
    _make_property(db, "20 Oak Rd", "Los Angeles", "CA", "90001")

    response = client.get("/api/properties?q=Beverly+Hills")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["city"] == "Beverly Hills"


def test_q_search_by_state(client, db):
    """q param matches all properties in a state."""
    _make_property(db, "1 A St", "Austin", "TX", "78701")
    _make_property(db, "2 B St", "Dallas", "TX", "75201")
    _make_property(db, "3 C St", "Miami", "FL", "33101")

    response = client.get("/api/properties?q=TX")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2
    assert all(p["state"] == "TX" for p in data)


def test_q_search_by_street_address(client, db):
    """q param matches a partial street address."""
    _make_property(db, "123 Maple Drive", "Denver", "CO", "80201")
    _make_property(db, "456 Oak Blvd", "Denver", "CO", "80202")

    response = client.get("/api/properties?q=Maple")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert "Maple" in data[0]["address"]


def test_q_search_full_address_narrows_to_one(client, db):
    """A multi-token full address narrows down to a single property."""
    _make_property(db, "123 Main St", "Austin", "TX", "78701")
    _make_property(db, "456 Main St", "Austin", "TX", "78701")
    _make_property(db, "123 Main St", "Dallas", "TX", "75201")

    response = client.get("/api/properties?q=123+Main+St+Austin+TX+78701")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["address"] == "123 Main St"
    assert data[0]["city"] == "Austin"


def test_zip_code_prefix_match(client, db):
    """zip_code filter uses prefix match so partial zip still finds results."""
    _make_property(db, "1 Pine St", "Beverly Hills", "CA", "90210")
    _make_property(db, "2 Oak St", "Culver City", "CA", "90230")

    response = client.get("/api/properties?zip_code=902")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 2

    response = client.get("/api/properties?zip_code=90210")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["zip_code"] == "90210"


def test_bedrooms_exact_match(client, db):
    """bedrooms_match=exact returns only properties with exactly that many beds."""
    from app.core.scoring import estimate_monthly_rent, calculate_profitability_score
    for beds, price in [(1, Decimal("300000")), (2, Decimal("310000")), (3, Decimal("320000")), (4, Decimal("330000"))]:
        rent = estimate_monthly_rent(price, 1500, beds)
        score = calculate_profitability_score(price=price, size_sqft=1500, estimated_rent=rent, year_built=2015, property_type="single_family")
        db.add(Property(address=f"{beds} Main St", city="Austin", state="TX", zip_code="78701",
                        price=price, size_sqft=1500, bedrooms=beds, bathrooms=2.0,
                        property_type="single_family", year_built=2015,
                        profitability_score=score, estimated_rent=rent))
    db.commit()

    response = client.get("/api/properties?bedrooms=3&bedrooms_match=exact")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert len(data) == 1
    assert data[0]["bedrooms"] == 3

    response = client.get("/api/properties?bedrooms=3&bedrooms_match=gte")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(p["bedrooms"] >= 3 for p in data)
    assert len(data) == 2  # 3-bed and 4-bed


def test_bathrooms_exact_match(client, db):
    """bathrooms_match=exact returns only properties with exactly that many baths."""
    from app.core.scoring import estimate_monthly_rent, calculate_profitability_score
    for baths, price in [(1.0, Decimal("300000")), (1.5, Decimal("310000")), (2.0, Decimal("320000")), (2.5, Decimal("330000"))]:
        rent = estimate_monthly_rent(price, 1500, 3)
        score = calculate_profitability_score(price=price, size_sqft=1500, estimated_rent=rent, year_built=2015, property_type="single_family")
        db.add(Property(address=f"{baths} bath St", city="Denver", state="CO", zip_code="80201",
                        price=price, size_sqft=1500, bedrooms=3, bathrooms=baths,
                        property_type="single_family", year_built=2015,
                        profitability_score=score, estimated_rent=rent))
    db.commit()

    response = client.get("/api/properties?bathrooms=2.0&bathrooms_match=exact")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(p["bathrooms"] == 2.0 for p in data)
    assert len(data) == 1

    response = client.get("/api/properties?bathrooms=2.0&bathrooms_match=gte")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert all(p["bathrooms"] >= 2.0 for p in data)
    assert len(data) == 2  # 2.0 and 2.5


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
