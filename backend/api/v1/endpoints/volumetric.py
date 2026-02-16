"""
Volumetric Analysis API Endpoints for CYSMIC Subsurface OS
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ...services.volumetric_analysis import (
    calculate_stoiip_deterministic,
    run_monte_carlo_simulation,
    run_triangle_monte_carlo,
    calculate_recovery_factor,
    calculate_remaining_reserves,
    VolumetricParameters,
    VolumetricResult
)


router = APIRouter(prefix="/volumetric", tags=["volumetric-analysis"])


class DeterministicRequest(BaseModel):
    """Request for deterministic STOIIP calculation"""
    area: float  # acres
    thickness: float  # ft
    porosity: float  # fraction
    water_saturation: float  # fraction
    oil_fvf: float  # rbbl/stb


class MonteCarloRequest(BaseModel):
    """Request for Monte Carlo simulation"""
    area: float  # acres
    area_std: Optional[float] = None  # Standard deviation
    thickness: float  # ft
    thickness_std: Optional[float] = None
    porosity: float  # fraction
    porosity_std: Optional[float] = None
    water_saturation: float  # fraction
    water_saturation_std: Optional[float] = None
    oil_fvf: float  # rbbl/stb
    oil_fvf_std: Optional[float] = None
    n_iterations: int = 10000
    seed: Optional[int] = None


class TriangleMCRequest(BaseModel):
    """Request for triangular Monte Carlo"""
    area_min: float
    area_mode: float
    area_max: float
    thickness_min: float
    thickness_mode: float
    thickness_max: float
    porosity_min: float
    porosity_mode: float
    porosity_max: float
    sw_min: float
    sw_mode: float
    sw_max: float
    bo_min: float
    bo_mode: float
    bo_max: float
    n_iterations: int = 10000
    seed: Optional[int] = None


class RecoveryRequest(BaseModel):
    """Request for recovery factor calculation"""
    initial_pressure: float
    bubble_point_pressure: float
    reservoir_type: str = "solution_gas"  # solution_gas, gas_cap, water_drive, combination
    gor: Optional[float] = None
    wc: Optional[float] = None


@router.post("/deterministic")
async def calculate_deterministic(request: DeterministicRequest) -> dict:
    """
    Calculate STOIIP using deterministic method
    
    STOIIP = 7758 * A * h * φ * (1-Sw) / Bo
    """
    try:
        params = VolumetricParameters(
            area=request.area,
            thickness=request.thickness,
            porosity=request.porosity,
            water_saturation=request.water_saturation,
            oil_fvf=request.oil_fvf
        )
        
        stoiip = calculate_stoiip_deterministic(params)
        
        return {
            "stoiip": stoiip,
            "stoiip_mmstb": stoiip / 1e6,
            "unit": "stb",
            "equation": "STOIIP = 7758 * A * h * φ * (1-Sw) / Bo"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/monte-carlo")
async def run_monte_carlo(request: MonteCarloRequest) -> VolumetricResult:
    """
    Run Monte Carlo simulation for STOIIP uncertainty analysis
    
    Uses normal distribution for each parameter
    """
    try:
        params = VolumetricParameters(
            area=request.area,
            area_std=request.area_std,
            thickness=request.thickness,
            thickness_std=request.thickness_std,
            porosity=request.porosity,
            porosity_std=request.porosity_std,
            water_saturation=request.water_saturation,
            water_saturation_std=request.water_saturation_std,
            oil_fvf=request.oil_fvf,
            oil_fvf_std=request.oil_fvf_std
        )
        
        result = run_monte_carlo_simulation(
            params=params,
            n_iterations=request.n_iterations,
            seed=request.seed
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/monte-carlo/triangle")
async def run_triangle_monte_carlo(request: TriangleMCRequest) -> VolumetricResult:
    """
    Run Monte Carlo simulation using triangular distributions
    
    Use when you have min, mode, max estimates (common in petroleum industry)
    """
    try:
        result = run_triangle_monte_carlo(
            area_min=request.area_min,
            area_mode=request.area_mode,
            area_max=request.area_max,
            thickness_min=request.thickness_min,
            thickness_mode=request.thickness_mode,
            thickness_max=request.thickness_max,
            porosity_min=request.porosity_min,
            porosity_mode=request.porosity_mode,
            porosity_max=request.porosity_max,
            sw_min=request.sw_min,
            sw_mode=request.sw_mode,
            sw_max=request.sw_max,
            bo_min=request.bo_min,
            bo_mode=request.bo_mode,
            bo_max=request.bo_max,
            n_iterations=request.n_iterations,
            seed=request.seed
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/recovery-factor")
async def get_recovery_factor(request: RecoveryRequest) -> dict:
    """
    Calculate expected recovery factor based on drive mechanism
    """
    try:
        rf = calculate_recovery_factor(
            initial_pressure=request.initial_pressure,
            bubble_point_pressure=request.bubble_point_pressure,
            reservoir_type=request.reservoir_type,
            gor=request.gor,
            wc=request.wc
        )
        
        return {
            "recovery_factor": rf,
            "recovery_percent": rf * 100,
            "reservoir_type": request.reservoir_type,
            "description": {
                "solution_gas": "Solution gas drive: 5-25% recovery",
                "gas_cap": "Gas cap drive: 20-40% recovery",
                "water_drive": "Water drive: 30-60% recovery",
                "combination": "Combination drive: 25-45% recovery"
            }.get(request.reservoir_type, "Unknown drive mechanism")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/reserves")
async def calculate_reserves(stoiip: float, recovery_factor: float) -> dict:
    """
    Calculate remaining reserves from STOIIP and recovery factor
    """
    reserves = calculate_remaining_reserves(stoiip, recovery_factor)
    
    return {
        "reserves": reserves,
        "reserves_mmstb": reserves / 1e6,
        "reserves_bcf": reserves / 1e6 * 6,  # Approximate conversion
        "stoiip": stoiip,
        "recovery_factor": recovery_factor
    }


@router.get("/models")
async def get_volumetric_models():
    """
    Get available volumetric models and formulas
    """
    return {
        "models": [
            {
                "name": "deterministic",
                "description": "Single point estimate using best guess parameters",
                "formula": "STOIIP = 7758 * A * h * φ * (1-Sw) / Bo",
                "parameters": {
                    "area": "Drainage area (acres)",
                    "thickness": "Net pay thickness (ft)",
                    "porosity": "Porosity (fraction)",
                    "water_saturation": "Water saturation (fraction)",
                    "oil_fvf": "Oil formation volume factor (rbbl/stb)"
                }
            },
            {
                "name": "monte_carlo",
                "description": "Uncertainty analysis using probability distributions",
                "parameters": {
                    "normal": "Mean and standard deviation for each parameter",
                    "triangular": "Minimum, mode, and maximum for each parameter"
                },
                "outputs": {
                    "P10": "High estimate (90th percentile)",
                    "P50": "Median (50th percentile)",
                    "P90": "Low estimate (10th percentile)"
                }
            }
        ],
        "references": [
            "Dake, L. P. (1978). Fundamentals of Reservoir Engineering. Elsevier.",
            "Craft, B. C., & Hawkins, M. F. (1959). Applied Petroleum Reservoir Engineering. Prentice Hall."
        ]
    }
