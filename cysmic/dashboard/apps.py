"""
Dashboard app configuration
"""

from django.apps import AppConfig


class DashboardConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cysmic.dashboard'
    verbose_name = 'CYSMIC Dashboard'
