"""
Script to load property data from CSV file into the database.
Handles CSV parsing, field mapping, validation, and database insertion.
Run: python load_csv_data.py
"""
import csv
import sys
from decimal import Decimal
from pathlib import Path
from typing import Optional, Dict, Any
import requests
import time

from app.database import SessionLocal, Base, engine
from app.models import Property
from app.core.scoring import calculate_profitability_score, estimate_monthly_rent
from app.core.security import get_password_hash


geocode_cache = {}


def parse_bool(value: Any) -> Optional[bool]:
    """Parse common CSV truthy/falsey strings into booleans."""
    if value is None:
        return None
    text = str(value).strip().lower()
    if text in {"true", "1", "yes", "y", "t"}:
        return True
    if text in {"false", "0", "no", "n", "f"}:
        return False
    return None


def parse_float(value: Any) -> Optional[float]:
    """Parse optional float values from CSV safely."""
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None



def reverse_geocode(lat: float, lng: float) -> Optional[str]:
    """Return address string from lat/lon using openstreetmap"""
    key = f"{lat}, {lng}"
    if key in geocode_cache:
        return geocode_cache[key]
    

    if not lat or not lng:
        return None
    url =   "https://nominatim.openstreetmap.org/reverse"
    params = {
        "format": "json",
        "lat": lat,
        "lon": lng,
        "zoom": 18,
        "addressdetails": 1
    }
    try:
        time.sleep(1)
        res = requests.get(url, params=params, headers={"User-Agent": "RentIQ/1.0"})
        res.raise_for_status()
        data = res.json()
        address = data.get("display_name")
        geocode_cache[key] = address
        return address
    except Exception as e:
        print(f"❌ Geocoding error for ({lat}, {lng}): {str(e)}")
        return None
    


