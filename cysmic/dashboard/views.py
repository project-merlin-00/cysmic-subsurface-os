"""
Dashboard views - serves UI templates
"""

from django.shortcuts import render
from django.http import JsonResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response

from cysmic.core.models import Field, Well, WellLog
from cysmic.data.parsers import LASParser, CSVParser


def index(request):
    """Main dashboard"""
    fields = Field.objects.all()[:5]
    wells = Well.objects.all()[:10]
    well_logs = WellLog.objects.all()[:5]
    
    context = {
        'fields': fields,
        'wells': wells,
        'well_logs': well_logs,
        'total_fields': Field.objects.count(),
        'total_wells': Well.objects.count(),
    }
    return render(request, 'dashboard/index.html', context)


def dashboard_3d(request):
    """3D Subsurface Dashboard"""
    wells = Well.objects.select_related('field').all()
    return render(request, 'dashboard/3d_subsurface.html', {'wells': wells})


def dashboard_analysis(request):
    """Analysis Canvas"""
    well_logs = WellLog.objects.all()
    return render(request, 'dashboard/analysis.html', {'well_logs': well_logs})


def dashboard_fields(request):
    """Field Manager Map Dashboard"""
    fields = Field.objects.all()
    return render(request, 'dashboard/fields.html', {'fields': fields})


def dashboard_projects(request):
    """Field Project Manager"""
    fields = Field.objects.all()
    return render(request, 'dashboard/projects.html', {'fields': fields})


def dashboard_wells(request):
    """Well Operations"""
    wells = Well.objects.select_related('field').all()
    return render(request, 'dashboard/wells.html', {'wells': wells})


@api_view(['POST'])
def parse_las_api(request):
    """Parse LAS file via API"""
    content = request.data.get('content', '')
    
    if not content:
        return Response({'error': 'No content provided'}, status=400)
    
    try:
        parser = LASParser()
        well_log = parser.parse_text(content)
        
        # Get curve data for charts
        curves = {}
        for name, curve in well_log.curves.items():
            curves[name] = {
                'unit': curve.unit,
                'values': curve.values,
                'min': min(curve.values) if curve.values else 0,
                'max': max(curve.values) if curve.values else 0,
            }
        
        return Response({
            'well_name': well_log.well_name,
            'curves': curves,
            'metadata': well_log.metadata,
        })
        
    except Exception as e:
        return Response({'error': str(e)}, status=400)
