"""
API Router - V1
"""
from fastapi import APIRouter

from backend.api.v1.endpoints import auth, wells, conversations, chat, files, decline, volumetric, welltest, material_balance, phase3, collaboration, integration, reports

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(wells.router, prefix="/wells", tags=["Wells"])
api_router.include_router(conversations.router, prefix="/conversations", tags=["Conversations"])
api_router.include_router(chat.router, prefix="/chat", tags=["Chat"])
api_router.include_router(files.router, prefix="/files", tags=["File Ingestion"])
api_router.include_router(decline.router, prefix="/decline", tags=["Decline Analysis"])
api_router.include_router(volumetric.router, prefix="/volumetric", tags=["Volumetric Analysis"])
api_router.include_router(welltest.router, prefix="/welltest", tags=["Well Test Analysis"])
api_router.include_router(material_balance.router, prefix="/material-balance", tags=["Material Balance"])
api_router.include_router(phase3.router, prefix="/phase3", tags=["Phase 3 - Intelligence & Learning"])
api_router.include_router(collaboration.router, prefix="/collaboration", tags=["Phase 4 - Collaboration"])
api_router.include_router(integration.router, prefix="/integration", tags=["Phase 4 - Integration"])
api_router.include_router(reports.router, prefix="/reports", tags=["Phase 4 - Report Builder"])
