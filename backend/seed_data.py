"""
Script to seed the database with sample properties and a dev/test user.
Run this after setting up the database to have test data.
Re-running will clear existing properties and reseed.
"""
import subprocess
import sys
from pathlib import Path
from app.database import SessionLocal, Base, engine
from app.models import User
from app.core.security import get_password_hash

# Dev account credentials for testing
DEV_EMAIL = "dev@gmail.com"
DEV_USERNAME = "devuser"
DEV_PASSWORD = "dev12345"


def get_load_csv_command() -> list[str]:
    """Build a command that works both on host and inside the backend container."""
    load_args = ["python", "load_csv_data.py", "USA_clean_unique_with_city.csv", "1", "30"]

    # If already inside Docker, call the loader directly.
    if Path("/.dockerenv").exists():
        return [sys.executable, "load_csv_data.py", "USA_clean_unique_with_city.csv", "1", "30"]

    # Host flow: execute inside the running backend container.
    return ["docker", "exec", "rentiq_backend", *load_args]


def create_dev_user(db):
    """Create a dev/test user if it doesn't exist."""
    existing = db.query(User).filter(User.email == DEV_EMAIL).first()
    if existing:
        print(f"👤 Dev user already exists: {DEV_EMAIL}")
        return

    user = User(
        email=DEV_EMAIL,
        username=DEV_USERNAME,
        password_hash=get_password_hash(DEV_PASSWORD),
    )
    db.add(user)
    db.commit()
    print(f"👤 Created dev user: {DEV_EMAIL} / password: {DEV_PASSWORD}")


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    create_dev_user(db)
    db.close()
    try:
        # Change the last number to load more homes"
        result = subprocess.run(get_load_csv_command(), capture_output=True, text=True, check=True)
        print("Loading CSV data into the database...")
        print(result.stdout)
    except FileNotFoundError as e:
        print(f"Command not found: {e}")
    except subprocess.CalledProcessError as e:
        print(f"Command failed with error: {e.stderr}")

    
