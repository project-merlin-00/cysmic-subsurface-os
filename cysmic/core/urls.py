"""
Core API URLs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    FieldViewSet, WellViewSet, WellLogViewSet,
    SeismicSurveyViewSet, ProductionDataViewSet, DocumentViewSet
)

router = DefaultRouter()
router.register(r'fields', FieldViewSet)
router.register(r'wells', WellViewSet)
router.register(r'logs', WellLogViewSet)
router.register(r'seismic', SeismicSurveyViewSet)
router.register(r'production', ProductionDataViewSet)
router.register(r'documents', DocumentViewSet)

urlpatterns = router.urls
