"""
Redis caching utilities for improving performance.
"""
import json
import redis
from typing import Optional, Any
from ..config import settings

# Redis client instance
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    db=settings.REDIS_DB,
    decode_responses=True
)


def get_cached(key: str) -> Optional[Any]:
    """
    Retrieve a value from Redis cache.
    
    Args:
        key: Cache key
    
    Returns:
        Cached value (parsed from JSON) or None if not found
    """
    try:
        value = redis_client.get(key)
        if value:
            return json.loads(value)
        return None
    except Exception as e:
        print(f"Redis get error: {e}")
        return None


def set_cached(key: str, value: Any, ttl: int = None) -> bool:
    """
    Store a value in Redis cache.
    
    Args:
        key: Cache key
        value: Value to cache (will be JSON serialized)
        ttl: Time to live in seconds (defaults to settings.CACHE_TTL)
    
    Returns:
        True if successful, False otherwise
    """
    try:
        ttl = ttl or settings.CACHE_TTL
        serialized = json.dumps(value)
        redis_client.setex(key, ttl, serialized)
        return True
    except Exception as e:
        print(f"Redis set error: {e}")
        return False


def delete_cached(pattern: str) -> int:
    """
    Delete cached values matching a pattern.
    
    Args:
        pattern: Redis key pattern (e.g., "properties:*")
    
    Returns:
        Number of keys deleted
    """
    try:
        keys = redis_client.keys(pattern)
        if keys:
            return redis_client.delete(*keys)
        return 0
    except Exception as e:
        print(f"Redis delete error: {e}")
        return 0


def generate_cache_key(prefix: str, **kwargs) -> str:
    """
    Generate a consistent cache key from parameters.
    
    Args:
        prefix: Key prefix (e.g., "properties", "user")
        **kwargs: Key-value pairs to include in key
    
    Returns:
        Cache key string
    """
    parts = [prefix]
    for k, v in sorted(kwargs.items()):
        if v is not None:
            parts.append(f"{k}:{v}")
    return ":".join(parts)
