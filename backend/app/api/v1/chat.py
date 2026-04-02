"""
Chatbot endpoint powered by Google Gemini with database context.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
import logging

import google.generativeai as genai

from ...config import settings
from ...database import get_db
from ...schemas.chat import ChatRequest, ChatResponse
from ...models import Property, Favorite, User
from ..deps import get_current_user_optional
from ...core.investment import analyze_investment

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

SYSTEM_PROMPT = """You are RentIQ Assistant, a knowledgeable real estate investment advisor built into the RentIQ platform.

RentIQ helps users discover and analyze investment properties. The platform provides:
- Property listings with pricing, size, location, and type details.
- A proprietary Profitability Score (0-100) for every property, based on:
  - Gross rental yield (up to 55 points): annual rent / price. 8%+ yield is considered strong.
  - Price per square foot (up to 20 points): lower price/sqft scores higher.
  - Property age (up to 15 points): newer properties score higher; very old ones lose points.
  - Property type preference (up to 15 points): single-family homes score highest, followed by multi-family and townhouses.
  - Market conditions, crime risk, and macroeconomic factors can add or subtract additional points.
- A Deal Score (0-100) combining cap rate contribution (up to 100 pts) and cash-on-cash ROI contribution (up to 40 pts).
- Full investment analysis: cap rate, gross/net yield, cash-on-cash ROI, break-even years, IRR, and annual cash flow breakdowns.
- Users can favorite properties and compare them side-by-side.

Your role:
- Answer real estate investment questions clearly and helpfully.
- When database context is provided below, use it to give specific, data-backed answers.
- If asked about a specific property, refer to the provided property details.
- If the user has favorites, you can reference them when relevant.
- Be conversational but professional. Use specific numbers when available.
- If you don't have enough information to answer accurately, say so rather than guessing.
- Keep responses concise (1-3 paragraphs max) unless the user asks for more detail.
- Do not use markdown formatting in your responses. Use plain text only."""


def _build_property_context(prop: Property) -> str:
    """Build a context string for a single property."""
    analysis = analyze_investment(prop)
    lines = [
        f"Address: {prop.address}, {prop.city}, {prop.state} {prop.zip_code or ''}",
        f"Price: ${float(prop.price):,.0f}",
        f"Size: {prop.size_sqft:,} sqft",
        f"Bedrooms: {prop.bedrooms} | Bathrooms: {prop.bathrooms}",
        f"Type: {prop.property_type}",
        f"Year Built: {prop.year_built or 'Unknown'}",
        f"Estimated Monthly Rent: ${float(prop.estimated_rent):,.0f}" if prop.estimated_rent else "Estimated Monthly Rent: N/A",
        f"Profitability Score: {prop.profitability_score:.1f}/100",
    ]
    if analysis:
        lines.extend([
            f"Cap Rate: {analysis.cap_rate * 100:.2f}%" if analysis.cap_rate else "Cap Rate: N/A",
            f"Gross Yield: {analysis.gross_yield * 100:.2f}%" if analysis.gross_yield else "Gross Yield: N/A",
            f"Net Yield: {analysis.net_yield * 100:.2f}%" if analysis.net_yield else "Net Yield: N/A",
            f"Cash-on-Cash ROI: {analysis.cash_on_cash_roi * 100:.2f}%" if analysis.cash_on_cash_roi else "Cash-on-Cash ROI: N/A",
            f"Deal Score: {analysis.deal_score:.0f}/100" if analysis.deal_score else "Deal Score: N/A",
            f"Annual Cash Flow: ${float(analysis.cash_flow.cash_flow_annual):,.0f}",
            f"Break-Even: {analysis.break_even_years:.1f} years" if analysis.break_even_years else "Break-Even: N/A (negative cash flow)",
        ])
    return "\n".join(lines)


def _gather_context(
    db: Session,
    property_id: Optional[int],
    user: Optional[User],
) -> str:
    """Gather relevant database context to inject into the prompt."""
    sections = []

    # Aggregate stats
    stats = db.query(
        func.count(Property.id),
        func.min(Property.price),
        func.max(Property.price),
        func.avg(Property.profitability_score),
    ).first()

    if stats and stats[0] > 0:
        cities = db.query(func.count(func.distinct(Property.city))).scalar()
        states = db.query(func.count(func.distinct(Property.state))).scalar()
        sections.append(
            f"=== PLATFORM DATA SUMMARY ===\n"
            f"Total properties in database: {stats[0]}\n"
            f"Price range: ${float(stats[1]):,.0f} - ${float(stats[2]):,.0f}\n"
            f"Average profitability score: {float(stats[3]):.1f}/100\n"
            f"Covering {cities} cities across {states} states"
        )

    # Specific property context
    if property_id:
        prop = db.query(Property).filter(Property.id == property_id).first()
        if prop:
            sections.append(
                f"=== PROPERTY THE USER IS CURRENTLY VIEWING (ID: {property_id}) ===\n"
                + _build_property_context(prop)
            )

    # User favorites
    if user:
        favorites = (
            db.query(Favorite)
            .filter(Favorite.user_id == user.id)
            .limit(10)
            .all()
        )
        if favorites:
            fav_lines = []
            for fav in favorites:
                prop = db.query(Property).filter(Property.id == fav.property_id).first()
                if prop:
                    fav_lines.append(
                        f"- {prop.address}, {prop.city}, {prop.state} | "
                        f"${float(prop.price):,.0f} | "
                        f"Score: {prop.profitability_score:.1f}/100"
                    )
            if fav_lines:
                sections.append(
                    f"=== USER'S FAVORITED PROPERTIES ===\n"
                    + "\n".join(fav_lines)
                )

    return "\n\n".join(sections)


@router.post("", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    """Send a message to the RentIQ chatbot and receive an AI-generated response."""
    if not settings.GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Chat service is not configured (missing GEMINI_API_KEY)",
        )

    context = _gather_context(db, request.property_id, current_user)

    full_system = SYSTEM_PROMPT
    if context:
        full_system += f"\n\n{context}"

    # Build conversation for Gemini
    conversation = [{"role": "user", "parts": [full_system + "\n\nPlease acknowledge you understand your role."]}]
    conversation.append({"role": "model", "parts": ["Understood. I'm RentIQ Assistant, ready to help with real estate investment questions using the platform data available to me."]})

    for msg in request.history[-10:]:
        role = "user" if msg.role == "user" else "model"
        conversation.append({"role": role, "parts": [msg.content]})

    conversation.append({"role": "user", "parts": [request.message]})

    try:
        genai.configure(api_key=settings.GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")
        response = model.generate_content(conversation)
        reply = response.text
    except Exception as exc:
        logger.error("Gemini chat API call failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to generate a response. Please try again later.",
        )

    return ChatResponse(reply=reply)
