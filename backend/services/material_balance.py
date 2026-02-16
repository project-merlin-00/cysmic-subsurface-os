"""
Material Balance - Reservoir Energy Analysis
For CYSMIC Subsurface OS

References:
- Dake, L. P. (1978). Fundamentals of Reservoir Engineering. Elsevier.
- Havlena, D., & Odeh, A. S. (1963). The Material Balance as an Equation of a 
  Straight Line. JPT.
"""

import numpy as np
from typing import Optional, List, Tuple
from pydantic import BaseModel
from enum import Enum
from scipy import optimize


class DriveMechanism(str, Enum):
    """Reservoir drive mechanisms"""
    SOLUTION_GAS = "solution_gas"
    GAS_CAP = "gas_cap"
    WATER_DRIVE = "water_drive"
    COMBINATION = "combination"
    COMPACTION = "compaction"


class MaterialBalanceParameters(BaseModel):
    """Input parameters for material balance"""
    initial_pressure: float  # psia
    bubble_point_pressure: float  # psia
    oil_api_gravity: float  # API
    gas_specific_gravity: float  # dimensionless
    gas_solubility: float  # scf/stb (Rs at initial conditions)
    oil_compressibility: float  # 1/psi
    water_compressibility: float  # 1/psi
    rock_compressibility: float  # 1/psi
    porosity: float  # fraction
    thickness: float  # ft
    area: float  # acres
    water_cut: Optional[List[float]] = None  # fraction
    water_production: Optional[List[float]] = None  # stb/d
    initial_gas_cap_size: Optional[float] = None  # fraction of oil volume


class MaterialBalanceResult(BaseModel):
    """Results from material balance analysis"""
    drive_mechanism: str
    original_gas_in_place: Optional[float]  # scf
    original_oil_in_place: Optional[float]  # stb
    energy_index: float  # dimensionless
    water_influx: Optional[float] = None  # bbl
    drive_indicators: dict
    p_over_z_data: Optional[List[dict]] = None


class ProductionData(BaseModel):
    """Production history data"""
    time: List[float]  # days
    oil_cumulative: List[float]  # stb
    gas_cumulative: List[float]  # scf
    water_cumulative: List[float]  # stb
    pressure: List[float]  # psia


def calculate_oil_compressibility(api_gravity: float, pressure: float, pb: float) -> float:
    """
    Estimate oil compressibility
    
    co = (5.0 + 8.0 * Rs) / (10^6 * Bo * p) for p > pb (undersaturated)
    """
    # Simplified estimation
    co = 1e-6  # Typical value 1-5e-6
    return co


def calculate_gas_solubility(p: float, pb: float, api: float) -> float:
    """
    Estimate gas solubility (Rs) using Standing correlation
    
    Rs = γg * ((p / 18.2 + 1.4), 0.83) * 10^(0.00091*T - 0.0125*API)
    """
    # Simplified - assume T = 150°F
    T = 150
    if p <= pb:
        Rs = 0.00091 * T - 0.0125 * api
        Rs = np.power(10, Rs) * ((p / 18.2 + 1.4) ** 0.83)
    else:
        Rs = 0.00091 * T - 0.0125 * api
        Rs = np.power(10, Rs) * ((pb / 18.2 + 1.4) ** 0.83)
    
    return max(Rs, 0)


def calculate_oil_fvf(p: float, pb: float, Rs: float, api: float) -> float:
    """
    Calculate oil Formation Volume Factor (Bo) using Standing correlation
    
    Bo = 0.9759 + 0.00012 * (Rs + 1.25*T)^1.2
    """
    # Simplified - assume T = 150°F, P = 1000 psia
    T = 150
    if p >= pb:
        Bo = 0.9759 + 0.00012 * ((Rs + 1.25 * T) ** 1.2)
    else:
        # Below bubble point - solution gas evolves
        Bo = 0.9759 + 0.00012 * ((Rs + 1.25 * T) ** 1.2) - 0.000001 * (pb - p)
    
    return max(Bo, 1.0)


def calculate_gas_z_factor(p: float, T: float, gamma_g: float) -> float:
    """
    Calculate gas compressibility factor (Z-factor)
    
    Using simplified Papay correlation:
    Z = 1 - 3.52 * p / (T^0.815 * 10^(3.9*γg)) + 0.049 * (p / (T^0.815 * 10^(3.9*γg)))^2
    """
    # T in Rankine
    T_rankine = T + 460
    
    pr = p / (10.4 + 0.1 * T_rankine)  # Pseudo-reduced pressure
    
    # Simplified Z calculation
    z = 1 - 3.52 * p / (T_rankine ** 0.815 * 10 ** (3.9 * gamma_g))
    z += 0.049 * (p / (T_rankine ** 0.815 * 10 ** (3.9 * gamma_g))) ** 2
    
    return max(z, 0.7)


