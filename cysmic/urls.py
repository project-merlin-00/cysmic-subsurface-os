"""
CYSMIC Subsurface OS - URLs
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/core/', include('cysmic.core.urls')),
    # path('api/agents/', include('cysmic.agents.urls')),  # Enable after implementing
    # path('api/data/', include('cysmic.data.urls')),
    # path('api/rag/', include('cysmic.rag.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