def parse_csv_row(row: Dict[str, str]) -> Optional[Dict[str, Any]]:
    """
    Parse a CSV row into property data.
    
    Args:
        row: Dictionary from CSV reader
        
    Returns:
        Dictionary of property data or None if validation fails
    """
    try:
        # Extract and validate required fields
        address = row.get("city", "Unknown")  # Use city as part of address since full address not in CSV
        city = row.get("city", "").strip()
        state = row.get("state", "").strip().upper()
        full_address = reverse_geocode(float(row.get("latitude")), float(row.get("longitude"))) if row.get("latitude") and row.get("longitude") else None
        if not full_address:
            full_address = f"{city}, {state}"

        
        if not city or not state or len(state) != 2:
            return None
        
        # Price (required)
        try:
            price_float = float(row.get("price", 0))
            if price_float <= 0:
                return None
            price = Decimal(str(price_float))
        except (ValueError, TypeError):
            return None
        
        # Living area / size (required)
        try:
            size_sqft = int(float(row.get("livingArea", 0)))
            if size_sqft <= 0:
                return None
        except (ValueError, TypeError):
            return None
        
        # Bedrooms (required)
        try:
            bedrooms = int(float(row.get("num_bedrooms.x", 0)))
            if bedrooms < 0:
                return None
        except (ValueError, TypeError):
            return None
        
        # Bathrooms (calculate from full baths + half baths)
        try:
            full_baths = float(row.get("num_full_baths.x", 0))
            half_baths = float(row.get("num_half_baths", 0))
            three_quarter_baths = float(row.get("num_three_quarter_baths", 0))
            bathrooms = full_baths + (half_baths * 0.5) + (three_quarter_baths * 0.75)
            if bathrooms < 0:
                bathrooms = 1.0  # Default to 1 bathroom
        except (ValueError, TypeError):
            bathrooms = 1.0
        
        # Property type
        raw_property_type = row.get("property_type", "house")
        property_type_normalized = str(raw_property_type).lower().strip().replace(" ", "_")
        property_type_map = {
            "single_family_residential": "single_family",
            "single_family": "single_family",
            "house": "single_family",
            "multi_family_2_to_4": "multi_family",
            "multi_family": "multi_family",
            "townhouse": "townhouse",
            "condo_coop": "condo",
            "condo": "condo",
            "apartment": "condo",
            "manufactured": "house",
            "land": "land",
        }
        property_type = property_type_map.get(property_type_normalized, "single_family")
        
        # Year built
        try:
            year_built_str = row.get("yearBuilt.x", "")
            year_built = int(float(year_built_str)) if year_built_str else None
            if year_built and (year_built < 1800 or year_built > 2100):
                year_built = None
        except (ValueError, TypeError):
            year_built = None
        
        # Coordinates
        try:
            lat = float(row.get("latitude", 0))
            lng = float(row.get("longitude", 0))
            if lat == 0 or lng == 0:  # Invalid coordinates
                lat, lng = None, None
        except (ValueError, TypeError):
            lat, lng = None, None
        
        # Zip code
        zip_code = row.get("zip_code", "00000").strip()
        if not zip_code or zip_code == "":
            zip_code = "00000"
        
        # Estimate rent if not provided
        estimated_rent = estimate_monthly_rent(price, size_sqft, bedrooms)

        # Market/risk features from CSV for richer scoring.
        crime_rate = None
        for key in ["crime_rate", "city_crime_rate", "crime_index"]:
            crime_rate = parse_float(row.get(key))
            if crime_rate is not None:
                break

        violent_crime = None
        for key in ["violent_crime", "violent_crime_rate"]:
            violent_crime = parse_float(row.get(key))
            if violent_crime is not None:
                break

        property_crime = None
        for key in ["property_crime", "property_crime_rate"]:
            property_crime = parse_float(row.get(key))
            if property_crime is not None:
                break

        days_on_market = parse_float(row.get("days_on_market"))
        lagged_cpi = parse_float(row.get("lagged_CPI"))
        fed_rate = parse_float(row.get("fed_rate"))
        lagged_unemployment = parse_float(row.get("lagged_unemployment"))
        volatility_value = parse_float(row.get("volatility_value"))
        nr_weeks = parse_float(row.get("nr_weeks"))
        lot_area = parse_float(row.get("lotArea"))

        is_hot = parse_bool(row.get("isHot"))
        is_new_listing = parse_bool(row.get("isNew"))
        is_virtual_tour = parse_bool(row.get("is_virtual_tour"))
        search_status = row.get("searchStatus")
        
        # Calculate profitability score
        profitability_score = calculate_profitability_score(
            price=price,
            size_sqft=size_sqft,
            estimated_rent=estimated_rent,
            year_built=year_built,
            property_type=property_type,
            crime_rate=crime_rate,
            violent_crime=violent_crime,
            property_crime=property_crime,
            days_on_market=days_on_market,
            is_hot=is_hot,
            is_new_listing=is_new_listing,
            search_status=search_status,
            lagged_cpi=lagged_cpi,
            fed_rate=fed_rate,
            lagged_unemployment=lagged_unemployment,
            volatility_value=volatility_value,
            nr_weeks=nr_weeks,
            bathrooms=bathrooms,
            lot_area=lot_area,
            is_virtual_tour=is_virtual_tour,
        )
        
        return {
            "address": full_address,
            "city": city,
            "state": state,
            "zip_code": zip_code,
            "price": price,
            "size_sqft": size_sqft,
            "bedrooms": bedrooms,
            "bathrooms": bathrooms,
            "property_type": property_type,
            "year_built": year_built,
            "lat": lat,
            "lng": lng,
            "estimated_rent": estimated_rent,
            "profitability_score": profitability_score,
            "image_url": None,
        }
    
    except Exception as e:
        print(f"❌ Error parsing row: {str(e)}")
        return None


