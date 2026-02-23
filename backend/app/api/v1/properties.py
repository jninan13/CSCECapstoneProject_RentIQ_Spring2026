"""
Property search and listing endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime
import math

from ...database import get_db
from ...schemas import (
    PropertyResponse,
    PropertySearchParams,
    InvestmentAnalysisResponse,
    InvestmentAssumptionsSchema,
    InvestmentMetricsSchema,
    CashFlowBreakdownSchema,
)
from ...models import Property, Favorite, User
from ...utils import get_cached, set_cached, generate_cache_key
from ..deps import get_current_user
from ...core.investment import analyze_investment, InvestmentAssumptions

router = APIRouter(prefix="/properties", tags=["properties"])


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate distance between two coordinates using Haversine formula.
    
    Returns distance in miles.
    """
    R = 3959  # Earth's radius in miles
    
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    return R * c


@router.get("", response_model=List[PropertyResponse])
async def search_properties(
    zip_code: Optional[str] = Query(None, description="Filter by zip code"),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_size: Optional[int] = Query(None, ge=0),
    max_size: Optional[int] = Query(None, ge=0),
    bedrooms: Optional[int] = Query(None, ge=0),
    bathrooms: Optional[float] = Query(None, ge=0),
    property_type: Optional[str] = Query(None),
    radius_miles: Optional[float] = Query(None, ge=0, le=50),
    min_score: Optional[float] = Query(None, ge=0, le=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for properties with various filters.
    
    Supports filtering by location, price range, size, bedrooms, bathrooms,
    property type, radius from zip code, and minimum profitability score.
    
    Results are cached in Redis for improved performance.
    """
    # Generate cache key
    cache_key = generate_cache_key(
        "properties_search",
        zip_code=zip_code,
        min_price=min_price,
        max_price=max_price,
        min_size=min_size,
        max_size=max_size,
        bedrooms=bedrooms,
        bathrooms=bathrooms,
        property_type=property_type,
        radius_miles=radius_miles,
        min_score=min_score,
        skip=skip,
        limit=limit
    )
    
    # Check cache
    cached_results = get_cached(cache_key)
    if cached_results:
        properties = [PropertyResponse(**prop) for prop in cached_results]
    else:
        # Build query
        query = db.query(Property)
        
        # Apply filters
        if zip_code:
            query = query.filter(Property.zip_code == zip_code)
        
        if min_price is not None:
            query = query.filter(Property.price >= min_price)
        
        if max_price is not None:
            query = query.filter(Property.price <= max_price)
        
        if min_size is not None:
            query = query.filter(Property.size_sqft >= min_size)
        
        if max_size is not None:
            query = query.filter(Property.size_sqft <= max_size)
        
        if bedrooms is not None:
            query = query.filter(Property.bedrooms == bedrooms)
        
        if bathrooms is not None:
            query = query.filter(Property.bathrooms >= bathrooms)
        
        if property_type:
            query = query.filter(Property.property_type.ilike(f"%{property_type}%"))
        
        if min_score is not None:
            query = query.filter(Property.profitability_score >= min_score)
        
        # Order by score descending
        query = query.order_by(Property.profitability_score.desc())
        
        # Execute query
        properties_db = query.offset(skip).limit(limit).all()
        
        # Apply radius filter if specified (post-query filtering)
        if radius_miles and zip_code and properties_db:
            # Get center coordinates from first property with this zip
            center_prop = db.query(Property).filter(
                and_(Property.zip_code == zip_code, Property.lat.isnot(None))
            ).first()
            
            if center_prop and center_prop.lat and center_prop.lng:
                filtered_props = []
                for prop in properties_db:
                    if prop.lat and prop.lng:
                        distance = calculate_distance(
                            center_prop.lat, center_prop.lng,
                            prop.lat, prop.lng
                        )
                        if distance <= radius_miles:
                            filtered_props.append(prop)
                properties_db = filtered_props
        
        properties: List[PropertyResponse] = []
        for prop in properties_db:
            response_obj = PropertyResponse.model_validate(prop)
            # Attach summary investment metrics using default assumptions
            analysis = analyze_investment(prop)
            if analysis:
                response_obj.cap_rate = analysis.cap_rate
                response_obj.gross_yield = analysis.gross_yield
                response_obj.net_yield = analysis.net_yield
                response_obj.cash_on_cash_roi = analysis.cash_on_cash_roi
                response_obj.deal_score = analysis.deal_score
            properties.append(response_obj)
        
        # Cache results
        set_cached(cache_key, [prop.model_dump() for prop in properties])
    
    # Add favorite status if user is authenticated
    if current_user:
        favorite_property_ids = {
            f.property_id for f in 
            db.query(Favorite).filter(Favorite.user_id == current_user.id).all()
        }
        
        for prop in properties:
            prop.is_favorited = prop.id in favorite_property_ids
    
    return properties


@router.get("/{property_id}", response_model=PropertyResponse)
async def get_property(
    property_id: int,
    current_user: Optional[User] = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific property.
    """
    property_obj = db.query(Property).filter(Property.id == property_id).first()
    
    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )
    
    property_response = PropertyResponse.model_validate(property_obj)

    # Attach summary investment metrics using default assumptions
    analysis = analyze_investment(property_obj)
    if analysis:
        property_response.cap_rate = analysis.cap_rate
        property_response.gross_yield = analysis.gross_yield
        property_response.net_yield = analysis.net_yield
        property_response.cash_on_cash_roi = analysis.cash_on_cash_roi
        property_response.deal_score = analysis.deal_score
    
    # Check if favorited
    if current_user:
        is_favorited = db.query(Favorite).filter(
            and_(Favorite.user_id == current_user.id, Favorite.property_id == property_id)
        ).first() is not None
        property_response.is_favorited = is_favorited
    
    return property_response


@router.get("/{property_id}/analysis", response_model=InvestmentAnalysisResponse)
async def get_property_investment_analysis(
    property_id: int,
    # Optional override assumptions via query params
    down_payment_pct: Optional[float] = Query(
        None, ge=0.0, le=1.0, description="Down payment as fraction of price (e.g. 0.2)"
    ),
    interest_rate_annual: Optional[float] = Query(
        None, ge=0.0, le=1.0, description="Annual interest rate (e.g. 0.06)"
    ),
    loan_term_years: Optional[int] = Query(
        None, ge=1, le=40, description="Loan term in years"
    ),
    closing_costs_pct: Optional[float] = Query(
        None, ge=0.0, le=0.1, description="Closing costs as fraction of price"
    ),
    vacancy_rate: Optional[float] = Query(
        None, ge=0.0, le=0.5, description="Expected vacancy fraction"
    ),
    appreciation_rate_annual: Optional[float] = Query(
        None, ge=-0.2, le=0.2, description="Expected annual appreciation rate"
    ),
    analysis_horizon_years: Optional[int] = Query(
        None, ge=1, le=40, description="Horizon (years) for ROI/IRR"
    ),
    db: Session = Depends(get_db),
):
    """
    Return a detailed investment analysis for a single property, including
    cash flow breakdown, cap rate, yields, cash-on-cash ROI, IRR and a
    high-level "deal score".
    """
    property_obj = db.query(Property).filter(Property.id == property_id).first()

    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found",
        )

    assumptions = InvestmentAssumptions()
    if down_payment_pct is not None:
        assumptions.down_payment_pct = InvestmentAssumptions.down_payment_pct.__class__(str(down_payment_pct))
    if interest_rate_annual is not None:
        assumptions.interest_rate_annual = InvestmentAssumptions.interest_rate_annual.__class__(str(interest_rate_annual))
    if loan_term_years is not None:
        assumptions.loan_term_years = loan_term_years
    if closing_costs_pct is not None:
        assumptions.closing_costs_pct = InvestmentAssumptions.closing_costs_pct.__class__(str(closing_costs_pct))
    if vacancy_rate is not None:
        assumptions.vacancy_rate = InvestmentAssumptions.vacancy_rate.__class__(str(vacancy_rate))
    if appreciation_rate_annual is not None:
        assumptions.appreciation_rate_annual = InvestmentAssumptions.appreciation_rate_annual.__class__(str(appreciation_rate_annual))
    if analysis_horizon_years is not None:
        assumptions.analysis_horizon_years = analysis_horizon_years

    analysis = analyze_investment(property_obj, assumptions=assumptions)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot compute investment analysis for this property (missing data)",
        )

    assumptions_schema = InvestmentAssumptionsSchema(
        down_payment_pct=analysis.assumptions.down_payment_pct,
        interest_rate_annual=analysis.assumptions.interest_rate_annual,
        loan_term_years=analysis.assumptions.loan_term_years,
        closing_costs_pct=analysis.assumptions.closing_costs_pct,
        property_tax_pct=analysis.assumptions.property_tax_pct,
        insurance_pct=analysis.assumptions.insurance_pct,
        maintenance_pct_rent=analysis.assumptions.maintenance_pct_rent,
        management_pct_rent=analysis.assumptions.management_pct_rent,
        hoa_annual=analysis.assumptions.hoa_annual,
        utilities_annual=analysis.assumptions.utilities_annual,
        vacancy_rate=analysis.assumptions.vacancy_rate,
        appreciation_rate_annual=analysis.assumptions.appreciation_rate_annual,
        analysis_horizon_years=analysis.assumptions.analysis_horizon_years,
    )

    cash_flow_schema = CashFlowBreakdownSchema(
        gross_rent_annual=analysis.cash_flow.gross_rent_annual,
        vacancy_loss_annual=analysis.cash_flow.vacancy_loss_annual,
        effective_gross_income_annual=analysis.cash_flow.effective_gross_income_annual,
        operating_expenses_annual=analysis.cash_flow.operating_expenses_annual,
        noi_annual=analysis.cash_flow.noi_annual,
        debt_service_annual=analysis.cash_flow.debt_service_annual,
        cash_flow_annual=analysis.cash_flow.cash_flow_annual,
    )

    metrics_schema = InvestmentMetricsSchema(
        cap_rate=analysis.cap_rate,
        gross_yield=analysis.gross_yield,
        net_yield=analysis.net_yield,
        cash_on_cash_roi=analysis.cash_on_cash_roi,
        break_even_years=analysis.break_even_years,
        total_roi_horizon=analysis.total_roi_horizon,
        irr=analysis.irr,
        deal_score=analysis.deal_score,
        assumptions=assumptions_schema,
        cash_flow=cash_flow_schema,
    )

    return InvestmentAnalysisResponse(
        property_id=property_id,
        generated_at=datetime.utcnow(),
        metrics=metrics_schema,
    )
