"""
Tests for the AI explanation endpoint (GET /api/properties/{id}/explain).
"""
import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock
from fastapi import status
from app.models import Property
from app.core.scoring import calculate_profitability_score, estimate_monthly_rent


def _create_test_property(db, **overrides):
    """Helper to create a property with sensible defaults for testing."""
    defaults = dict(
        address="100 Main St",
        city="TestCity",
        state="CA",
        zip_code="90210",
        price=Decimal("300000"),
        size_sqft=1500,
        bedrooms=3,
        bathrooms=2.0,
        property_type="single_family",
        year_built=2015,
    )
    defaults.update(overrides)

    price = defaults["price"]
    size_sqft = defaults["size_sqft"]
    bedrooms = defaults["bedrooms"]

    if "estimated_rent" not in defaults:
        defaults["estimated_rent"] = estimate_monthly_rent(price, size_sqft, bedrooms)
    if "profitability_score" not in defaults:
        defaults["profitability_score"] = calculate_profitability_score(
            price=price,
            size_sqft=size_sqft,
            estimated_rent=defaults["estimated_rent"],
            year_built=defaults.get("year_built"),
            property_type=defaults["property_type"],
        )

    prop = Property(**defaults)
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


MOCK_GEMINI = "app.api.v1.properties.genai"
MOCK_SETTINGS = "app.api.v1.properties.settings"


# ── Happy path ──────────────────────────────────────────────────────────────


@patch(MOCK_GEMINI)
def test_explain_success(mock_genai, client, db):
    """Clicking Explain with AI returns a 200 with an explanation string."""
    prop = _create_test_property(db)

    fake_response = MagicMock()
    fake_response.text = "This property has a strong profitability score."
    mock_genai.GenerativeModel.return_value.generate_content.return_value = fake_response

    response = client.get(f"/api/properties/{prop.id}/explain")

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["property_id"] == prop.id
    assert data["explanation"] == "This property has a strong profitability score."


@patch(MOCK_GEMINI)
def test_explain_response_has_required_fields(mock_genai, client, db):
    """Response JSON contains exactly property_id and explanation."""
    prop = _create_test_property(db)

    fake_response = MagicMock()
    fake_response.text = "Explanation text."
    mock_genai.GenerativeModel.return_value.generate_content.return_value = fake_response

    data = client.get(f"/api/properties/{prop.id}/explain").json()

    assert set(data.keys()) == {"property_id", "explanation"}


@patch(MOCK_GEMINI)
def test_explain_with_custom_assumptions(mock_genai, client, db):
    """Query param overrides are forwarded to the analysis and prompt."""
    prop = _create_test_property(db)

    fake_response = MagicMock()
    fake_response.text = "Custom assumptions explanation."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    response = client.get(
        f"/api/properties/{prop.id}/explain",
        params={
            "down_payment_pct": 0.3,
            "vacancy_rate": 0.10,
            "interest_rate_annual": 0.07,
        },
    )

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["explanation"] == "Custom assumptions explanation."

    prompt_text = mock_model.generate_content.call_args[0][0]
    assert "30.0%" in prompt_text  # down payment reflected
    assert "7.00%" in prompt_text  # interest rate reflected
    assert "10.0%" in prompt_text  # vacancy rate reflected


@patch(MOCK_GEMINI)
def test_explain_prompt_contains_property_data(mock_genai, client, db):
    """The prompt sent to Gemini includes key property details."""
    prop = _create_test_property(
        db, address="456 Oak Ave", city="Springfield", state="IL"
    )

    fake_response = MagicMock()
    fake_response.text = "Analysis."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    client.get(f"/api/properties/{prop.id}/explain")

    prompt_text = mock_model.generate_content.call_args[0][0]
    assert "456 Oak Ave" in prompt_text
    assert "Springfield" in prompt_text
    assert "IL" in prompt_text
    assert "Cap Rate" in prompt_text
    assert "Cash-on-Cash ROI" in prompt_text
    assert "Profitability Score" in prompt_text
    assert "Deal Score" in prompt_text
    assert "Annual Cash Flow" in prompt_text


@patch(MOCK_GEMINI)
def test_explain_prompt_contains_financial_sections(mock_genai, client, db):
    """The prompt includes all required financial sections."""
    prop = _create_test_property(db)

    fake_response = MagicMock()
    fake_response.text = "Analysis."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    client.get(f"/api/properties/{prop.id}/explain")

    prompt_text = mock_model.generate_content.call_args[0][0]
    for section in [
        "PROPERTY DETAILS",
        "SCORES",
        "KEY FINANCIAL METRICS",
        "ANNUAL CASH FLOW BREAKDOWN",
        "ASSUMPTIONS USED",
        "INSTRUCTIONS",
    ]:
        assert section in prompt_text, f"Missing section: {section}"


# ── Property not found ──────────────────────────────────────────────────────