def material_balance_line(
    N: float,  # Original oil in place (stb)
    m: float,  # Gas cap ratio
    Bti: float,  # Initial total formation volume factor
    Bgi: float,  # Initial gas FVF
    We: float,  # Water influx
    Bw: float,  # Water FVF
    Np: float,  # Cumulative oil production
    Gp: float,  # Cumulative gas production
    Wp: float,  # Cumulative water production
    Bo: float,  # Oil FVF
    Bg: float,  # Gas FVF
    Rs: float,  # Solution gas-oil ratio
    Rsi: float  # Initial solution GOR
) -> float:
    """
    Material balance equation (Havlena-Odeh form):
    
    F = N * (Bt - Bti) + N * m * Bti * (Bgi/Bg - 1) + We - Wp*Bw
    
    where F = Np * Bo + (Gp - Np*Rs) * Bg
    
    Returns the left-hand side (F) minus right-hand side terms
    """
    # Underground withdrawal
    F = Np * Bo + (Gp - Np * Rs) * Bg
    
    # Oil expansion term
    Eo = Bo - Bti
    
    # Gas cap expansion term
    Eg = Bgi / Bg - 1
    Eg_val = m * Bti * Eg
    
    # Water influx term
    Ew = We - Wp * Bw
    
    # Material balance: F = N * Eo + N * m * Bti * Eg + We - Wp * Bw
    # Rearranged: F - N * Eo = N * m * Bti * Eg + We - Wp * Bw
    
    return F - N * Eo


def p_over_z_analysis(
    pressure: List[float],
    cumulative_gas_production: List[float],
    initial_pressure: float,
    gamma_g: float = 0.75,
    T: float = 150
) -> dict:
    """
    p/z analysis for gas reservoir depletion
    
    For gas reservoirs, p/z vs Gp is approximately linear:
    p/z = pi/zi * (1 - Gp/G)
    
    This gives original gas in place (OGIP)
    """
    p_z_data = []
    ogip = None
    
    for i, (p, Gp) in enumerate(zip(pressure, cumulative_gas_production)):
        # Calculate Z factor
        z = calculate_gas_z_factor(p, T, gamma_g)
        
        # Calculate p/z
        pz = p / z if z > 0 else 0
        
        p_z_data.append({
            "pressure": p,
            "z_factor": z,
            "p_over_z": pz,
            "cumulative_gas": Gp
        })
    
    # Linear regression for OGIP
    if len(p_z_data) > 2:
        pz_values = [d["p_over_z"] for d in p_z_data]
        Gp_values = [d["cumulative_gas"] for d in p_z_data]
        
        # p/z = pi/zi - (pi/zi/G) * Gp
        # Linear fit: y = mx + c
        m, c = np.polyfit(Gp_values, pz_values, 1)
        
        # OGIP = -c / m
        if m < 0:
            ogip = -c / m
    
    return {
        "p_z_data": p_z_data,
        "original_gas_in_place": ogip,
        "initial_p_over_z": p_z_data[0]["p_over_z"] if p_zip_data else None,
        "current_p_over_z": p_z_data[-1]["p_over_z"] if p_z_data else None,
        "recovery_factor": Gp_values[-1] / ogip if ogip and ogip > 0 and len(Gp_values) > 0 else None
    }


def diagnose_drive_mechanism(
    production_data: ProductionData,
    params: MaterialBalanceParameters
) -> dict:
    """
    Diagnose dominant drive mechanism using material balance indicators
    
    Indicators:
    - Solution Gas Drive: Pressure drops rapidly, GOR increases
    - Gas Cap Drive: Pressure stable, GOR high, oil production declines
    - Water Drive: Pressure stable, water production increases
    """
    # Extract data
    pressure = np.array(production_data.pressure)
    Np = np.array(production_data.oil_cumulative)
    Gp = np.array(production_data.gas_cumulative)
    Wp = np.array(production_data.water_cumulative)
    
    # Calculate GOR
    GOR = np.zeros(len(Np))
    for i in range(1, len(Np)):
        if Np[i] - Np[i-1] > 0:
            GOR[i] = (Gp[i] - Gp[i-1]) / (Np[i] - Np[i-1])
    
    # Calculate pressure drop rate
    p_drop = pressure[0] - pressure[-1]
    p_rate = p_drop / len(pressure)
    
    # Calculate water cut trend
    if params.water_cut:
        wc_trend = np.polyfit(range(len(params.water_cut)), params.water_cut, 1)[0]
    else:
        wc_trend = 0
    
    # Drive mechanism indicators
    indicators = {
        "pressure_decline_rate": p_rate,
        "gor_trend": np.polyfit(range(len(GOR)), GOR, 1)[0] if len(GOR) > 2 else 0,
        "water_cut_trend": wc_trend,
        "final_gor": GOR[-1] if len(GOR) > 0 else 0,
        "initial_pressure": params.initial_pressure,
        "final_pressure": pressure[-1],
        "pressure_retained": pressure[-1] / params.initial_pressure
    }
    
    # Determine dominant drive
    pressure_retained = pressure[-1] / params.initial_pressure
    
    if pressure_retained > 0.9:
        # High pressure retention indicates strong water drive
        if wc_trend > 0.01:
            dominant = DriveMechanism.WATER_DRIVE
            confidence = "high"
        else:
            dominant = DriveMechanism.GAS_CAP
            confidence = "medium"
    elif pressure_retained > 0.7:
        # Moderate pressure retention - combination drive
        dominant = DriveMechanism.COMBINATION
        confidence = "medium"
    else:
        # Low pressure - solution gas drive
        dominant = DriveMechanism.SOLUTION_GAS
        confidence = "high"
    
    # Energy index (ratio of actual to volumetric drive expected)
    # Higher values indicate strong water/gas cap support
    if params.initial_pressure > params.bubble_point_pressure:
        # Undersaturated - expect solution gas drive with water expansion
        expected_drop = (params.initial_pressure - params.bubble_point_pressure) * 0.5
        energy_index = (expected_drop - p_rate * len(pressure)) / expected_drop if expected_drop > 0 else 1.0
    else:
        # Saturated - compare to pure solution gas drive
        expected_p_drop = params.initial_pressure * 0.5  # Typical for solution gas
        energy_index = 1 - (params.initial_pressure - pressure[-1]) / expected_p_drop if expected_p_drop > 0 else 1.0
    
    return {
        "dominant_drive": dominant.value,
        "confidence": confidence,
        "indicators": indicators,
        "energy_index": energy_index,
        "estimated_ogip": None,  # Would require full MBE calculation
        "estimated_oil_in_place": None
    }


