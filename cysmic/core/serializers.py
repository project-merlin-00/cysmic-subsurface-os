"""
Core API serializers
"""

from rest_framework import serializers
from .models import Field, Well, WellLog, SeismicSurvey, ProductionData, Document


class FieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = Field
        fields = '__all__'


class WellLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = WellLog
        fields = '__all__'


class WellSerializer(serializers.ModelSerializer):
    logs = WellLogSerializer(many=True, read_only=True)
    
    class Meta:
        model = Well
        fields = '__all__'


class SeismicSurveySerializer(serializers.ModelSerializer):
    class Meta:
        model = SeismicSurvey
        fields = '__all__'


class ProductionDataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductionData
        fields = '__all__'


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = '__all__'
