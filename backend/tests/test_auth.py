"""
Tests for authentication endpoints.
"""
import pytest
from fastapi import status


def test_register_success(client):
    """Test successful user registration."""
    response = client.post(
        "/api/auth/register",
        json={
            "email": "newuser@example.com",
            "username": "newuser",
            "password": "securepassword123"
        }
    )
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client):
    """Test registration with duplicate email fails."""
    user_data = {
        "email": "duplicate@example.com",
        "username": "user1",
        "password": "password123"
    }
    
    # First registration
    client.post("/api/auth/register", json=user_data)
    
    # Second registration with same email
    response = client.post("/api/auth/register", json=user_data)
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in response.json()["detail"].lower()


def test_login_success(client):
    """Test successful login."""
    # Register user first
    register_data = {
        "email": "loginuser@example.com",
        "password": "testpassword123"
    }
    client.post("/api/auth/register", json=register_data)
    
    # Login
    response = client.post(
        "/api/auth/login",
        json=register_data
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data


def test_login_wrong_password(client):
    """Test login with wrong password fails."""
    # Register user
    client.post(
        "/api/auth/register",
        json={"email": "user@example.com", "password": "correct123"}
    )
    
    # Login with wrong password
    response = client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "wrongpassword"}
    )
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user(client, db):
    """Test getting current user info with valid token."""
    from app.models import User
    
    # Create user directly in DB
    user = User(email="test@example.com", username="testuser")
    db.add(user)
    db.commit()
    
    # Create token
    from app.core.security import create_access_token
    token = create_access_token(data={"sub": user.email})
    
    # Get user info
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "test@example.com"
