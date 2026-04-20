"""
Tests for user property notes endpoints.
"""
import pytest
from decimal import Decimal
from fastapi import status
from app.models import Property
from app.core.scoring import estimate_monthly_rent, calculate_profitability_score


def _make_property(db, address="1 Test St", city="Austin", state="TX", zip_code="78701"):
    price = Decimal("300000")
    rent = estimate_monthly_rent(price, 1500, 3)
    score = calculate_profitability_score(price=price, size_sqft=1500, estimated_rent=rent, year_built=2015, property_type="single_family")
    prop = Property(
        address=address, city=city, state=state, zip_code=zip_code,
        price=price, size_sqft=1500, bedrooms=3, bathrooms=2.0,
        property_type="single_family", year_built=2015,
        profitability_score=score, estimated_rent=rent,
    )
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop


def _register_and_token(client, email="user@test.com", password="password123"):
    """Register a user and return an auth header dict."""
    client.post("/api/auth/register", json={"email": email, "password": password})
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_put_creates_note(client, db):
    """PUT creates a note for the property."""
    prop = _make_property(db)
    headers = _register_and_token(client)

    res = client.put(f"/api/notes/{prop.id}", json={"body": "Great location!"}, headers=headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["body"] == "Great location!"
    assert data["property_id"] == prop.id


def test_put_updates_existing_note(client, db):
    """A second PUT updates the same note rather than creating a duplicate."""
    prop = _make_property(db)
    headers = _register_and_token(client)

    client.put(f"/api/notes/{prop.id}", json={"body": "First version"}, headers=headers)
    res = client.put(f"/api/notes/{prop.id}", json={"body": "Updated version"}, headers=headers)

    assert res.status_code == status.HTTP_200_OK
    assert res.json()["body"] == "Updated version"

    # Only one note should exist
    get_res = client.get(f"/api/notes/{prop.id}", headers=headers)
    assert get_res.json()["body"] == "Updated version"


def test_get_returns_note(client, db):
    """GET returns the stored note body."""
    prop = _make_property(db)
    headers = _register_and_token(client)

    client.put(f"/api/notes/{prop.id}", json={"body": "Nice neighborhood"}, headers=headers)
    res = client.get(f"/api/notes/{prop.id}", headers=headers)

    assert res.status_code == status.HTTP_200_OK
    assert res.json()["body"] == "Nice neighborhood"


def test_get_returns_404_when_no_note(client, db):
    """GET returns 404 when no note exists yet."""
    prop = _make_property(db)
    headers = _register_and_token(client)

    res = client.get(f"/api/notes/{prop.id}", headers=headers)
    assert res.status_code == status.HTTP_404_NOT_FOUND


def test_delete_clears_note(client, db):
    """DELETE returns 204 and subsequent GET returns 404."""
    prop = _make_property(db)
    headers = _register_and_token(client)

    client.put(f"/api/notes/{prop.id}", json={"body": "To be deleted"}, headers=headers)
    del_res = client.delete(f"/api/notes/{prop.id}", headers=headers)
    assert del_res.status_code == status.HTTP_204_NO_CONTENT

    get_res = client.get(f"/api/notes/{prop.id}", headers=headers)
    assert get_res.status_code == status.HTTP_404_NOT_FOUND


def test_user_isolation(client, db):
    """User A cannot read or overwrite user B's note."""
    prop = _make_property(db)
    headers_a = _register_and_token(client, "user_a@test.com")
    headers_b = _register_and_token(client, "user_b@test.com")

    client.put(f"/api/notes/{prop.id}", json={"body": "User A's note"}, headers=headers_a)

    # User B has no note yet
    res_b = client.get(f"/api/notes/{prop.id}", headers=headers_b)
    assert res_b.status_code == status.HTTP_404_NOT_FOUND

    # User B writes their own note
    client.put(f"/api/notes/{prop.id}", json={"body": "User B's note"}, headers=headers_b)

    # User A's note is unchanged
    res_a = client.get(f"/api/notes/{prop.id}", headers=headers_a)
    assert res_a.json()["body"] == "User A's note"


def test_bulk_get_returns_only_caller_notes(client, db):
    """GET /notes?property_ids=... returns only the caller's notes."""
    p1 = _make_property(db, address="1 A St")
    p2 = _make_property(db, address="2 B St")
    p3 = _make_property(db, address="3 C St")
    headers_a = _register_and_token(client, "bulk_a@test.com")
    headers_b = _register_and_token(client, "bulk_b@test.com")

    client.put(f"/api/notes/{p1.id}", json={"body": "Note on p1"}, headers=headers_a)
    client.put(f"/api/notes/{p2.id}", json={"body": "Note on p2"}, headers=headers_a)
    client.put(f"/api/notes/{p3.id}", json={"body": "Note on p3 by B"}, headers=headers_b)

    res = client.get(f"/api/notes?property_ids={p1.id},{p2.id},{p3.id}", headers=headers_a)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert len(data) == 2
    returned_ids = {n["property_id"] for n in data}
    assert returned_ids == {p1.id, p2.id}


def test_unauthenticated_access_rejected(client, db):
    """All note endpoints require auth."""
    prop = _make_property(db)
    assert client.get(f"/api/notes/{prop.id}").status_code == status.HTTP_403_FORBIDDEN
    assert client.put(f"/api/notes/{prop.id}", json={"body": "x"}).status_code == status.HTTP_403_FORBIDDEN
    assert client.delete(f"/api/notes/{prop.id}").status_code == status.HTTP_403_FORBIDDEN
