"""
Pydantic schemas for detailed investment analysis.
"""
from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field


class InvestmentAssumptionsSchema(BaseModel):
    """Serialized view of the assumptions used for analysis."""

    down_payment_pct: Decimal = Field(Decimal("0.20"), description="Down payment as a fraction of purchase price")
    interest_rate_annual: Decimal = Field(Decimal("0.06"), description="Annual interest rate on the loan")
    loan_term_years: int = Field(30, description="Loan term in years")
    closing_costs_pct: Decimal = Field(Decimal("0.03"), description="Closing costs as a fraction of purchase price")

    property_tax_pct: Decimal = Field(Decimal("0.012"), description="Annual property tax as a fraction of value")
    insurance_pct: Decimal = Field(Decimal("0.005"), description="Annual insurance as a fraction of value")
    maintenance_pct_rent: Decimal = Field(Decimal("0.10"), description="Maintenance as a fraction of annual rent")
    management_pct_rent: Decimal = Field(Decimal("0.08"), description="Property management as a fraction of annual rent")
    hoa_annual: Decimal = Field(Decimal("0"), description="Annual HOA fees (flat)")
    utilities_annual: Decimal = Field(Decimal("0"), description="Annual utilities paid by landlord")

    vacancy_rate: Decimal = Field(Decimal("0.05"), description="Fraction of time unit is vacant")
    appreciation_rate_annual: Decimal = Field(Decimal("0.03"), description="Expected annual appreciation rate")
    analysis_horizon_years: int = Field(10, description="Horizon in years for ROI and IRR calculations")


class CashFlowBreakdownSchema(BaseModel):
    """Annual cash flow breakdown for a property under given assumptions."""

    gross_rent_annual: Decimal
    vacancy_loss_annual: Decimal
    effective_gross_income_annual: Decimal
    operating_expenses_annual: Decimal
    noi_annual: Decimal
    debt_service_annual: Decimal
    cash_flow_annual: Decimal


class InvestmentMetricsSchema(BaseModel):
    """Key investment metrics for a property."""

    cap_rate: float | None
    gross_yield: float | None
    net_yield: float | None
    cash_on_cash_roi: float | None
    break_even_years: float | None
    total_roi_horizon: float | None
    irr: float | None
    deal_score: float | None

    assumptions: InvestmentAssumptionsSchema
    cash_flow: CashFlowBreakdownSchema


class InvestmentAnalysisResponse(BaseModel):
    """Full investment analysis payload for a single property."""

    property_id: int
    generated_at: datetime
    metrics: InvestmentMetricsSchema

