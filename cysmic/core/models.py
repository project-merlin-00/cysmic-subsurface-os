"""
Core models for CYSMIC Subsurface OS
"""

from django.db import models
from django.contrib.gis.db import models as gis_models


class Field(models.Model):
    """Oil/gas field"""
    name = models.CharField(max_length=200)
    basin = models.CharField(max_length=200)
    country = models.CharField(max_length=100, default='Kenya')
    location = gis_models.PointField(null=True, blank=True)
    operator = models.CharField(max_length=200, blank=True)
    discovered = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.basin})"


class Well(models.Model):
    """Well within a field"""
    TYPE_CHOICES = [
        ('producer', 'Producer'),
        ('injector', 'Injector'),
        ('exploration', 'Exploration'),
        ('observation', 'Observation'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('drilling', 'Drilling'),
        ('shut-in', 'Shut-in'),
        ('abandoned', 'Abandoned'),
    ]

    field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name='wells')
    name = models.CharField(max_length=100)
    well_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='drilling')
    
    # Depth
    tvd = models.FloatField(null=True, blank=True, help_text='True Vertical Depth (m)')
    md = models.FloatField(null=True, blank=True, help_text='Measured Depth (m)')
    
    # Location
    surface_lat = models.FloatField(null=True, blank=True)
    surface_lon = models.FloatField(null=True, blank=True)
    
    # Dates
    spud_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.field.name})"


class WellLog(models.Model):
    """Well log data (GR, Resistivity, Porosity, etc.)"""
    well = models.ForeignKey(Well, on_delete=models.CASCADE, related_name='logs')
    name = models.CharField(max_length=50, help_text='Log name, e.g., GR, RHOB, NPHI')
    description = models.TextField(blank=True)
    unit = models.CharField(max_length=20, blank=True)
    
    # JSON storage for log data (depth -> value pairs)
    data = models.JSONField(default=dict, help_text='{depth: value}')
    depth_min = models.FloatField(null=True, blank=True)
    depth_max = models.FloatField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - {self.well.name}"


class SeismicSurvey(models.Model):
    """Seismic survey data"""
    field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name='seismic_surveys')
    name = models.CharField(max_length=200)
    year = models.IntegerField(null=True, blank=True)
    
    # File reference
    file_path = models.FileField(upload_to='seismic/', null=True, blank=True)
    
    # Survey parameters
    inline_range = models.CharField(max_length=50, blank=True)
    crossline_range = models.CharField(max_length=50, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.field.name})"


class ProductionData(models.Model):
    """Production history for a well"""
    well = models.ForeignKey(Well, on_delete=models.CASCADE, related_name='production')
    date = models.DateField()
    
    # Production values
    oil_rate = models.FloatField(null=True, blank=True, help_text='Oil rate (m3/d)')
    gas_rate = models.FloatField(null=True, blank=True, help_text='Gas rate (m3/d)')
    water_rate = models.FloatField(null=True, blank=True, help_text='Water rate (m3/d)')
    water_cut = models.FloatField(null=True, blank=True, help_text='Water cut (%)')
    
    # Operating conditions
    pressure = models.FloatField(null=True, blank=True, help_text='Bottom hole pressure (bar)')
    choke = models.FloatField(null=True, blank=True, help_text='Choke size (mm)')
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        unique_together = ['well', 'date']

    def __str__(self):
        return f"{self.well.name} - {self.date}"


class Document(models.Model):
    """Documents (reports, PDFs, etc.) for RAG"""
    DOC_TYPE_CHOICES = [
        ('report', 'Well Report'),
        ('seismic', 'Seismic Interpretation'),
        ('production', 'Production Report'),
        ('drilling', 'Drilling Report'),
        ('other', 'Other'),
    ]

    field = models.ForeignKey(Field, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    well = models.ForeignKey(Well, on_delete=models.CASCADE, related_name='documents', null=True, blank=True)
    
    title = models.CharField(max_length=500)
    doc_type = models.CharField(max_length=20, choices=DOC_TYPE_CHOICES, default='other')
    file = models.FileField(upload_to='documents/', null=True, blank=True)
    content = models.TextField(blank=True, help_text='Extracted text content')
    
    uploaded_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title
