"""
RAG API views
"""

import os
import json
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.conf import settings


class RAGQueryViewSet(viewsets.ViewSet):
    """API for RAG queries"""
    
    def create(self, request):
        """Query the RAG system"""
        question = request.data.get('question')
        
        if not question:
            return Response(
                {'error': 'No question provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from cysmic.rag.ingest import RAGPipeline
            
            # Get persist directory
            persist_dir = getattr(settings, 'CHROMA_PERSIST_DIR', './chroma_db')
            
            # Create pipeline
            pipeline = RAGPipeline(persist_dir)
            
            # Query
            result = pipeline.query(question)
            
            return Response(result, status=status.HTTP_200_OK)
            
        except ImportError as e:
            return Response(
                {'error': f'RAG not available: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get RAG statistics"""
        try:
            from cysmic.rag.ingest import RAGPipeline
            
            persist_dir = getattr(settings, 'CHROMA_PERSIST_DIR', './chroma_db')
            pipeline = RAGPipeline(persist_dir)
            
            return Response(pipeline.stats(), status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RAGIngestViewSet(viewsets.ViewSet):
    """API for ingesting documents into RAG"""
    
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def create(self, request):
        """Ingest a document"""
        # Check for file or text
        file_obj = request.FILES.get('file')
        text = request.data.get('text')
        source = request.data.get('source', 'api_upload')
        
        if not file_obj and not text:
            return Response(
                {'error': 'No file or text provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            from cysmic.rag.ingest import RAGPipeline
            
            persist_dir = getattr(settings, 'CHROMA_PERSIST_DIR', './chroma_db')
            pipeline = RAGPipeline(persist_dir)
            
            if file_obj:
                # Save and ingest file
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False) as tmp:
                    for chunk in file_obj.chunks():
                        tmp.write(chunk)
                    tmp_path = tmp.name
                
                try:
                    count = pipeline.add_documents(file_path=tmp_path)
                finally:
                    os.unlink(tmp_path)
            else:
                count = pipeline.add_documents(content=text, source=source)
            
            return Response({
                'chunks_added': count,
                'source': file_obj.name if file_obj else source
            }, status=status.HTTP_200_OK)
            
        except ImportError as e:
            return Response(
                {'error': f'RAG not available: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['delete'])
    def clear(self, request):
        """Clear all documents from RAG"""
        return Response({
            'message': 'Clear not implemented - requires ChromaDB',
            'status': 'pending'
        })
