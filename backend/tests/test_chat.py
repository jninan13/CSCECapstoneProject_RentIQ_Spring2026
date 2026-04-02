"""
Tests for the chatbot endpoint (POST /api/chat).
"""
import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock
from fastapi import status

from app.models import Property, User, Favorite
from app.core.scoring import calculate_profitability_score, estimate_monthly_rent
from app.core.security import create_access_token


MOCK_GEMINI = "app.api.v1.chat.genai"
MOCK_SETTINGS = "app.api.v1.chat.settings"


def _create_test_property(db, **overrides):
    """Helper to create a property with sensible defaults."""
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


def _create_test_user(db, email="test@example.com"):
    """Helper to create a user and return (user, auth_headers)."""
    user = User(email=email, username=email.split("@")[0])
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(data={"sub": user.email})
    headers = {"Authorization": f"Bearer {token}"}
    return user, headers


# ── Happy path ──────────────────────────────────────────────────────────────


@patch(MOCK_GEMINI)
def test_chat_success(mock_genai, client, db):
    """Basic chat message returns a 200 with a reply string."""
    _create_test_property(db)

    fake_response = MagicMock()
    fake_response.text = "That property looks like a solid investment."
    mock_genai.GenerativeModel.return_value.generate_content.return_value = fake_response

    response = client.post("/api/chat", json={"message": "Is this a good investment?"})

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "reply" in data
    assert data["reply"] == "That property looks like a solid investment."


@patch(MOCK_GEMINI)
def test_chat_response_schema(mock_genai, client, db):
    """Response JSON contains exactly the 'reply' field."""
    fake_response = MagicMock()
    fake_response.text = "Hello!"
    mock_genai.GenerativeModel.return_value.generate_content.return_value = fake_response

    data = client.post("/api/chat", json={"message": "Hi"}).json()

    assert set(data.keys()) == {"reply"}


@patch(MOCK_GEMINI)
def test_chat_uses_correct_model(mock_genai, client, db):
    """Verifies the endpoint creates a GenerativeModel with gemini-2.5-flash."""
    fake_response = MagicMock()
    fake_response.text = "Response."
    mock_genai.GenerativeModel.return_value.generate_content.return_value = fake_response

    client.post("/api/chat", json={"message": "Hello"})

    mock_genai.GenerativeModel.assert_called_once_with("gemini-2.5-flash")


# ── Property context ────────────────────────────────────────────────────────


@patch(MOCK_GEMINI)
def test_chat_with_property_id_includes_context(mock_genai, client, db):
    """When property_id is provided, the conversation includes property details."""
    prop = _create_test_property(db, address="456 Oak Ave", city="Springfield", state="IL")

    fake_response = MagicMock()
    fake_response.text = "Analysis of the property."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    client.post("/api/chat", json={"message": "Tell me about this property", "property_id": prop.id})

    conversation = mock_model.generate_content.call_args[0][0]
    system_text = conversation[0]["parts"][0]
    assert "456 Oak Ave" in system_text
    assert "Springfield" in system_text
    assert "PROPERTY THE USER IS CURRENTLY VIEWING" in system_text


@patch(MOCK_GEMINI)
def test_chat_with_invalid_property_id_still_works(mock_genai, client, db):
    """A nonexistent property_id doesn't cause an error — it just omits property context."""
    _create_test_property(db)

    fake_response = MagicMock()
    fake_response.text = "I can help with general questions."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    response = client.post("/api/chat", json={"message": "Hello", "property_id": 99999})

    assert response.status_code == status.HTTP_200_OK
    conversation = mock_model.generate_content.call_args[0][0]
    system_text = conversation[0]["parts"][0]
    assert "PROPERTY THE USER IS CURRENTLY VIEWING" not in system_text


# ── Aggregate context ───────────────────────────────────────────────────────


