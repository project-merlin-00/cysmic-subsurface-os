"""
Redis Configuration and Connection Management
"""
from typing import Optional
import redis.asyncio as redis
from redis.asyncio import Redis

from backend.core.config import get_settings

settings = get_settings()

_redis_client: Optional[Redis] = None


async def init_redis() -> Redis:
    """Initialize Redis connection"""
    global _redis_client
    _redis_client = redis.from_url(
        settings.redis_url,
        encoding="utf-8",
        decode_responses=True,
    )
    return _redis_client


async def get_redis() -> Redis:
    """Get Redis client"""
    global _redis_client
    if _redis_client is None:
        await init_redis()
    return _redis_client


async def close_redis():
    """Close Redis connection"""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
