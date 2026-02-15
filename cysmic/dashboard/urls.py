"""
Dashboard URLs
"""

from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('3d/', views.dashboard_3d, name='dashboard_3d'),
    path('analysis/', views.dashboard_analysis, name='dashboard_analysis'),
    path('fields/', views.dashboard_fields, name='dashboard_fields'),
    path('projects/', views.dashboard_projects, name='dashboard_projects'),
    path('wells/', views.dashboard_wells, name='dashboard_wells'),
    path('api/parse-las/', views.parse_las_api, name='parse_las_api'),
]
