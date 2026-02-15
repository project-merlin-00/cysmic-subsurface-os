"""
Agents app configuration
"""

from django.apps import AppConfig


class AgentsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'cysmic.agents'
    verbose_name = 'CYSMIC Agents'
