"""
Property search and listing endpoints.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from typing import List, Optional
from datetime import datetime
import math
import logging

# Image API
from fastapi import Response
import httpx
import google.generativeai as genai
from ...config import settings

logger = logging.getLogger(__name__)

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
from ..deps import get_current_user_optional
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
    limit: int = Query(21, ge=1, le=100),
    sort_by: str = Query("profitability_score", pattern="^(profitability_score|price|size_sqft)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    """
    Search for properties with various filters.
    
    Supports filtering by location, price range, size, bedrooms, bathrooms,
    property type, radius from zip code, and minimum profitability score.
    """
    query = db.query(Property)

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

    # Apply sorting before pagination so ordering is correct across full result set.
    sort_column_map = {
        "profitability_score": Property.profitability_score,
        "price": Property.price,
        "size_sqft": Property.size_sqft,
    }
    sort_column = sort_column_map.get(sort_by, Property.profitability_score)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    properties_db = query.offset(skip).limit(limit).all()

    if radius_miles and zip_code and properties_db:
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

    properties = []
    for prop in properties_db:
        response_obj = PropertyResponse.model_validate(prop)
        analysis = analyze_investment(prop)
        if analysis:
            response_obj.cap_rate = analysis.cap_rate
            response_obj.gross_yield = analysis.gross_yield
            response_obj.net_yield = analysis.net_yield
            response_obj.cash_on_cash_roi = analysis.cash_on_cash_roi
            response_obj.deal_score = analysis.deal_score
        properties.append(response_obj)
    
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
    current_user: Optional[User] = Depends(get_current_user_optional),
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

@router.get("/{property_id}/streetview.jpg")
async def get_property_streetview(
    property_id: int,
    heading: int = Query(0, ge=0, le=360, description="Camera heading in degrees"),
    pitch: int = Query(0, ge=-90, le=90, description="Camera pitch in degrees"),
    fov: int = Query(80, ge=10, le=120, description="Field of view"),
    width: int = Query(900, ge=100, le=2048, description="Image width"),
    height: int = Query(500, ge=100, le=2048, description="Image height"),
    db: Session = Depends(get_db),
):
    """
    Fetches and return a Google Street View image for a property using its lat/lng.
    The Google API key stays on the backend.
    """
    property_obj = db.query(Property).filter(Property.id == property_id).first()

    if not property_obj:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Property not found"
        )

    if property_obj.lat is None or property_obj.lng is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Property is missing latitude/longitude"
        )

    if not settings.GOOGLE_MAPS_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GOOGLE_MAPS_API_KEY is not configured"
        )

    location = f"{property_obj.lat},{property_obj.lng}"

    metadata_params = {
        "location": location,
        "key": settings.GOOGLE_MAPS_API_KEY,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        metadata_response = await client.get(
            "https://maps.googleapis.com/maps/api/streetview/metadata",
            params=metadata_params,
        )
        metadata_response.raise_for_status()
        metadata = metadata_response.json()

        if metadata.get("status") != "OK":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Street View not available: {metadata.get('status', 'UNKNOWN')}"
            )

        image_params = {
            "size": f"{width}x{height}",
            "location": location,
            "heading": heading,
            "pitch": pitch,
            "fov": fov,
            "key": settings.GOOGLE_MAPS_API_KEY,
        }

        image_response = await client.get(
            "https://maps.googleapis.com/maps/api/streetview",
            params=image_params,
        )
        image_response.raise_for_status()

    return Response(
        content=image_response.content,
        media_type="image/jpeg",
        headers={"Cache-Control": "public, max-age=86400"},
    )

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


def _build_explanation_prompt(property_obj: Property, analysis) -> str:
    """Build a structured prompt for Gemini with all property and financial data."""
    cf = analysis.cash_flow
    a = analysis.assumptions

    return f"""You are a real estate investment analyst for RentIQ, a property investment platform.
Explain the investment potential of this property to a user in clear, plain English.

=== PROPERTY DETAILS ===
Address: {property_obj.address}, {property_obj.city}, {property_obj.state} {property_obj.zip_code or ''}
Price: ${float(property_obj.price):,.0f}
Size: {property_obj.size_sqft:,} m²
Bedrooms: {property_obj.bedrooms}
Bathrooms: {property_obj.bathrooms}
Property Type: {property_obj.property_type}
Year Built: {property_obj.year_built or 'Unknown'}
Estimated Monthly Rent: ${float(property_obj.estimated_rent):,.0f}

