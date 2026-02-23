"""
Investment analysis utilities.

Given a Property and a set of assumptions about expenses and financing,
calculates key investment metrics such as:
- cap rate
- cash flow
- rental yields
- ROI over a horizon
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, getcontext
from typing import List, Optional

from ..models import Property


getcontext().prec = 28


@dataclass
class InvestmentAssumptions:
    """Input assumptions for investment calculations."""

    down_payment_pct: Decimal = Decimal("0.20")
    interest_rate_annual: Decimal = Decimal("0.06")
    loan_term_years: int = 30
    closing_costs_pct: Decimal = Decimal("0.03")

    property_tax_pct: Decimal = Decimal("0.012")  # of property value per year
    insurance_pct: Decimal = Decimal("0.005")  # of property value per year
    maintenance_pct_rent: Decimal = Decimal("0.10")  # of annual rent
    management_pct_rent: Decimal = Decimal("0.08")  # of annual rent
    hoa_annual: Decimal = Decimal("0")  # flat for now
    utilities_annual: Decimal = Decimal("0")  # landlord-paid utilities

    vacancy_rate: Decimal = Decimal("0.05")
    appreciation_rate_annual: Decimal = Decimal("0.03")
    analysis_horizon_years: int = 10


@dataclass
class CashFlowBreakdown:
    gross_rent_annual: Decimal
    vacancy_loss_annual: Decimal
    effective_gross_income_annual: Decimal
    operating_expenses_annual: Decimal
    noi_annual: Decimal
    debt_service_annual: Decimal
    cash_flow_annual: Decimal


@dataclass
class InvestmentMetrics:
    cap_rate: Optional[float]
    gross_yield: Optional[float]
    net_yield: Optional[float]
    cash_on_cash_roi: Optional[float]
    break_even_years: Optional[float]
    total_roi_horizon: Optional[float]
    irr: Optional[float]
    deal_score: Optional[float]
    assumptions: InvestmentAssumptions
    cash_flow: CashFlowBreakdown


def _decimal_or_none(value: Optional[Decimal]) -> Optional[Decimal]:
    return value if value is not None else None


def _compute_debt_service(
    price: Decimal,
    assumptions: InvestmentAssumptions,
) -> tuple[Decimal, Decimal, Decimal]:
    """
    Returns (loan_amount, monthly_payment, annual_debt_service).
    """
    down_payment = price * assumptions.down_payment_pct
    loan_amount = price - down_payment

    if loan_amount <= 0:
        return Decimal("0"), Decimal("0"), Decimal("0")

    monthly_rate = assumptions.interest_rate_annual / Decimal("12")
    n_payments = assumptions.loan_term_years * 12

    if monthly_rate == 0:
        monthly_payment = loan_amount / Decimal(n_payments)
    else:
        r = monthly_rate
        n = Decimal(n_payments)
        # Payment formula: P = r*L / (1 - (1+r)^-n)
        numerator = r * loan_amount
        denominator = Decimal("1") - (Decimal("1") + r) ** (-n)
        monthly_payment = numerator / denominator

    annual_debt_service = monthly_payment * Decimal("12")
    return loan_amount, monthly_payment, annual_debt_service


def _compute_operating_expenses(
    price: Decimal,
    gross_rent_annual: Decimal,
    assumptions: InvestmentAssumptions,
) -> Decimal:
    property_tax = price * assumptions.property_tax_pct
    insurance = price * assumptions.insurance_pct
    maintenance = gross_rent_annual * assumptions.maintenance_pct_rent
    management = gross_rent_annual * assumptions.management_pct_rent

    total = (
        property_tax
        + insurance
        + maintenance
        + management
        + assumptions.hoa_annual
        + assumptions.utilities_annual
    )
    return total


def _compute_cash_flow(
    property_obj: Property,
    assumptions: InvestmentAssumptions,
) -> Optional[CashFlowBreakdown]:
    if property_obj.estimated_rent is None:
        return None

    price = Decimal(property_obj.price)
    monthly_rent = Decimal(property_obj.estimated_rent)

    gross_rent_annual = monthly_rent * Decimal("12")
    vacancy_loss = gross_rent_annual * assumptions.vacancy_rate
    effective_gross_income = gross_rent_annual - vacancy_loss

    operating_expenses = _compute_operating_expenses(
        price=price,
        gross_rent_annual=gross_rent_annual,
        assumptions=assumptions,
    )

    noi = effective_gross_income - operating_expenses

    _, _, annual_debt_service = _compute_debt_service(price, assumptions)
    cash_flow_annual = noi - annual_debt_service

    return CashFlowBreakdown(
        gross_rent_annual=gross_rent_annual,
        vacancy_loss_annual=vacancy_loss,
        effective_gross_income_annual=effective_gross_income,
        operating_expenses_annual=operating_expenses,
        noi_annual=noi,
        debt_service_annual=annual_debt_service,
        cash_flow_annual=cash_flow_annual,
    )


def _compute_simple_irr(cash_flows: List[Decimal]) -> Optional[float]:
    """
    Compute IRR via bisection method.
    Returns None if cash_flows are invalid or IRR cannot be found.
    """
    if not cash_flows:
        return None

    # Require at least one negative and one positive cash flow
    has_neg = any(cf < 0 for cf in cash_flows)
    has_pos = any(cf > 0 for cf in cash_flows)
    if not (has_neg and has_pos):
        return None

    def npv(rate: Decimal) -> Decimal:
        total = Decimal("0")
        for t, cf in enumerate(cash_flows):
            total += cf / (Decimal("1") + rate) ** Decimal(t)
        return total

    # Search between -0.99 and 1.0 (i.e. -99% to 100%)
    low = Decimal("-0.99")
    high = Decimal("1.0")
    npv_low = npv(low)
    npv_high = npv(high)

    # If npv signs are not opposite, IRR is outside this range
    if npv_low * npv_high > 0:
        return None

    for _ in range(100):
        mid = (low + high) / Decimal("2")
        npv_mid = npv(mid)
        if abs(npv_mid) < Decimal("1e-6"):
            return float(mid)
        if npv_low * npv_mid < 0:
            high = mid
            npv_high = npv_mid
        else:
            low = mid
            npv_low = npv_mid

    return float((low + high) / Decimal("2"))


def analyze_investment(
    property_obj: Property,
    assumptions: Optional[InvestmentAssumptions] = None,
) -> Optional[InvestmentMetrics]:
    """
    High-level investment analysis for a property using the provided assumptions.
    """
    if assumptions is None:
        assumptions = InvestmentAssumptions()

    if property_obj.price is None:
        return None

    price = Decimal(property_obj.price)

    cash_flow = _compute_cash_flow(property_obj, assumptions)
    if cash_flow is None:
        return None

    # Basic metrics
    noi = cash_flow.noi_annual
    gross_rent_annual = cash_flow.gross_rent_annual

    cap_rate = float(noi / price) if price > 0 else None
    gross_yield = float(gross_rent_annual / price) if price > 0 else None
    net_yield = float(noi / price) if price > 0 else None

    # Cash invested
    down_payment = price * assumptions.down_payment_pct
    closing_costs = price * assumptions.closing_costs_pct
    cash_invested = down_payment + closing_costs

    cash_on_cash = (
        float(cash_flow.cash_flow_annual / cash_invested)
        if cash_invested > 0
        else None
    )

    break_even_years = (
        float(cash_invested / cash_flow.cash_flow_annual)
        if cash_flow.cash_flow_annual > 0
        else None
    )

    # Horizon ROI and IRR
    horizon = assumptions.analysis_horizon_years
    appreciation_rate = assumptions.appreciation_rate_annual
    future_value = price * (Decimal("1") + appreciation_rate) ** Decimal(horizon)

    # Very simplified: ignore amortization and treat loan balance as constant
    # so equity gain is just price appreciation on full value.
    equity_gain = future_value - price
    cumulative_cash_flow = cash_flow.cash_flow_annual * Decimal(horizon)
    total_profit = equity_gain + cumulative_cash_flow

    total_roi_horizon = (
        float(total_profit / cash_invested) if cash_invested > 0 else None
    )

    # Cash flow series for IRR
    cash_flows: List[Decimal] = [-(cash_invested)]
    for _ in range(horizon - 1):
        cash_flows.append(cash_flow.cash_flow_annual)
    # final year includes sale proceeds (equity gain + one more year CF)
    cash_flows.append(cash_flow.cash_flow_annual + equity_gain)

    irr = _compute_simple_irr(cash_flows)

    # Deal score: combine profitability and risk proxy (here just profitability)
    # Base on cap rate and cash-on-cash, normalized to 0-100
    profit_score = 0.0
    if cap_rate is not None:
        # 4% -> 40, 8%+ -> 100
        if cap_rate <= 0.04:
            profit_score += 40 * (cap_rate / 0.04)
        elif cap_rate >= 0.08:
            profit_score += 100
        else:
            profit_score += 40 + (cap_rate - 0.04) / (0.08 - 0.04) * 60

    if cash_on_cash is not None:
        # 5% -> +20, 15%+ -> +40
        if cash_on_cash <= 0.05:
            profit_score += 20 * (cash_on_cash / 0.05)
        elif cash_on_cash >= 0.15:
            profit_score += 40
        else:
            profit_score += 20 + (cash_on_cash - 0.05) / (0.15 - 0.05) * 20

    # Scale/clip 0-100
    deal_score = max(0.0, min(100.0, profit_score))

    return InvestmentMetrics(
        cap_rate=cap_rate,
        gross_yield=gross_yield,
        net_yield=net_yield,
        cash_on_cash_roi=cash_on_cash,
        break_even_years=break_even_years,
        total_roi_horizon=total_roi_horizon,
        irr=irr,
        deal_score=deal_score,
        assumptions=assumptions,
        cash_flow=cash_flow,
    )

