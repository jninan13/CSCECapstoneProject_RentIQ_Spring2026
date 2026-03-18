"""Property profitability scoring functions used by data loaders and tests."""

from datetime import datetime
from decimal import Decimal
from typing import Optional


# Central place to tune scoring behavior without editing algorithm flow.
SCORE_CONFIG = {
    "property_type_weights": {
        "single_family": 15,
        "house": 15,
        "multi_family": 14,
        "townhouse": 12,
        "condo": 10,
        "apartment": 10,
        "land": 4,
        "default": 9,
    },
    "yield": {
        "missing_points": 20,
        "tiers": [
            (0.10, 55),
            (0.08, (45, 10, 0.08, 0.02)),
            (0.06, (30, 15, 0.06, 0.02)),
            (0.04, (15, 15, 0.04, 0.02)),
        ],
        "low_yield_base": 15,
        "low_yield_floor": 0.04,
    },
    "price_per_sqft": {
        "tier1_max": 200,
        "tier2_max": 350,
        "tier3_max": 550,
        "tier1_points": 20,
        "tier2_start_points": 20,
        "tier2_drop_points": 8,
        "tier3_start_points": 12,
        "tier3_drop_points": 12,
    },
    "age_points": {
        "unknown": 3,
        "new": 15,
        "mid": 10,
        "older": 2,
        "old_penalty": -6,
        "very_old_penalty": -12,
    },
    "bathroom_points": {
        "2plus": 5,
        "1_5plus": 3,
        "1plus": 1,
    },
    "lot_points": {
        "large": 4,
        "medium": 2,
        "small": 0.5,
        "large_threshold": 8000,
        "medium_threshold": 4000,
    },
    "market_points": {
        "dom": {
            "le7": 6,
            "le21": 3,
            "le45": 0,
            "le90": -4,
            "gt90": -7,
        },
        "is_hot_true": 5,
        "is_hot_false": -2,
        "is_new_listing": 1,
        "virtual_tour": 1,
        "status_active": 1,
        "status_pending": -1,
    },
    "macro_points": {
        "unemployment": {
            "le3": 2,
            "le5": 0,
            "le7": -3,
            "gt7": -7,
        },
        "fed_rate": {
            "le2": 1,
            "le4": 0,
            "le6": -2,
            "gt6": -4,
        },
        "volatility": {
            "le15": 1,
            "le25": 0,
            "le35": -2,
            "gt35": -4,
        },
        "cpi": {
            "gt8": -3,
            "gt5": -1,
        },
        "nr_weeks_gt8": -2,
    },
    "crime": {
        "violent_scale": 1000.0,
        "property_scale": 3000.0,
        "violent_weight": 0.6,
        "property_weight": 0.4,
        "max_penalty": 20.0,
    },
}


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _property_type_points(property_type: str) -> float:
    normalized = (property_type or "").lower().replace(" ", "_")
    weights = SCORE_CONFIG["property_type_weights"]
    return weights.get(normalized, weights["default"])


def _derive_crime_risk(
    crime_rate: Optional[float],
    violent_crime: Optional[float],
    property_crime: Optional[float],
) -> Optional[float]:
    """Build a 0-100 crime risk score from available CSV metrics."""
    if violent_crime is not None or property_crime is not None:
        violent_component = 0.0
        property_component = 0.0

        if violent_crime is not None:
            violent_component = _clamp(
                (float(violent_crime) / SCORE_CONFIG["crime"]["violent_scale"]) * 100.0
            )
        if property_crime is not None:
            property_component = _clamp(
                (float(property_crime) / SCORE_CONFIG["crime"]["property_scale"]) * 100.0
            )

        # Weight violent crime more heavily for risk.
        return _clamp(
            (SCORE_CONFIG["crime"]["violent_weight"] * violent_component)
            + (SCORE_CONFIG["crime"]["property_weight"] * property_component)
        )

    if crime_rate is None:
        return None

    # Generic fallback for pre-normalized (0-100) or ratio-based values.
    rate = float(crime_rate)
    if rate <= 1.0:
        return _clamp(rate * 100.0)
    return _clamp(rate)


