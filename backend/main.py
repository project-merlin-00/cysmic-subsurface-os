"""
CYSMIC Subsurface OS - Backend Entry Point
Agent-first petroleum engineering platform
"""

from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.v1.router import api_router
from backend.core.config import get_settings
from backend.core.database import init_db
from backend.core.redis import init_redis
from backend.websockets.chat import router as chat_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    logger.info("Starting CYSMIC Subsurface OS...")
    
    # Initialize databases
    await init_db()
    await init_redis()
    
    logger.info("All services initialized")
    
    yield
    
    logger.info("Shutting down CYSMIC Subsurface OS...")


app = FastAPI(
    title="CYSMIC Subsurface OS",
    description="Agent-first petroleum engineering platform",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routes
app.include_router(api_router, prefix="/api/v1")

# WebSocket Routes
app.include_router(chat_router, prefix="/ws")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "0.1.0",
    }


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "CYSMIC Subsurface OS API",
        "docs": "/api/docs",
    }