@patch(MOCK_GEMINI)
def test_chat_includes_platform_stats(mock_genai, client, db):
    """The system prompt includes aggregate platform data when properties exist."""
    _create_test_property(db)
    _create_test_property(db, address="200 Elm St", price=Decimal("450000"))

    fake_response = MagicMock()
    fake_response.text = "Stats response."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    client.post("/api/chat", json={"message": "How many properties are there?"})

    conversation = mock_model.generate_content.call_args[0][0]
    system_text = conversation[0]["parts"][0]
    assert "PLATFORM DATA SUMMARY" in system_text
    assert "Total properties in database: 2" in system_text


# ── Authenticated user with favorites ───────────────────────────────────────


@patch(MOCK_GEMINI)
def test_chat_authenticated_includes_favorites(mock_genai, client, db):
    """Authenticated user's favorites are included in the conversation context."""
    user, headers = _create_test_user(db)
    prop = _create_test_property(db, address="789 Fav Lane")
    fav = Favorite(user_id=user.id, property_id=prop.id)
    db.add(fav)
    db.commit()

    fake_response = MagicMock()
    fake_response.text = "Here are your favorites."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    client.post("/api/chat", json={"message": "What are my favorites?"}, headers=headers)

    conversation = mock_model.generate_content.call_args[0][0]
    system_text = conversation[0]["parts"][0]
    assert "USER'S FAVORITED PROPERTIES" in system_text
    assert "789 Fav Lane" in system_text


@patch(MOCK_GEMINI)
def test_chat_unauthenticated_no_favorites_section(mock_genai, client, db):
    """Unauthenticated users don't get a favorites section in context."""
    _create_test_property(db)

    fake_response = MagicMock()
    fake_response.text = "General response."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    client.post("/api/chat", json={"message": "Hello"})

    conversation = mock_model.generate_content.call_args[0][0]
    system_text = conversation[0]["parts"][0]
    assert "USER'S FAVORITED PROPERTIES" not in system_text


# ── Conversation history ────────────────────────────────────────────────────


@patch(MOCK_GEMINI)
def test_chat_with_history(mock_genai, client, db):
    """Conversation history is forwarded to Gemini."""
    fake_response = MagicMock()
    fake_response.text = "Follow-up answer."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    history = [
        {"role": "user", "content": "What is a cap rate?"},
        {"role": "assistant", "content": "Cap rate is net operating income divided by price."},
    ]

    client.post("/api/chat", json={"message": "Can you give an example?", "history": history})

    conversation = mock_model.generate_content.call_args[0][0]
    # system priming (2) + history (2) + new message (1) = 5
    assert len(conversation) == 5
    assert conversation[2]["parts"][0] == "What is a cap rate?"
    assert conversation[3]["role"] == "model"
    assert conversation[4]["parts"][0] == "Can you give an example?"


@patch(MOCK_GEMINI)
def test_chat_history_truncated_to_10(mock_genai, client, db):
    """Only the last 10 history messages are sent to Gemini."""
    fake_response = MagicMock()
    fake_response.text = "Response."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    history = [{"role": "user", "content": f"Message {i}"} for i in range(15)]

    client.post("/api/chat", json={"message": "Latest", "history": history})

    conversation = mock_model.generate_content.call_args[0][0]
    # 2 priming + 10 history + 1 new = 13
    assert len(conversation) == 13


@patch(MOCK_GEMINI)
def test_chat_empty_history(mock_genai, client, db):
    """Works fine with no history at all."""
    fake_response = MagicMock()
    fake_response.text = "First response."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    response = client.post("/api/chat", json={"message": "Hello!", "history": []})

    assert response.status_code == status.HTTP_200_OK
    conversation = mock_model.generate_content.call_args[0][0]
    # 2 priming + 0 history + 1 new = 3
    assert len(conversation) == 3


# ── Missing API key ─────────────────────────────────────────────────────────


