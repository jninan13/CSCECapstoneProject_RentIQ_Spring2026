"""
Main FastAPI application entry point.
Configures CORS, routes, and middleware.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from .config import settings
from .api.v1 import auth_router, properties_router, users_router, favorites_router
from .database import Base, engine

# Create database tables
# Note: In production, use Alembic migrations instead
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="API for finding profitable investment properties",
    debug=settings.DEBUG
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(properties_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(favorites_router, prefix="/api")


@app.get("/")
async def root():
    """Health check endpoint."""
    return {
        "message": "Property Finder API",
        "version": settings.VERSION,
        "status": "operational"
    }


@app.get("/health")
async def health_check():
    """Detailed health check for monitoring."""
    return {"status": "healthy"}


# AWS Lambda handler using Mangum
handler = Mangum(app)
