"""
Script to seed the database with sample properties.
Run this after setting up the database to have test data.
"""
from decimal import Decimal
from app.database import SessionLocal, Base, engine
from app.models import Property
from app.core.scoring import calculate_profitability_score, estimate_monthly_rent


def create_sample_properties():
    """Create sample property data for testing."""
    # Create tables if they don't exist
    print("📋 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables ready!")
    
    db = SessionLocal()
    
    sample_properties = [
        {
            "address": "123 Sunset Boulevard",
            "city": "Los Angeles",
            "state": "CA",
            "zip_code": "90028",
            "price": Decimal("750000"),
            "size_sqft": 2200,
            "bedrooms": 4,
            "bathrooms": 3.0,
            "property_type": "single_family",
            "year_built": 2018,
            "lat": 34.0928,
            "lng": -118.3287
        },
        {
            "address": "456 Ocean Avenue",
            "city": "Santa Monica",
            "state": "CA",
            "zip_code": "90401",
            "price": Decimal("950000"),
            "size_sqft": 1800,
            "bedrooms": 3,
            "bathrooms": 2.5,
            "property_type": "condo",
            "year_built": 2020,
            "lat": 34.0195,
            "lng": -118.4912
        },
        {
            "address": "789 Main Street",
            "city": "Pasadena",
            "state": "CA",
            "zip_code": "91101",
            "price": Decimal("550000"),
            "size_sqft": 1500,
            "bedrooms": 3,
            "bathrooms": 2.0,
            "property_type": "townhouse",
            "year_built": 2010,
            "lat": 34.1478,
            "lng": -118.1445
        },
        {
            "address": "321 Beverly Drive",
            "city": "Beverly Hills",
            "state": "CA",
            "zip_code": "90210",
            "price": Decimal("1250000"),
            "size_sqft": 3000,
            "bedrooms": 5,
            "bathrooms": 4.0,
            "property_type": "single_family",
            "year_built": 2022,
            "lat": 34.0736,
            "lng": -118.4004
        },
        {
            "address": "654 Wilshire Boulevard",
            "city": "Los Angeles",
            "state": "CA",
            "zip_code": "90017",
            "price": Decimal("425000"),
            "size_sqft": 1200,
            "bedrooms": 2,
            "bathrooms": 2.0,
            "property_type": "condo",
            "year_built": 2015,
            "lat": 34.0522,
            "lng": -118.2437
        },
        {
            "address": "987 Hollywood Hills Road",
            "city": "Los Angeles",
            "state": "CA",
            "zip_code": "90068",
            "price": Decimal("680000"),
            "size_sqft": 1900,
            "bedrooms": 3,
            "bathrooms": 2.5,
            "property_type": "single_family",
            "year_built": 2008,
            "lat": 34.1184,
            "lng": -118.3398
        },
        {
            "address": "147 Venice Beach Walk",
            "city": "Venice",
            "state": "CA",
            "zip_code": "90291",
            "price": Decimal("820000"),
            "size_sqft": 1600,
            "bedrooms": 2,
            "bathrooms": 2.0,
            "property_type": "townhouse",
            "year_built": 2019,
            "lat": 33.9850,
            "lng": -118.4695
        },
        {
            "address": "258 Downtown Loft",
            "city": "Los Angeles",
            "state": "CA",
            "zip_code": "90014",
            "price": Decimal("520000"),
            "size_sqft": 1100,
            "bedrooms": 1,
            "bathrooms": 1.5,
            "property_type": "condo",
            "year_built": 2021,
            "lat": 34.0407,
            "lng": -118.2468
        },
    ]
    
    try:
        for prop_data in sample_properties:
            # Calculate estimated rent
            estimated_rent = estimate_monthly_rent(
                prop_data["price"],
                prop_data["size_sqft"],
                prop_data["bedrooms"]
            )
            
            # Calculate profitability score
            score = calculate_profitability_score(
                price=prop_data["price"],
                size_sqft=prop_data["size_sqft"],
                estimated_rent=estimated_rent,
                year_built=prop_data.get("year_built"),
                property_type=prop_data["property_type"]
            )
            
            # Create property
            property_obj = Property(
                **prop_data,
                profitability_score=score,
                estimated_rent=estimated_rent
            )
            
            db.add(property_obj)
        
        db.commit()
        print(f"✅ Successfully created {len(sample_properties)} sample properties!")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating sample properties: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_sample_properties()
