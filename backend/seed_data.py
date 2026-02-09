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
            "lng": -118.3287,
            "image_url": "https://www.bhg.com/thmb/H9VV9JNnKl-H1faFXnPlQfNprYw=/1799x0/filters:no_upscale():strip_icc()/white-modern-house-curved-patio-archway-c0a4a3b3-aa51b24d14d0464ea15d36e05aa85ac9.jpg"
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
            "lng": -118.4912,
            "image_url" : "https://saterdesign.com/cdn/shop/files/9024-Main-Image_1600x.jpg?v=1744743942"
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
            "lng": -118.1445,
            "image_url" : "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSH5neiCCWJeR2uJXhzexO8nPrHI4JdgKih5A&s"
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
            "lng": -118.4004,
            "image_url" : "https://webberstudio.com/wp-content/uploads/2023/02/Stunning-House-Design.jpg"
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
            "lng": -118.2437,
            "image_url" : "https://hips.hearstapps.com/hmg-prod/images/dutch-colonial-house-style-66956274903da.jpg?crop=1.00xw:0.671xh;0,0.131xh&resize=1120:*"
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
            "lng": -118.3398,
            "image_url" : "https://houseplans.co/media/cached_assets/images/house_plan_images/1168ESrd_900x600.jpg"
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
            "lng": -118.4695,
            "image_url" : "https://i0.wp.com/houseplans-3d.com/wp-content/uploads/2024/03/Simple-House-Design-25x39-Feet-House-Design-7.5x12-M-4-Beds-3-Bath-front-Cover.jpg?fit=1920%2C1080&ssl=1"
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
            "lng": -118.,
            "image_url" : "https://www.powerhrg.com/wp-content/uploads/2024/03/PHL_34-20702_3481-1-1.jpg"
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
