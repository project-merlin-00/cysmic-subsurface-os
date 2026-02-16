"""
Material Balance API Endpoints for CYSMIC Subsurface OS
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from ...services.material_balance import (
    calculate_gas_solubility,
    calculate_oil_fvf,
    calculate_gas_z_factor,
    p_over_z_analysis,
    diagnose_drive_mechanism,
    material_balance_analysis,
    calculate_recovery_efficiency,
    MaterialBalanceParameters,
    ProductionData,
    DriveMechanism
)


router = APIRouter(prefix="/material-balance", tags=["material-balance"])


class FluidPropertiesRequest(BaseModel):
    """Calculate fluid properties"""
    pressure: float  # psia
    temperature: float  # Fahrenheit
    api_gravity: float  # API
    gas_specific_gravity: float  # dimensionless
    bubble_point_pressure: Optional[float] = None  # psia


class MaterialBalanceRequest(BaseModel):
    """Request for material balance analysis"""
    # Production data
    time: List[float]  # days
    oil_cumulative: List[float]  # stb
    gas_cumulative: List[float]  # scf
    water_cumulative: List[float]  # stb
    pressure: List[float]  # psia
    
    # Reservoir parameters
    initial_pressure: float
    bubble_point_pressure: float
    oil_api_gravity: float
    gas_specific_gravity: float
    gas_solubility: float
    oil_compressibility: float
    water_compressibility: float
    rock_compressibility: float
    porosity: float
    thickness: float
    area: float


class PZAnalysisRequest(BaseModel):
    """Request for p/z analysis"""
    pressure: List[float]  # psia
    cumulative_gas_production: List[float]  # scf
    initial_pressure: float  # psia
    gas_specific_gravity: float = 0.75
    temperature: float = 150  # Fahrenheit


class DriveMechanismRequest(BaseModel):
    """Request for drive mechanism diagnosis"""
    time: List[float]
    oil_cumulative: List[float]
    gas_cumulative: List[float]
    water_cumulative: List[float]
    pressure: List[float]
    initial_pressure: float
    bubble_point_pressure: float
    water_cut: Optional[List[float]] = None


@router.post("/fluid-properties")
async def get_fluid_properties(request: FluidPropertiesRequest) -> dict:
    """
    Calculate fluid properties at given conditions
    
    Returns:
    - Gas solubility (Rs)
    - Oil FVF (Bo)
    - Gas Z-factor (if gas reservoir)
    """
    try:
        pb = request.bubble_point_pressure or request.pressure * 1.5  # Estimate if not provided
        
        Rs = calculate_gas_solubility(request.pressure, pb, request.api_gravity)
        Bo = calculate_oil_fvf(request.pressure, pb, Rs, request.api_gravity)
        
        return {
            "pressure": request.pressure,
            "temperature": request.temperature,
            "gas_solubility_rs": Rs,
            "oil_fvf_bo": Bo,
            "gas_z_factor": None,  # Would calculate if gas
            "bubble_point": pb,
            "undersaturated": request.pressure > pb
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/analyze")
async def analyze_material_balance(request: MaterialBalanceRequest) -> dict:
    """
    Perform material balance analysis
    
    Diagnoses drive mechanism and calculates:
    - Original oil in place (OOIP)
    - Original gas in place (OGIP)
    - Energy index
    - p/z data for gas reservoirs
    """
    try:
        # Prepare production data
        prod_data = ProductionData(
            time=request.time,
            oil_cumulative=request.oil_cumulative,
            gas_cumulative=request.gas_cumulative,
            water_cumulative=request.water_cumulative,
            pressure=request.pressure
        )
        
        # Prepare parameters
        params = MaterialBalanceParameters(
            initial_pressure=request.initial_pressure,
            bubble_point_pressure=request.bubble_point_pressure,
            oil_api_gravity=request.oil_api_gravity,
            gas_specific_gravity=request.gas_specific_gravity,
            gas_solubility=request.gas_solubility,
            oil_compressibility=request.oil_compressibility,
            water_compressibility=request.water_compressibility,
            rock_compressibility=request.rock_compressibility,
            porosity=request.porosity,
            thickness=request.thickness,
            area=request.area,
            water_cut=None
        )
        
        # Run analysis
        result = material_balance_analysis(prod_data, params)
        
        return {
            "drive_mechanism": result.drive_mechanism,
            "original_oil_in_place": result.original_oil_in_place,
            "original_gas_in_place": result.original_gas_in_place,
            "energy_index": result.energy_index,
            "drive_indicators": result.drive_indicators,
            "p_over_z_data": result.p_over_z_data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/p-over-z")
async def analyze_pz(request: PZAnalysisRequest) -> dict:
    """
    Perform p/z analysis for gas reservoirs
    
    For gas reservoirs: p/z vs Gp is linear
    Slope gives OGIP
    """
    try:
        result = p_over_z_analysis(
            pressure=request.pressure,
            cumulative_gas_production=request.cumulative_gas_production,
            initial_pressure=request.initial_pressure,
            gamma_g=request.gas_specific_gravity,
            T=request.temperature
        )
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/drive-mechanism")
async def diagnose_drive(request: DriveMechanismRequest) -> dict:
    """
    Diagnose dominant reservoir drive mechanism
    
    Drive mechanisms:
    - Solution Gas Drive: Primary depletion
    - Gas Cap Drive: Gas cap expansion
    - Water Drive: Aquifer support
    - Combination: Multiple mechanisms
    """
    try:
        # Prepare production data
        prod_data = ProductionData(
            time=request.time,
            oil_cumulative=request.oil_cumulative,
            gas_cumulative=request.gas_cumulative,
            water_cumulative=request.water_cumulative,
            pressure=request.pressure
        )
        
        # Prepare parameters
        params = MaterialBalanceParameters(
            initial_pressure=request.initial_pressure,
            bubble_point_pressure=request.bubble_point_pressure,
            oil_api_gravity=30,  # Default
            gas_specific_gravity=0.75,  # Default
            gas_solubility=500,  # Default
            oil_compressibility=1e-5,  # Default
            water_compressibility=3e-6,  # Default
            rock_compressibility=4e-6,  # Default
            porosity=0.2,  # Default
            thickness=50,  # Default
            area=1000,  # Default
            water_cut=request.water_cut
        )
        
        result = diagnose_drive_mechanism(prod_data, params)
        
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/recovery-efficiency")
async def get_recovery_efficiency(
    drive_mechanism: str,
    reservoir_pressure: float,
    bubble_point_pressure: float,
    water_saturation: float = 0.3
) -> dict:
    """
    Estimate recovery efficiency based on drive mechanism
    
    Returns expected recovery factor as percentage
    """
    try:
        rf = calculate_recovery_efficiency(
            drive_mechanism=drive_mechanism,
            reservoir_pressure=reservoir_pressure,
            bubble_point_pressure=bubble_point_pressure,
            water_saturation=water_saturation
        )
        
        descriptions = {
            "solution_gas": "Solution gas drive - relies on gas expansion as pressure drops. Typically 5-25% recovery.",
            "gas_cap": "Gas cap drive - gas cap expansion provides energy. Higher oil recovery than solution gas.",
            "water_drive": "Water drive - aquifer provides pressure support. Highest recovery (30-60%).",
            "combination": "Combination drive - multiple mechanisms working together. Good recovery potential."
        }
        
        return {
            "recovery_factor": rf,
            "recovery_percent": rf * 100,
            "drive_mechanism": drive_mechanism,
            "description": descriptions.get(drive_mechanism, "Unknown drive mechanism")
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/models")
async def get_material_balance_models():
    """
    Get available material balance models and drive mechanisms
    """
    return {
        "drive_mechanisms": [
            {
                "name": "solution_gas",
                "description": "Solution Gas Drive (Depletion Drive)",
                "recovery": "5-25%",
                "characteristics": [
                    "Rapid pressure decline",
                    "GOR increases as gas is released from oil",
                    "Oil production declines rapidly",
                    "No external energy support"
                ]
            },
            {
                "name": "gas_cap",
                "description": "Gas Cap Drive",
                "recovery": "20-40%",
                "characteristics": [
                    "Pressure maintained by expanding gas cap",
                    "High GOR due to gas cap gas production",
                    "Oil production relatively stable",
                    "Gas cap visible on seismic/logs"
                ]
            },
            {
                "name": "water_drive",
                "description": "Water Drive",
                "recovery": "30-60%",
                "characteristics": [
                    "Strong pressure support from aquifer",
                    "Water production increases over time",
                    "Pressure relatively stable",
                    "Aquifer characterization important"
                ]
            },
            {
                "name": "combination",
                "description": "Combination Drive",
                "recovery": "25-45%",
                "characteristics": [
                    "Multiple mechanisms active",
                    "Complex behavior",
                    "Depends on aquifer and fluid properties"
                ]
            }
        ],
        "methods": [
            {
                "name": "havlena_odeh",
                "description": "Straight line method for OOIP estimation",
                "equation": "F = N * Eo + N * m * Bti * Eg + We - Wp * Bw"
            },
            {
                "name": "p_over_z",
                "description": "p/z analysis for gas reservoirs",
                "equation": "p/z = pi/zi * (1 - Gp/G)"
            },
            {
                "name": "campbell",
                "description": "Campbell plot for drive mechanism diagnosis"
            }
        ],
        "references": [
            "Dake, L. P. (1978). Fundamentals of Reservoir Engineering. Elsevier.",
            "Havlena, D., & Odeh, A. S. (1963). The Material Balance as an Equation of a Straight Line. JPT."
        ]
    }