def material_balance_analysis(
    production_data: ProductionData,
    params: MaterialBalanceParameters
) -> MaterialBalanceResult:
    """
    Perform material balance analysis
    
    1. Diagnose drive mechanism
    2. Calculate OOIP using different methods
    3. Generate p/z plot data for gas
    """
    # Diagnose drive mechanism
    drive_result = diagnose_drive_mechanism(production_data, params)
    
    # For oil reservoirs - use Havlena-Odeh straight line method
    if len(production_data.oil_cumulative) > 5:
        # Simplified OOIP estimation
        p_initial = params.initial_pressure
        p_current = production_data.pressure[-1]
        Np = production_data.oil_cumulative[-1]
        
        # Bo from compressibility
        Bo = 1.2  # Assume
        co = params.oil_compressibility
        
        # Simplified: N = Np * Bo / (Bo * co * Δp)
        # This is very rough - proper calculation needs fluid properties
        dp = p_initial - p_current
        if dp > 0:
            N_estimated = Np / (co * dp)
        else:
            N_estimated = None
        
        N = N_estimated
    else:
        N = None
    
    # OGIP calculation for gas
    ogip = None
    pz_data = None
    
    # Check if this looks like gas production
    if len(production_data.gas_cumulative) > 0:
        gas_prod = production_data.gas_cumulative[-1]
        if gas_prod > 0:
            # Try p/z analysis
            pz_result = p_over_z_analysis(
                production_data.pressure,
                production_data.gas_cumulative,
                params.initial_pressure,
                params.gas_specific_gravity
            )
            ogip = pz_result.get("original_gas_in_place")
            pz_data = pz_result.get("p_z_data")
    
    return MaterialBalanceResult(
        drive_mechanism=drive_result["dominant_drive"],
        original_gas_in_place=ogip,
        original_oil_in_place=N,
        energy_index=drive_result["energy_index"],
        drive_indicators=drive_result["indicators"],
        p_over_z_data=pz_data
    )


def calculate_recovery_efficiency(
    drive_mechanism: str,
    reservoir_pressure: float,
    bubble_point_pressure: float,
    water_saturation: float = 0.3
) -> float:
    """
    Estimate recovery efficiency based on drive mechanism
    
    Typical recovery factors:
    - Solution Gas Drive: 5-25% (avg 15%)
    - Gas Cap Drive: 20-40% (avg 30%)
    - Water Drive: 30-60% (avg 45%)
    - Combination: 25-45% (avg 35%)
    """
    base_recovery = {
        DriveMechanism.SOLUTION_GAS.value: 0.15,
        DriveMechanism.GAS_CAP.value: 0.30,
        DriveMechanism.WATER_DRIVE.value: 0.45,
        DriveMechanism.COMBINATION.value: 0.35
    }.get(drive_mechanism, 0.20)
    
    # Adjust based on pressure
    if reservoir_pressure > bubble_point_pressure:
        # Undersaturated - water drive less effective
        pressure_factor = 0.8
    else:
        # Saturated - full drive mechanism active
        pressure_factor = 1.0
    
    # Adjust for water saturation (higher Sw = lower recovery)
    sw_factor = 1 - 0.3 * water_saturation
    
    return base_recovery * pressure_factor * sw_factor