@patch(MOCK_SETTINGS)
def test_chat_missing_api_key(mock_settings, client, db):
    """Returns 503 when GEMINI_API_KEY is not configured."""
    mock_settings.GEMINI_API_KEY = None

    response = client.post("/api/chat", json={"message": "Hello"})

    assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert "not configured" in response.json()["detail"].lower()


# ── Gemini API failures ─────────────────────────────────────────────────────


@patch(MOCK_GEMINI)
def test_chat_gemini_api_error(mock_genai, client, db):
    """Returns 502 when the Gemini API call raises an exception."""
    mock_genai.GenerativeModel.return_value.generate_content.side_effect = Exception(
        "Rate limit exceeded"
    )

    response = client.post("/api/chat", json={"message": "Hello"})

    assert response.status_code == status.HTTP_502_BAD_GATEWAY
    assert "try again" in response.json()["detail"].lower()


@patch(MOCK_GEMINI)
def test_chat_gemini_timeout(mock_genai, client, db):
    """Returns 502 on a network timeout from Gemini."""
    mock_genai.GenerativeModel.return_value.generate_content.side_effect = TimeoutError(
        "Connection timed out"
    )

    response = client.post("/api/chat", json={"message": "Hello"})

    assert response.status_code == status.HTTP_502_BAD_GATEWAY


# ── Request validation ──────────────────────────────────────────────────────


def test_chat_empty_message_rejected(client, db):
    """An empty message string is rejected with 422."""
    response = client.post("/api/chat", json={"message": ""})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_chat_missing_message_field(client, db):
    """Missing 'message' field is rejected with 422."""
    response = client.post("/api/chat", json={})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_chat_message_too_long(client, db):
    """A message exceeding 2000 characters is rejected with 422."""
    response = client.post("/api/chat", json={"message": "x" * 2001})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_chat_invalid_history_role(client, db):
    """History with an invalid role is rejected with 422."""
    response = client.post(
        "/api/chat",
        json={
            "message": "Hello",
            "history": [{"role": "system", "content": "You are a bot"}],
        },
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ── Multiline / special content ─────────────────────────────────────────────


@patch(MOCK_GEMINI)
def test_chat_multiline_response_preserved(mock_genai, client, db):
    """Newlines in Gemini's response are preserved."""
    fake_response = MagicMock()
    fake_response.text = "First paragraph.\n\nSecond paragraph."
    mock_genai.GenerativeModel.return_value.generate_content.return_value = fake_response

    data = client.post("/api/chat", json={"message": "Explain cap rate"}).json()

    assert "\n" in data["reply"]
    assert "First paragraph" in data["reply"]
    assert "Second paragraph" in data["reply"]


@patch(MOCK_GEMINI)
def test_chat_special_characters_in_message(mock_genai, client, db):
    """Messages with special characters are handled correctly."""
    fake_response = MagicMock()
    fake_response.text = "Here's the info on that $300k property."
    mock_genai.GenerativeModel.return_value.generate_content.return_value = fake_response

    response = client.post(
        "/api/chat",
        json={"message": "What about the $300,000 property at 123 Main St?"},
    )

    assert response.status_code == status.HTTP_200_OK


# ── System prompt content ───────────────────────────────────────────────────


@patch(MOCK_GEMINI)
def test_chat_system_prompt_contains_scoring_info(mock_genai, client, db):
    """The system prompt explains the RentIQ scoring methodology."""
    fake_response = MagicMock()
    fake_response.text = "Response."
    mock_model = MagicMock()
    mock_model.generate_content.return_value = fake_response
    mock_genai.GenerativeModel.return_value = mock_model

    client.post("/api/chat", json={"message": "How does scoring work?"})

    conversation = mock_model.generate_content.call_args[0][0]
    system_text = conversation[0]["parts"][0]
    assert "Profitability Score" in system_text
    assert "Deal Score" in system_text
    assert "cap rate" in system_text.lower()
    assert "RentIQ Assistant" in system_text
