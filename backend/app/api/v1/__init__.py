from .auth import router as auth_router
from .properties import router as properties_router
from .users import router as users_router
from .favorites import router as favorites_router

__all__ = ["auth_router", "properties_router", "users_router", "favorites_router"]
