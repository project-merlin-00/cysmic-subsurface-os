"""
RAG API URLs
"""

from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import RAGQueryViewSet, RAGIngestViewSet

router = DefaultRouter()
router.register(r'query', RAGQueryViewSet, basename='rag-query')
router.register(r'ingest', RAGIngestViewSet, basename='rag-ingest')

urlpatterns = router.urls
