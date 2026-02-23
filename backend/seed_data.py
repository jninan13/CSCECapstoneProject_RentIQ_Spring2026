"""
Script to seed the database with sample properties and a dev/test user.
Run this after setting up the database to have test data.
Re-running will clear existing properties and reseed.
"""
from decimal import Decimal
from app.database import SessionLocal, Base, engine
from app.models import Property, User
from app.core.scoring import calculate_profitability_score, estimate_monthly_rent
from app.core.security import get_password_hash

# Dev account credentials for testing
DEV_EMAIL = "dev@gmail.com"
DEV_USERNAME = "devuser"
DEV_PASSWORD = "dev12345"


def create_dev_user(db):
    """Create a dev/test user if it doesn't exist."""
    existing = db.query(User).filter(User.email == DEV_EMAIL).first()
    if existing:
        print(f"👤 Dev user already exists: {DEV_EMAIL}")
        return

    user = User(
        email=DEV_EMAIL,
        username=DEV_USERNAME,
        password_hash=get_password_hash(DEV_PASSWORD),
    )
    db.add(user)
    db.commit()
    print(f"👤 Created dev user: {DEV_EMAIL} / password: {DEV_PASSWORD}")


def create_sample_properties():
    """Create sample property data for testing."""
    print("📋 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables ready!")

    db = SessionLocal()

    create_dev_user(db)

    try:
        deleted = db.query(Property).delete()
        db.commit()
        if deleted:
            print(f"🗑️  Cleared {deleted} existing properties")
    except Exception:
        db.rollback()

    sample_properties = [
        {
            "address": "1847 Riverside Drive",
            "city": "Austin",
            "state": "TX",
            "zip_code": "78741",
            "price": Decimal("365000"),
            "size_sqft": 1650,
            "bedrooms": 3,
            "bathrooms": 2.0,
            "property_type": "single_family",
            "year_built": 2012,
            "lat": 30.2487,
            "lng": -97.7194,
            "image_url": "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800",
            "estimated_rent": Decimal("2450"),
        },
        {
            "address": "921 Oak Park Avenue",
            "city": "Chicago",
            "state": "IL",
            "zip_code": "60634",
            "price": Decimal("289000"),
            "size_sqft": 1200,
            "bedrooms": 3,
            "bathrooms": 1.5,
            "property_type": "single_family",
            "year_built": 1958,
            "lat": 41.9476,
            "lng": -87.7978,
            "image_url": "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800",
            "estimated_rent": Decimal("2100"),
        },
        {
            "address": "4402 Magnolia Lane",
            "city": "Phoenix",
            "state": "AZ",
            "zip_code": "85018",
            "price": Decimal("475000"),
            "size_sqft": 2100,
            "bedrooms": 4,
            "bathrooms": 2.5,
            "property_type": "single_family",
            "year_built": 2019,
            "lat": 33.5091,
            "lng": -112.0424,
            "image_url": "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800",
        },
        {
            "address": "2205 Peachtree Street",
            "city": "Atlanta",
            "state": "GA",
            "zip_code": "30309",
            "price": Decimal("395000"),
            "size_sqft": 1450,
            "bedrooms": 3,
            "bathrooms": 2.0,
            "property_type": "townhouse",
            "year_built": 2005,
            "lat": 33.7950,
            "lng": -84.3897,
            "image_url": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800",
            "estimated_rent": Decimal("2650"),
        },
        {
            "address": "77 Market Square Unit 4B",
            "city": "Denver",
            "state": "CO",
            "zip_code": "80202",
            "price": Decimal("425000"),
            "size_sqft": 980,
            "bedrooms": 2,
            "bathrooms": 2.0,
            "property_type": "condo",
            "year_built": 2018,
            "lat": 39.7508,
            "lng": -104.9966,
            "image_url": "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800",
        },
        {
            "address": "3100 South Grand Boulevard",
            "city": "St. Louis",
            "state": "MO",
            "zip_code": "63118",
            "price": Decimal("185000"),
            "size_sqft": 1400,
            "bedrooms": 4,
            "bathrooms": 2.0,
            "property_type": "single_family",
            "year_built": 1920,
            "lat": 38.5896,
            "lng": -90.2268,
            "image_url": "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800",
            "estimated_rent": Decimal("1650"),
        },
        {
            "address": "1522 Highland Avenue",
            "city": "Columbus",
            "state": "OH",
            "zip_code": "43201",
            "price": Decimal("278000"),
            "size_sqft": 1280,
            "bedrooms": 3,
            "bathrooms": 2.0,
            "property_type": "single_family",
            "year_built": 1992,
            "lat": 39.9833,
            "lng": -82.9833,
            "image_url": "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800",
            "estimated_rent": Decimal("1950"),
        },
        {
            "address": "555 Harbor View Terrace",
            "city": "Seattle",
            "state": "WA",
            "zip_code": "98109",
            "price": Decimal("875000"),
            "size_sqft": 1800,
            "bedrooms": 3,
            "bathrooms": 2.5,
            "property_type": "condo",
            "year_built": 2021,
            "lat": 47.6276,
            "lng": -122.3500,
            "image_url": "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800",
        },
        {
            "address": "8900 Westheimer Road",
            "city": "Houston",
            "state": "TX",
            "zip_code": "77063",
            "price": Decimal("340000"),
            "size_sqft": 1950,
            "bedrooms": 4,
            "bathrooms": 2.5,
            "property_type": "single_family",
            "year_built": 2008,
            "lat": 29.7333,
            "lng": -95.5333,
            "image_url": "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
            "estimated_rent": Decimal("2250"),
        },
        {
            "address": "2100 Elm Street #1202",
            "city": "Dallas",
            "state": "TX",
            "zip_code": "75201",
            "price": Decimal("520000"),
            "size_sqft": 1150,
            "bedrooms": 2,
            "bathrooms": 2.0,
            "property_type": "condo",
            "year_built": 2015,
            "lat": 32.7848,
            "lng": -96.7980,
            "image_url": "https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800",
        },
        {
            "address": "4420 Brookside Drive",
            "city": "Kansas City",
            "state": "MO",
            "zip_code": "64111",
            "price": Decimal("315000"),
            "size_sqft": 1600,
            "bedrooms": 3,
            "bathrooms": 2.5,
            "property_type": "townhouse",
            "year_built": 2016,
            "lat": 39.0392,
            "lng": -94.5807,
            "image_url": "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800",
            "estimated_rent": Decimal("2200"),
        },
        {
            "address": "1200 Ocean Drive Penthouse",
            "city": "Miami Beach",
            "state": "FL",
            "zip_code": "33139",
            "price": Decimal("1950000"),
            "size_sqft": 3200,
            "bedrooms": 4,
            "bathrooms": 4.0,
            "property_type": "condo",
            "year_built": 2022,
            "lat": 25.7907,
            "lng": -80.1300,
            "image_url": "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800",
            "estimated_rent": Decimal("8500"),
        },
    ]

    try:
        for prop_data in sample_properties:
            estimated_rent = prop_data.pop("estimated_rent", None)
            if estimated_rent is None:
                estimated_rent = estimate_monthly_rent(
                    prop_data["price"],
                    prop_data["size_sqft"],
                    prop_data["bedrooms"],
                )

            score = calculate_profitability_score(
                price=prop_data["price"],
                size_sqft=prop_data["size_sqft"],
                estimated_rent=estimated_rent,
                year_built=prop_data.get("year_built"),
                property_type=prop_data["property_type"],
            )

            property_obj = Property(
                **prop_data,
                profitability_score=score,
                estimated_rent=estimated_rent,
            )
            db.add(property_obj)

        db.commit()
        print(f"✅ Successfully created {len(sample_properties)} sample properties!")
        print(f"\n🔐 Dev login: {DEV_EMAIL} / {DEV_PASSWORD}")

    except Exception as e:
        db.rollback()
        print(f"❌ Error creating sample properties: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_sample_properties()
