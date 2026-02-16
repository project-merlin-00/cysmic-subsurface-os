"""
Decline Curve Analysis API Endpoints for CYSMIC Subsurface OS
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ...services.decline_analysis import (
    fit_decline_curve,
    generate_decline_forecast,
    DeclineParameters,
    DeclineResult
)


router = APIRouter(prefix="/decline", tags=["decline-analysis"])


class DeclineFitRequest(BaseModel):
    """Request to fit decline curve to data"""
    time_data: List[float]
    rate_data: List[float]
    model: str = 'hyperbolic'  # 'hyperbolic', 'exponential', 'harmonic'
    b: Optional[float] = None  # Only for hyperbolic


class DeclineForecastRequest(BaseModel):
    """Request to generate decline forecast"""
    qi: float
    Di: float
    b: float
    months: int = 60
    model: str = 'hyperbolic'


@router.post("/fit")
async def fit_decline(request: DeclineFitRequest) -> DeclineResult:
    """
    Fit decline curve to production data
    
    Returns optimal parameters and forecast
    """
    try:
        result = fit_decline_curve(
            time_data=request.time_data,
            rate_data=request.rate_data,
            model=request.model,
            b=request.b
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/forecast")
async def create_forecast(request: DeclineForecastRequest) -> DeclineResult:
    """
    Generate decline curve forecast from parameters
    """
    try:
        params = DeclineParameters(
            qi=request.qi,
            Di=request.Di,
            b=request.b,
            ti=0
        )
        result = generate_decline_forecast(
            params=params,
            months=request.months,
            model=request.model
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/models")
async def get_decline_models():
    """
    Get available decline curve models
    """
    return {
        "models": [
            {
                "name": "hyperbolic",
                "description": "Most flexible - commonly used for oil wells",
                "parameters": {
                    "qi": "Initial production rate (bbl/d or MMscf/d)",
                    "Di": "Initial decline rate (per time unit)",
                    "b": "Decline exponent (0 < b < 1)"
                },
                "equation": "q = qi / (1 + b*Di*t)^(1/b)"
            },
            {
                "name": "exponential", 
                "description": "Constant percentage decline",
                "parameters": {
                    "qi": "Initial production rate",
                    "Di": "Decline rate (constant)"
                },
                "equation": "q = qi * exp(-Di*t)"
            },
            {
                "name": "harmonic",
                "description": "Special case of hyperbolic (b=1)",
                "parameters": {
                    "qi": "Initial production rate",
                    "Di": "Decline rate"
                },
                "equation": "q = qi / (1 + Di*t)"
            }
        ]
    }