def calculate_profitability_score(
    price: Decimal,
    size_sqft: int,
    estimated_rent: Optional[Decimal],
    year_built: Optional[int],
    property_type: str,
    crime_rate: Optional[float] = None,
    violent_crime: Optional[float] = None,
    property_crime: Optional[float] = None,
    days_on_market: Optional[float] = None,
    is_hot: Optional[bool] = None,
    is_new_listing: Optional[bool] = None,
    search_status: Optional[str] = None,
    lagged_cpi: Optional[float] = None,
    fed_rate: Optional[float] = None,
    lagged_unemployment: Optional[float] = None,
    volatility_value: Optional[float] = None,
    nr_weeks: Optional[float] = None,
    bathrooms: Optional[float] = None,
    lot_area: Optional[float] = None,
    is_virtual_tour: Optional[bool] = None,
) -> float:
    """Calculate a 0-100 profitability score using only persisted property fields.

    Inputs come from DB fields plus optional CSV market features when available.
    """
    if not price or price <= 0 or not size_sqft or size_sqft <= 0:
        return 0.0

    score = 0.0

    # 1) Gross yield from stored price and rent (55 points)
    # Annual rent / price. A yield around 8%+ is strong for cash flow.
    if estimated_rent and estimated_rent > 0:
        yield_cfg = SCORE_CONFIG["yield"]
        gross_yield = (float(estimated_rent) * 12.0) / float(price)
        if gross_yield >= yield_cfg["tiers"][0][0]:
            score += yield_cfg["tiers"][0][1]
        elif gross_yield >= yield_cfg["tiers"][1][0]:
            base, span_points, start, width = yield_cfg["tiers"][1][1]
            score += base + ((gross_yield - start) / width) * span_points
        elif gross_yield >= yield_cfg["tiers"][2][0]:
            base, span_points, start, width = yield_cfg["tiers"][2][1]
            score += base + ((gross_yield - start) / width) * span_points
        elif gross_yield >= yield_cfg["tiers"][3][0]:
            base, span_points, start, width = yield_cfg["tiers"][3][1]
            score += base + ((gross_yield - start) / width) * span_points
        else:
            score += max(0.0, gross_yield / yield_cfg["low_yield_floor"]) * yield_cfg["low_yield_base"]
    else:
        # Missing rent estimate gets neutral partial credit.
        score += SCORE_CONFIG["yield"]["missing_points"]

    # 2) Price per area from stored price and size (20 points)
    # Keep ranges broad because CSV "livingArea" can vary by source units.
    ppsf_cfg = SCORE_CONFIG["price_per_sqft"]
    price_per_sqft = float(price) / float(size_sqft)
    if price_per_sqft <= ppsf_cfg["tier1_max"]:
        score += ppsf_cfg["tier1_points"]
    elif price_per_sqft <= ppsf_cfg["tier2_max"]:
        score += ppsf_cfg["tier2_start_points"] - (
            ((price_per_sqft - ppsf_cfg["tier1_max"]) / (ppsf_cfg["tier2_max"] - ppsf_cfg["tier1_max"]))
            * ppsf_cfg["tier2_drop_points"]
        )
    elif price_per_sqft <= ppsf_cfg["tier3_max"]:
        score += ppsf_cfg["tier3_start_points"] - (
            ((price_per_sqft - ppsf_cfg["tier2_max"]) / (ppsf_cfg["tier3_max"] - ppsf_cfg["tier2_max"]))
            * ppsf_cfg["tier3_drop_points"]
        )

    # 3) Property age from stored year_built (can add or subtract)
    age_cfg = SCORE_CONFIG["age_points"]
    if year_built and 1800 <= year_built <= datetime.now().year:
        age = datetime.now().year - year_built
        if age <= 10:
            score += age_cfg["new"]
        elif age <= 30:
            score += age_cfg["mid"]
        elif age <= 60:
            score += age_cfg["older"]
        elif age <= 90:
            score += age_cfg["old_penalty"]
        else:
            score += age_cfg["very_old_penalty"]
    else:
        score += age_cfg["unknown"]

    # 4) Property type preference from stored property_type (15 points)
    score += _property_type_points(property_type)

    # 5) Bathroom utility (up to +5)
    bath_cfg = SCORE_CONFIG["bathroom_points"]
    if bathrooms is not None:
        if bathrooms >= 2.0:
            score += bath_cfg["2plus"]
        elif bathrooms >= 1.5:
            score += bath_cfg["1_5plus"]
        elif bathrooms >= 1.0:
            score += bath_cfg["1plus"]

    # 6) Lot size utility (up to +4)
    lot_cfg = SCORE_CONFIG["lot_points"]
    if lot_area is not None and lot_area > 0:
        if lot_area >= lot_cfg["large_threshold"]:
            score += lot_cfg["large"]
        elif lot_area >= lot_cfg["medium_threshold"]:
            score += lot_cfg["medium"]
        else:
            score += lot_cfg["small"]

    # 7) Market liquidity and demand from listing behavior (+/- 16)
    market_cfg = SCORE_CONFIG["market_points"]
    if days_on_market is not None:
        dom = float(days_on_market)
        if dom <= 7:
            score += market_cfg["dom"]["le7"]
        elif dom <= 21:
            score += market_cfg["dom"]["le21"]
        elif dom <= 45:
            score += market_cfg["dom"]["le45"]
        elif dom <= 90:
            score += market_cfg["dom"]["le90"]
        else:
            score += market_cfg["dom"]["gt90"]

    if is_hot is True:
        score += market_cfg["is_hot_true"]
    elif is_hot is False:
        score += market_cfg["is_hot_false"]

    if is_new_listing is True:
        score += market_cfg["is_new_listing"]

    if is_virtual_tour is True:
        score += market_cfg["virtual_tour"]

    if search_status:
        status_norm = search_status.strip().upper()
        if status_norm == "ACTIVE":
            score += market_cfg["status_active"]
        elif status_norm in {"PENDING", "CONTINGENT"}:
            score += market_cfg["status_pending"]

    # 8) Macro and city-level risk controls (-30 to +2)
    macro_cfg = SCORE_CONFIG["macro_points"]
    if lagged_unemployment is not None:
        u = float(lagged_unemployment)
        if u <= 3:
            score += macro_cfg["unemployment"]["le3"]
        elif u <= 5:
            score += macro_cfg["unemployment"]["le5"]
        elif u <= 7:
            score += macro_cfg["unemployment"]["le7"]
        else:
            score += macro_cfg["unemployment"]["gt7"]

    if fed_rate is not None:
        f = float(fed_rate)
        if f <= 2:
            score += macro_cfg["fed_rate"]["le2"]
        elif f <= 4:
            score += macro_cfg["fed_rate"]["le4"]
        elif f <= 6:
            score += macro_cfg["fed_rate"]["le6"]
        else:
            score += macro_cfg["fed_rate"]["gt6"]

    if volatility_value is not None:
        v = float(volatility_value)
        if v <= 15:
            score += macro_cfg["volatility"]["le15"]
        elif v <= 25:
            score += macro_cfg["volatility"]["le25"]
        elif v <= 35:
            score += macro_cfg["volatility"]["le35"]
        else:
            score += macro_cfg["volatility"]["gt35"]

    if lagged_cpi is not None:
        cpi = float(lagged_cpi)
        if cpi > 8:
            score += macro_cfg["cpi"]["gt8"]
        elif cpi > 5:
            score += macro_cfg["cpi"]["gt5"]

    if nr_weeks is not None and float(nr_weeks) > 8:
        score += macro_cfg["nr_weeks_gt8"]

    # 9) Crime risk penalty (subtract up to 20 points)
    crime_risk = _derive_crime_risk(crime_rate, violent_crime, property_crime)
    if crime_risk is not None:
        score -= (crime_risk / 100.0) * SCORE_CONFIG["crime"]["max_penalty"]

    return round(_clamp(score), 2)


def estimate_monthly_rent(price: Decimal, size_sqft: int, bedrooms: int) -> Decimal:
    """Estimate monthly rent using only persisted property fields.

    Uses a baseline rent-to-price ratio with size and bedroom adjustments.
    """
    if not price or price <= 0:
        return Decimal("0.00")

    # Baseline around 0.90% monthly rent-to-price ratio.
    base_rent = float(price) * 0.009

    if size_sqft > 2200:
        base_rent *= 1.08
    elif size_sqft < 900:
        base_rent *= 0.94

    if bedrooms >= 4:
        base_rent *= 1.07
    elif bedrooms <= 1:
        base_rent *= 0.93

    return Decimal(f"{base_rent:.2f}")


