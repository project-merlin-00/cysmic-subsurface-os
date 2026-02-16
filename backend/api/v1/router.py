"""
API Router - V1
"""
from fastapi import APIRouter

from backend.api.v1.endpoints import auth, wells, conversations, chat, files, decline

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(wells.router, prefix="/wells", tags=["Wells"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(files.router, prefix="/files", tags=["File Ingestion"])
api_router.include_router(decline.router, prefix="/decline", tags=["Decline Analysis"])
