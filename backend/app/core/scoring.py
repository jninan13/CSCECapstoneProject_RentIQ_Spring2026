"""
Property profitability scoring algorithm.
Calculates investment potential based on multiple factors.
"""
from decimal import Decimal
from typing import Optional


def calculate_profitability_score(
    price: Decimal,
    size_sqft: int,
    estimated_rent: Optional[Decimal],
    year_built: Optional[int],
    property_type: str
) -> float:
    """
    Calculate a profitability score (0-100) for a property.
    
    Algorithm factors:
    1. Price-to-rent ratio (40% weight) - Lower is better
    2. Price per square foot (30% weight) - Compare to market average
    3. Property age (15% weight) - Newer is slightly better
    4. Property type (15% weight) - Single-family preferred
    
    Args:
        price: Property price
        size_sqft: Square footage
        estimated_rent: Estimated monthly rent
        year_built: Year property was built
        property_type: Type of property
    
    Returns:
        Score from 0 to 100
    """
    score = 0.0
    
    # Factor 1: Price-to-rent ratio (40 points)
    # Good investment: price = 100-150x monthly rent
    if estimated_rent and estimated_rent > 0:
        price_to_rent = float(price) / float(estimated_rent)
        
        if price_to_rent <= 100:
            score += 40
        elif price_to_rent <= 150:
            score += 40 - ((price_to_rent - 100) / 50 * 20)  # Linear decline
        elif price_to_rent <= 200:
            score += 20 - ((price_to_rent - 150) / 50 * 20)
        # else: 0 points
    else:
        # No rent data, give average score
        score += 20
    
    # Factor 2: Price per square foot (30 points)
    # Compare to national average (~$200/sqft)
    price_per_sqft = float(price) / size_sqft
    national_avg = 200
    
    if price_per_sqft <= national_avg * 0.7:  # 30% below average
        score += 30
    elif price_per_sqft <= national_avg:
        score += 30 - ((price_per_sqft - national_avg * 0.7) / (national_avg * 0.3) * 10)
    elif price_per_sqft <= national_avg * 1.3:
        score += 20 - ((price_per_sqft - national_avg) / (national_avg * 0.3) * 20)
    # else: 0 points
    
    # Factor 3: Property age (15 points)
    if year_built:
        from datetime import datetime
        age = datetime.now().year - year_built
        
        if age <= 10:
            score += 15
        elif age <= 30:
            score += 15 - ((age - 10) / 20 * 5)
        elif age <= 50:
            score += 10 - ((age - 30) / 20 * 5)
        else:
            score += 5
    else:
        score += 10  # Average score if unknown
    
    # Factor 4: Property type (15 points)
    type_scores = {
        "single_family": 15,
        "townhouse": 12,
        "condo": 10,
        "multi_family": 13,
        "land": 5,
    }
    score += type_scores.get(property_type.lower().replace(" ", "_"), 8)
    
    # Ensure score is within bounds
    return max(0.0, min(100.0, score))


def estimate_monthly_rent(price: Decimal, size_sqft: int, bedrooms: int) -> Decimal:
    """
    Estimate monthly rent based on property characteristics.
    Uses the 1% rule as a baseline: monthly rent ≈ 1% of purchase price.
    
    Adjustments:
    - Larger properties: slight premium per sqft
    - More bedrooms: higher rent potential
    """
    # Base: 1% rule
    base_rent = float(price) * 0.01
    
    # Adjust by size (premium for larger properties)
    if size_sqft > 2000:
        base_rent *= 1.1
    elif size_sqft < 1000:
        base_rent *= 0.95
    
    # Adjust by bedrooms
    if bedrooms >= 4:
        base_rent *= 1.05
    elif bedrooms <= 1:
        base_rent *= 0.95
    
    return Decimal(str(round(base_rent, 2)))