=== SCORES ===
Profitability Score: {property_obj.profitability_score:.1f}/100
  (Factors: gross rental yield, price per m², property age, property type preference, and market/macro conditions)
Deal Score: {analysis.deal_score:.0f}/100
  (Based on cap rate contribution up to 100 pts: 4% cap -> 40 pts, 8%+ -> 100 pts; plus cash-on-cash ROI contribution up to 40 pts: 5% -> 20 pts, 15%+ -> 40 pts)

=== KEY FINANCIAL METRICS ===
Cap Rate: {analysis.cap_rate * 100:.2f}%
Gross Yield: {analysis.gross_yield * 100:.2f}%
Net Yield: {analysis.net_yield * 100:.2f}%
Cash-on-Cash ROI: {analysis.cash_on_cash_roi * 100:.2f}%
Break-Even: {f'{analysis.break_even_years:.1f} years' if analysis.break_even_years else 'N/A (negative cash flow)'}
{a.analysis_horizon_years}-Year Total ROI: {analysis.total_roi_horizon * 100:.1f}%
IRR: {f'{analysis.irr * 100:.2f}%' if analysis.irr else 'N/A'}

=== ANNUAL CASH FLOW BREAKDOWN ===
Gross Rent: ${float(cf.gross_rent_annual):,.0f}
Vacancy Loss: -${float(cf.vacancy_loss_annual):,.0f}
Effective Gross Income: ${float(cf.effective_gross_income_annual):,.0f}
Operating Expenses: -${float(cf.operating_expenses_annual):,.0f}
Net Operating Income (NOI): ${float(cf.noi_annual):,.0f}
Debt Service: -${float(cf.debt_service_annual):,.0f}
Annual Cash Flow: ${float(cf.cash_flow_annual):,.0f}

=== ASSUMPTIONS USED ===
Down Payment: {float(a.down_payment_pct) * 100:.1f}%
Interest Rate: {float(a.interest_rate_annual) * 100:.2f}%
Loan Term: {a.loan_term_years} years
Vacancy Rate: {float(a.vacancy_rate) * 100:.1f}%
Appreciation Rate: {float(a.appreciation_rate_annual) * 100:.1f}%/year
Property Tax: {float(a.property_tax_pct) * 100:.1f}% of value/year
Insurance: {float(a.insurance_pct) * 100:.1f}% of value/year
Maintenance: {float(a.maintenance_pct_rent) * 100:.0f}% of rent
Management: {float(a.management_pct_rent) * 100:.0f}% of rent
Analysis Horizon: {a.analysis_horizon_years} years

=== INSTRUCTIONS ===
Write 2-4 concise paragraphs that:
1. Explain what the profitability score of {property_obj.profitability_score:.1f} means and what likely drove it higher or lower.
2. Interpret the deal score and key financial metrics (cap rate, cash-on-cash ROI, cash flow) in everyday terms.
3. Highlight the main strengths and risks of this investment.
4. Give a brief overall assessment of whether this looks like a strong, moderate, or weak investment opportunity.

Use specific numbers from the data. Do not use markdown formatting. Write in a conversational but professional tone."""


@router.get("/{property_id}/explain")
async def get_property_explanation(
    property_id: int,
    down_payment_pct: Optional[float] = Query(
        None, ge=0.0, le=1.0, description="Down payment as fraction of price (e.g. 0.2)"
    ),
    interest_rate_annual: Optional[float] = Query(
        None, ge=0.0, le=1.0, description="Annual interest rate (e.g. 0.06)"
    ),
    vacancy_rate: Optional[float] = Query(
        None, ge=0.0, le=0.5, description="Expected vacancy fraction"
    ),
    db: Session = Depends(get_db),
):
    """
    Generate an AI-powered explanation of the property's profitability score
    and investment metrics using Google Gemini.
    """
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI explanation service is not configured (missing GEMINI_API_KEY)",
        )

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
    if vacancy_rate is not None:
        assumptions.vacancy_rate = InvestmentAssumptions.vacancy_rate.__class__(str(vacancy_rate))

    analysis = analyze_investment(property_obj, assumptions=assumptions)
    if analysis is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot generate explanation for this property (missing data)",
        )

    prompt = _build_explanation_prompt(property_obj, analysis)

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(prompt)
        explanation = response.text
    except Exception as exc:
        logger.error("Gemini API call failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate AI explanation. Please try again later.",
        )

    return {"property_id": property_id, "explanation": explanation}