def test_explain_property_not_found(client, db):
    """Returns 404 when the property ID doesn't exist."""
    response = client.get("/api/properties/99999/explain")

    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "not found" in response.json()["detail"].lower()


# ── Missing GEMINI_API_KEY ──────────────────────────────────────────────────


@patch(MOCK_SETTINGS)
def test_explain_missing_api_key(mock_settings, client, db):
    """Returns 503 when GEMINI_API_KEY is not configured."""
    prop = _create_test_property(db)
    mock_settings.GEMINI_API_KEY = None

    response = client.get(f"/api/properties/{prop.id}/explain")

    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert "not configured" in response.json()["detail"].lower()


# ── Property missing rent data (analysis returns None) ──────────────────────


@patch(MOCK_GEMINI)
def test_explain_property_missing_rent(mock_genai, client, db):
    """Returns 400 when the property lacks data needed for analysis."""
    prop = _create_test_property(db, estimated_rent=None, profitability_score=0.0)

    response = client.get(f"/api/properties/{prop.id}/explain")

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "missing data" in response.json()["detail"].lower()


# ── Gemini API failure ──────────────────────────────────────────────────────


@patch(MOCK_GEMINI)
def test_explain_gemini_api_error(mock_genai, client, db):
    """Returns 502 when the Gemini API call raises an exception."""
    prop = _create_test_property(db)

    mock_genai.GenerativeModel.return_value.generate_content.side_effect = Exception(
        "Rate limit exceeded"
    )

    response = client.get(f"/api/properties/{prop.id}/explain")

    assert response.status_code == status.HTTP_502_BAD_GATEWAY
    assert "try again" in response.json()["detail"].lower()


@patch(MOCK_GEMINI)
def test_explain_gemini_network_timeout(mock_genai, client, db):
    """Returns 502 on a network timeout from Gemini."""
    prop = _create_test_property(db)

    mock_genai.GenerativeModel.return_value.generate_content.side_effect = (
        TimeoutError("Connection timed out")
    )

    response = client.get(f"/api/properties/{prop.id}/explain")

    assert response.status_code == status.HTTP_502_BAD_GATEWAY


# ── Query parameter validation ──────────────────────────────────────────────


def test_explain_invalid_down_payment_too_high(client, db):
    """Rejects down_payment_pct > 1.0."""
    _create_test_property(db)
    response = client.get("/api/properties/1/explain?down_payment_pct=1.5")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_explain_invalid_down_payment_negative(client, db):
    """Rejects negative down_payment_pct."""
    _create_test_property(db)
    response = client.get("/api/properties/1/explain?down_payment_pct=-0.1")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_explain_invalid_vacancy_rate_too_high(client, db):
    """Rejects vacancy_rate > 0.5."""
    _create_test_property(db)
    response = client.get("/api/properties/1/explain?vacancy_rate=0.9")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_explain_invalid_interest_rate_too_high(client, db):
    """Rejects interest_rate_annual > 1.0."""
    _create_test_property(db)
    response = client.get("/api/properties/1/explain?interest_rate_annual=2.0")
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ── Default assumptions used when no params provided ────────────────────────


@patch(MOCK_GEMINI)
def test_explain_default_assumptions(mock_genai, client, db):
    """Uses default assumptions (20% down, 6% interest, 5% vacancy) when
    no query params are provided."""
    prop = _create_test_property(db)

    fake_response = MagicMock()
    fake_response.text = "Default analysis."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    client.get(f"/api/properties/{prop.id}/explain")

    prompt_text = mock_model.generate_content.call_args[0][0]
    assert "Down Payment: 20.0%" in prompt_text
    assert "Interest Rate: 6.00%" in prompt_text
    assert "Vacancy Rate: 5.0%" in prompt_text


# ── Gemini called with correct model ────────────────────────────────────────


@patch(MOCK_GEMINI)
def test_explain_uses_correct_model(mock_genai, client, db):
    """Verifies the endpoint creates a GenerativeModel with the expected name."""
    prop = _create_test_property(db)

    fake_response = MagicMock()
    fake_response.text = "Response."
    mock_genai.GenerativeModel.return_value.generate_content.return_value = fake_response

    client.get(f"/api/properties/{prop.id}/explain")

    mock_genai.GenerativeModel.assert_called_once_with("gemini-2.5-flash")


# ── Multi-paragraph explanation preserved ───────────────────────────────────


@patch(MOCK_GEMINI)
def test_explain_multiline_response_preserved(mock_genai, client, db):
    """Newlines in Gemini's response are preserved in the JSON output."""
    prop = _create_test_property(db)

    multi_paragraph = "First paragraph about the score.\n\nSecond paragraph about risks."
    fake_response = MagicMock()
    fake_response.text = multi_paragraph
    mock_genai.GenerativeModel.return_value.generate_content.return_value = fake_response

    data = client.get(f"/api/properties/{prop.id}/explain").json()

    assert "\n" in data["explanation"]
    assert "First paragraph" in data["explanation"]
    assert "Second paragraph" in data["explanation"]
