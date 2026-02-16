"""
Celery Configuration
Background job processing
"""
from celery import Celery
from celery.schedules import crontab

from backend.core.config import get_settings

settings = get_settings()

# Create Celery app
celery_app = Celery(
    "cysmic",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=[
        "backend.tasks.analysis",
        "backend.tasks.data_processing",
    ]
)

# Configuration
celery_app.conf.update(
    # Task settings
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    
    # Broker settings
    broker_connection_retry_on_startup=True,
    
    # Task execution settings
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    
    # Result backend settings
    result_expires=3600,  # 1 hour
    
    # Beat schedule (for periodic tasks)
    beat_schedule={
        "cleanup-old-sessions": {
            "task": "backend.tasks.maintenance.cleanup_sessions",
            "schedule": crontab(minute="0", hour="*/6"),  # Every 6 hours
        },
    },
)