def load_csv_into_db(csv_file_path: str, batch_size: int = 100, start_row: Optional[int] = None, max_rows: Optional[int] = None):
    """
    Load property data from CSV file into database.
    
    Args:
        csv_file_path: Path to CSV file
        batch_size: Number of records to insert per batch
        start_row: Starting row number (1-indexed, after header). None = start at beginning
        max_rows: Maximum rows to load (None = load all)
    """
    csv_file = Path(csv_file_path)
    
    if not csv_file.exists():
        print(f"❌ CSV file not found: {csv_file_path}")
        return
    
    print(f"📁 Loading data from: {csv_file_path}")
    
    # Ensure tables exist without dropping unrelated data
    print("📋 Ensuring database tables exist...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables ready!")
    
    db = SessionLocal()
    
    try:
        # Clear existing properties
        deleted = db.query(Property).delete()
        db.commit()
        if deleted:
            print(f"🗑️  Cleared {deleted} existing properties")
        
        # Load CSV
        loaded_count = 0
        skipped_count = 0
        batch = []
        
        with open(csv_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            if reader.fieldnames is None:
                print("❌ CSV file is empty or has no headers")
                return
            
            print(f"📊 CSV columns: {', '.join(reader.fieldnames[:5])}...")
            print(f"📊 Total columns: {len(reader.fieldnames)}")
            
            start_row_num = (start_row + 1) if start_row else 2  # Convert to actual row number (row 1 = header)
            end_row_num = (start_row_num + max_rows - 1) if max_rows else None
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 (after header)
                if row_num < start_row_num:
                    continue  # Skip rows before start
                if end_row_num and row_num > end_row_num:
                    break  # Stop after reaching end
                
                property_data = parse_csv_row(row)
                
                if property_data:
                    property_obj = Property(**property_data)
                    batch.append(property_obj)
                    loaded_count += 1
                    
                    # Insert batch
                    if len(batch) >= batch_size:
                        db.add_all(batch)
                        db.commit()
                        print(f"✅ Inserted {loaded_count} properties...")
                        batch = []
                else:
                    skipped_count += 1
                
                # Progress indicator
                if row_num % 1000 == 0:
                    print(f"📈 Processed {row_num} rows ({loaded_count} valid, {skipped_count} skipped)...")
        
        # Insert remaining batch
        if batch:
            db.add_all(batch)
            db.commit()
        
        print(f"\n✅ Data load complete!")
        print(f"   ✓ Loaded: {loaded_count} properties")
        print(f"   ⚠️  Skipped: {skipped_count} invalid rows")
        print(f"   📊 Total processed: {loaded_count + skipped_count}")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Database error: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


def recalculate_scores_in_db(limit: Optional[int] = None):
    """Recalculate profitability scores for existing properties in-place.

    This mode uses fields already persisted in the database, so it does not
    require CSV reload and does not delete any rows.
    """
    print("🔁 Recalculating profitability scores for existing properties...")
    db = SessionLocal()

    try:
        query = db.query(Property).order_by(Property.id)
        if limit and limit > 0:
            query = query.limit(limit)

        properties = query.all()
        if not properties:
            print("ℹ️  No properties found to recalculate.")
            return

        updated = 0
        for prop in properties:
            prop.profitability_score = calculate_profitability_score(
                price=prop.price,
                size_sqft=prop.size_sqft,
                estimated_rent=prop.estimated_rent,
                year_built=prop.year_built,
                property_type=prop.property_type,
            )
            updated += 1

            if updated % 500 == 0:
                db.commit()
                print(f"✅ Recalculated {updated} properties...")

        db.commit()
        print(f"✅ Recalculation complete! Updated {updated} properties.")
        print("ℹ️  Crime-based adjustments are only applied during CSV import since crime metrics are not stored in the properties table.")

    except Exception as e:
        db.rollback()
        print(f"❌ Recalculation error: {str(e)}")
        sys.exit(1)
    finally:
        db.close()


def main():
    """Main entry point."""
    csv_path = "USA_clean_unique_with_city.csv"
    start_row = None
    max_rows = None
    recalculate_only = False
    recalc_limit = None
    
    # Parse command line arguments
    # Usage:
    #   python load_csv_data.py [csv_file] [start_row] [max_rows]
    #   python load_csv_data.py --recalculate [limit]
    if len(sys.argv) > 1 and sys.argv[1] == "--recalculate":
        recalculate_only = True
        if len(sys.argv) > 2:
            try:
                recalc_limit = int(sys.argv[2])
                print(f"🔒 Recalculating maximum {recalc_limit} properties")
            except ValueError:
                pass

        recalculate_scores_in_db(limit=recalc_limit)
        return

    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    if len(sys.argv) > 2:
        try:
            start_row = int(sys.argv[2])
            print(f"📍 Starting at row {start_row}")
        except ValueError:
            pass
    if len(sys.argv) > 3:
        try:
            max_rows = int(sys.argv[3])
            print(f"🔒 Loading maximum {max_rows} rows")
        except ValueError:
            pass
    
    load_csv_into_db(str(csv_path), start_row=start_row, max_rows=max_rows)


if __name__ == "__main__":
    main()
