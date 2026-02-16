"""
Celery Configuration
Phase 3: Intelligence & Learning - Background job processing
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
        "backend.tasks.monitoring",
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
    
    # Beat schedule (for periodic tasks) - Phase 3 Proactive Monitoring
    beat_schedule={
        # Check well thresholds every 15 minutes
        "check-wells-15min": {
            "task": "backend.tasks.monitoring.check_all_wells",
            "schedule": 900,  # 15 minutes
        },
        
        # Generate daily report at 6 AM
        "daily-monitoring-report": {
            "task": "backend.tasks.monitoring.generate_monitoring_report",
            "schedule": crontab(hour=6, minute=0),
        },
        
        # Weekly cleanup on Sundays at 2 AM
        "weekly-alert-cleanup": {
            "task": "backend.tasks.monitoring.cleanup_old_alerts",
            "schedule": crontab(hour=2, minute=0, day_of_week=0),
        },
        
        # Health check every 5 minutes
        "health-check-5min": {
            "task": "backend.tasks.monitoring.health_check",
            "schedule": 300,  # 5 minutes
        },
        
        # Old sessions cleanup every 6 hours
        "cleanup-old-sessions": {
            "task": "backend.tasks.maintenance.cleanup_sessions",
            "schedule": crontab(minute=0, hour="*/6"),
        },
    },
)
