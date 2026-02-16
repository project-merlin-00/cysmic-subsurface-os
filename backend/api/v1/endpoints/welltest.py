"""
Pressure Transient Analysis API Endpoints for CYSMIC Subsurface OS
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ...services.pressure_transient_analysis import (
    calculate_derivative,
    diagnose_regime,
    generate_type_curve_data,
    well_test_analysis,
    PressureData,
    WellTestParameters
)


router = APIRouter(prefix="/welltest", tags=["well-test-analysis"])


class PressureTestRequest(BaseModel):
    """Request for well test analysis"""
    time: List[float]  # hours
    pressure: List[float]  # psia
    flow_rate: Optional[List[float]] = None  # stb/d
    well_radius: float = 0.25  # ft
    porosity: float = 0.20  # fraction
    thickness: float = 50  # ft
    viscosity: float = 2.0  # cp
    compressibility: float = 1.5e-5  # 1/psi
    rate: float = 100  # stb/d
    skin: float = 0
    B: float = 1.2  # Oil formation volume factor


class DerivativeRequest(BaseModel):
    """Request for pressure derivative calculation"""
    time: List[float]
    pressure: List[float]
    shift: float = 0.1


class TypeCurveRequest(BaseModel):
    """Request for type curve generation"""
    model: str  # homogeneous, fracture, dual_porosity
    storativity_ratio: Optional[float] = 0.01


@router.post("/analyze")
async def analyze_well_test(request: PressureTestRequest) -> dict:
    """
    Perform complete well test analysis
    
    Includes:
    - Pressure derivative calculation
    - Flow regime diagnosis
    - Semilog analysis for permeability and skin
    - Type curve matching
    """
    try:
        # Prepare data
        pressure_data = PressureData(
            time=request.time,
            pressure=request.pressure,
            flow_rate=request.flow_rate
        )
        
        well_params = WellTestParameters(
            well_radius=request.well_radius,
            porosity=request.porosity,
            thickness=request.thickness,
            viscosity=request.viscosity,
            compressibility=request.compressibility,
            rate=request.rate,
            skin=request.skin
        )
        
        # Run analysis
        result = well_test_analysis(pressure_data, well_params, request.B)
        
        return {
            "permeability": result.permeability,
            "skin": result.skin,
            "reservoir_pressure": result.reservoir_pressure,
            "flow_capacity": result.flow_capacity,
            "storativity": result.storativity,
            "storativity_ratio": result.storativity_ratio,
            "model": result.model,
            "diagnostics": result.diagnostics
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/derivative")
async def calculate_pressure_derivative(request: DerivativeRequest) -> dict:
    """
    Calculate pressure derivative for diagnostics
    
    The derivative helps identify flow regimes:
    - Unit slope: Wellbore storage
    - Unit slope (derivative): Radial/ Infinite acting
    - 1/2 slope: Linear flow (fracture)
    - Upward turn: Boundary effect
    """
    try:
        import numpy as np
        
        time = np.array(request.time)
        pressure = np.array(request.pressure)
        
        derivative = calculate_derivative(time, pressure, request.shift)
        diagnosis = diagnose_regime(time, pressure, derivative)
        
        return {
            "time": request.time,
            "pressure": request.pressure,
            "derivative": derivative.tolist() if hasattr(derivative, 'tolist') else list(derivative),
            "diagnosis": diagnosis
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/type-curve")
async def get_type_curve(request: TypeCurveRequest) -> dict:
    """
    Generate theoretical type curve data
    
    Models:
    - homogeneous: Infinite acting reservoir
    - fracture: Finite conductivity hydraulic fracture
    - dual_porosity: Naturally fractured reservoir
    """
    try:
        curve_data = generate_type_curve_data(
            model=request.model,
            params={"storativity_ratio": request.storativity_ratio}
        )
        
        return {
            "model": request.model,
            "time": curve_data["time"],
            "pressure": curve_data["pressure"],
            "derivative": curve_data["derivative"],
            "description": {
                "homogeneous": "Single porosity reservoir - unit slope on derivative in radial flow",
                "fracture": "Hydraulically fractured well - 1/2 slope early time",
                "dual_porosity": "Naturally fractured - characteristic 'W' shape on derivative"
            }.get(request.model, "Unknown model")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/models")
async def get_welltest_models():
    """
    Get available well test models and interpretations
    """
    return {
        "models": [
            {
                "name": "homogeneous",
                "description": "Single porosity reservoir",
                "characteristics": [
                    "Early: Wellbore storage (unit slope)",
                    "Middle: Radial flow (unit slope on derivative)",
                    "Late: Boundary effects"
                ]
            },
            {
                "name": "fractured",
                "description": "Hydraulically fractured vertical well",
                "characteristics": [
                    "Early: Linear flow (1/2 slope)",
                    "Middle: Pseudo-radial flow",
                    "Late: Boundary effects"
                ]
            },
            {
                "name": "dual_porosity",
                "description": "Naturally fractured reservoir",
                "characteristics": [
                    "Early: Radial flow in fractures",
                    "Middle: Transition (dip in derivative)",
                    "Late: Radial flow in system"
                ]
            }
        ],
        "flow_regimes": [
            {"name": "wellbore_storage", "slope": 1, "description": "Wellbore storage dominant"},
            {"name": "radial_flow", "slope": 0, "description": "Infinite acting radial flow"},
            {"name": "linear_flow", "slope": 0.5, "description": "Linear flow (fracture or channel)"},
            {"name": "bilinear_flow", "slope": 0.25, "description": "Bilinear flow (finite conductivity fracture)"},
            {"name": "boundary", "slope": ">1", "description": "Boundary effect"}
        ],
        "references": [
            "Horne, R. N. (1995). Modern Well Test Analysis. PetroSkills.",
            "Van Everdingen, A. F., & Hurst, W. (1949). The Application of the Laplace Transformation to Flow Problems in Reservoirs. JPT."
        ]
    }
