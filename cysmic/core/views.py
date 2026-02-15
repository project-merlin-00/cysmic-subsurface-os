"""
Core API views
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Field, Well, WellLog, SeismicSurvey, ProductionData, Document
from .serializers import (
    FieldSerializer, WellSerializer, WellLogSerializer,
    SeismicSurveySerializer, ProductionDataSerializer, DocumentSerializer
)


class FieldViewSet(viewsets.ModelViewSet):
    """API for managing fields"""
    queryset = Field.objects.all()
    serializer_class = FieldSerializer


class WellViewSet(viewsets.ModelViewSet):
    """API for managing wells"""
    queryset = Well.objects.all()
    serializer_class = WellSerializer
    
    def get_queryset(self):
        queryset = Well.objects.all()
        field_id = self.request.query_params.get('field')
        if field_id:
            queryset = queryset.filter(field_id=field_id)
        return queryset


class WellLogViewSet(viewsets.ModelViewSet):
    """API for managing well logs"""
    queryset = WellLog.objects.all()
    serializer_class = WellLogSerializer


class SeismicSurveyViewSet(viewsets.ModelViewSet):
    """API for managing seismic surveys"""
    queryset = SeismicSurvey.objects.all()
    serializer_class = SeismicSurveySerializer


class ProductionDataViewSet(viewsets.ModelViewSet):
    """API for managing production data"""
    queryset = ProductionData.objects.all()
    serializer_class = ProductionDataSerializer
    
    def get_queryset(self):
        queryset = ProductionData.objects.all()
        well_id = self.request.query_params.get('well')
        if well_id:
            queryset = queryset.filter(well_id=well_id)
        return queryset


class DocumentViewSet(viewsets.ModelViewSet):
    """API for managing documents (RAG)"""
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
