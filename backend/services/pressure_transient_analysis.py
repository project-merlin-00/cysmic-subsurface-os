"""
Pressure Transient Analysis - Well Test Analysis
For CYSMIC Subsurface OS

References:
- Horne, R. N. (1995). Modern Well Test Analysis. PetroSkills.
- Van Everdingen, A. F., & Hurst, W. (1949). The Application of the Laplace
  Transformation to Flow Problems in Reservoirs. JPT.
"""

import numpy as np
from typing import Optional, List, Tuple
from pydantic import BaseModel
from enum import Enum
from scipy import special, integrate


class WellType(str, Enum):
    """Well types for pressure transient analysis"""
    VERTICAL = "vertical"
    HORIZONTAL = "horizontal"
    FRACTURED = "fractured"
    MULTI_FRACTURED = "multi_fractured"


class ReservoirModel(str, Enum):
    """Reservoir models for type curve matching"""
    HOMOGENEOUS = "homogeneous"
    DOUBLE_PERMEABILITY = "double_permeability"
    NATURAL_FRACTURED = "natural_fractured"
    BOUNDED = "bounded"
    CONSTANT_PRESSURE = "constant_pressure"


class PressureData(BaseModel):
    """Pressure test data"""
    time: List[float]  # hours
    pressure: List[float]  # psia
    flow_rate: Optional[List[float]] = None  # stb/d


class WellTestParameters(BaseModel):
    """Parameters for well test analysis"""
    well_radius: float = 0.25  # ft
    porosity: float = 0.20  # fraction
    thickness: float = 50  # ft
    viscosity: float = 2.0  # cp
    compressibility: float = 1.5e-5  # 1/psi
    rate: float = 100  # stb/d
    skin: float = 0  # dimensionless


class WellTestResult(BaseModel):
    """Results from well test analysis"""
    permeability: float  # md
    skin: float  # dimensionless
    reservoir_pressure: float  # psia
    flow_capacity: float  # md*ft
    storativity_ratio: float  # dimensionless
    storativity: float  # dimensionless
    boundary_distance: Optional[float] = None  # ft
    model: str
    diagnostics: Optional[dict] = None


def calculate_pressure_diffusion(porosity: float, viscosity: float, compressibility: float, perm: float) -> float:
    """
    Calculate hydraulic diffusivity
    
    η = k / (φ * μ * ct)
    
    Returns diffusivity in ft²/hr
    """
    return perm / (porosity * viscosity * compressibility)


def infinite_acting_line_source_solution(t: np.ndarray, perm: float, porosity: float, 
                                         viscosity: float, compressibility: float,
                                         rw: float, q: float, B: float = 1.2) -> np.ndarray:
    """
    Infinite acting line source solution (EI function)
    
    Used for early-time pressure response
    
    pD = -Ei(-rD²/4tD)
    
    For small values: pD ≈ 0.5 * (ln(4tD/rD²) - γ)
    """
    # Calculate dimensionless time
    diffusivity = calculate_pressure_diffusion(porosity, viscosity, compressibility, perm)
    td = diffusivity * t / (rw ** 2)
    
    # For small arguments, use approximation
    pd = np.zeros_like(td)
    
    # Use exponential integral approximation
    for i, tdi in enumerate(td):
        if tdi < 0.01:
            # Very early time - use approximation
            pd[i] = 0.5 * (np.log(4 * tdi) - 0.5772)
        elif tdi > 100:
            # Late time - pseudo-steady state
            pd[i] = 0.5 * np.log(tdi) + 0.809  # +0.5*ln(2.2458)
        else:
            # Use exponential integral
            x = 1 / (4 * tdi)
            pd[i] = -0.5 * special.expn(1, x)
    
    # Convert to dimensional pressure
    # pD = (k * h * Δp) / (70.6 * q * μ * B)
    h = 50  # assume thickness
    delta_p = pd * 70.6 * q * viscosity * B / (perm * h)
    
    return delta_p


def exponential_integral(x: float, n: int = 1) -> float:
    """
    Exponential integral En(x) = ∫₁^∞ exp(-x*t) / t^n dt
    """
    return special.expn(n, x)


def calculate_derivative(time: np.ndarray, pressure: np.ndarray, delta_t_shift: float = 0.1) -> np.ndarray:
    """
    Calculate pressure derivative for diagnostics
    
    Uses the Bourdet derivative method:
    tD * pD' = (t2*p' - t1*p') / (t2 - t1)
    
    The derivative helps identify:
    - Homogeneous reservoir: unit slope
    - Wellbore storage: 45° slope
    - Fracture: 1/2 slope
    - Boundary: upward turn
    """
    # Use log-log derivative
    log_time = np.log10(time)
    log_pressure = np.log10(np.abs(np.diff(pressure)))
    
    # Calculate derivative using finite differences
    derivative = np.gradient(pressure, time)
    
    # Convert to dimensionless form for diagnostics
    # t * dp/dt normalized by pressure change
    t_dp_dt = time * derivative
    
    # Normalize by pressure
    with np.errstate(divide='ignore', invalid='ignore'):
        deriv_normalized = t_dp_dt / (pressure + 1e-10)
    
    return deriv_normalized


def diagnose_regime(time: np.ndarray, pressure: np.ndarray, derivative: np.ndarray) -> dict:
    """
    Diagnose flow regimes from pressure and derivative data
    
    Returns identified regimes and their start times
    """
    regimes = []
    
    # Calculate slopes in log-log space
    log_time = np.log10(time[1:])
    log_deriv = np.log10(np.abs(derivative[1:]) + 1e-10)
    
    if len(log_time) > 5:
        # Early time - wellbore storage (unit slope)
        early_slope = (log_deriv[3] - log_deriv[0]) / (log_time[3] - log_time[0])
        if 0.8 < early_slope < 1.2:
            regimes.append({
                "regime": "wellbore_storage",
                "slope": early_slope,
                "description": "Wellbore storage dominant"
            })
        
        # Middle time - radial flow (unit slope on derivative)
        mid_slope = (log_deriv[-3] - log_deriv[3]) / (log_time[-3] - log_time[3])
        if 0.8 < mid_slope < 1.2:
            regimes.append({
                "regime": "radial_flow",
                "slope": mid_slope,
                "description": "Infinite acting radial flow"
            })
        
        # Late time - boundary effects
        if len(log_time) > 10:
            late_slope = (log_deriv[-1] - log_deriv[-5]) / (log_time[-1] - log_time[-5])
            if late_slope > 1.5:
                regimes.append({
                    "regime": "boundary",
                    "slope": late_slope,
                    "description": "Boundary detected"
                })
    
    return {
        "identified_regimes": regimes,
        "diagnostics": {
            "early_slope": early_slope if len(log_time) > 5 else None,
            "mid_slope": mid_slope if len(log_time) > 10 else None,
            "late_slope": late_slope if len(log_time) > 10 else None
        }
    }


def semilog_analysis(time: np.ndarray, pressure: np.ndarray, q: float, 
                    mu: float, B: float, phi: float, ct: float, rw: float) -> Tuple[float, float]:
    """
    Semilog analysis for permeability and skin
    
    Uses the Horner plot method:
    p = m * log(t) + c
    
    where m = 162.6 * q * μ * B / (k * h)
    
    Returns: (permeability, skin_factor)
    """
    # Use late-time data (radial flow regime)
    late_idx = len(time) // 2
    
    # Linear regression on semilog plot
    log_time = np.log10(time[late_idx:])
    p = pressure[late_idx:]
    
    # Fit line: p = m * log(t) + c
    m, c = np.polyfit(log_time, p, 1)
    
    # Permeability from slope
    # m = 162.6 * q * μ * B / (k * h)
    # k = 162.6 * q * μ * B / (m * h)
    h = 50  # assume thickness
    k = 162.6 * q * mu * B / (m * h)
    
    # Extrapolate to infinite time (p* = c)
    p_star = c
    
    # Skin factor
    # s = 1.151 * [(p_1hr - p_start) / m - log(k / (φ * μ * ct * rw²)) + 3.23]
    p_1hr = m * np.log10(1) + c
    k_1hr = 1  # Use 1 md as reference
    
    # Simplified skin calculation
    # For a proper calculation, we need the initial pressure
    p_initial = pressure[0]
    
    term1 = (p_initial - p_1hr) / m
    term2 = np.log10(k / (phi * mu * ct * rw**2))
    s = 1.151 * (term1 - term2 + 3.23)
    
    return max(0.01, k), max(-5, min(50, s))


def mrst_pressure_solution(t: np.ndarray, k: float, phi: float, mu: float, 
                          ct: float, rw: float, s: float = 0) -> np.ndarray:
    """
    Modified Ramey's (MRST) solution including skin
    
    More accurate than line source for finite wells
    """
    # Dimensionless time
    eta = k / (phi * mu * ct)
    td = eta * t / rw**2
    
    # Dimensionless radius (approximation for finite well)
    rd = 1  # wellbore radius
    
    # Calculate pressure with skin
    # For small times, use line source
    pd_early = np.zeros_like(td)
    pd_late = np.zeros_like(td)
    
    for i, tdi in enumerate(td):
        if tdi < 0.01:
            pd_early[i] = 0.5 * (np.log(4 * tdi / np.e) + 2*s)
        elif tdi > 100:
            pd_late[i] = 0.5 * (np.log(tdi) + 0.809 + 2*s)
        else:
            x = 1 / (4 * tdi)
            pd_early[i] = -0.5 * special.expn(1, x) + s
    
    pd = np.where(td < 1, pd_early, pd_late)
    
    return pd


def type_curve_match(measured_pressure: np.ndarray, measured_time: np.ndarray,
                   theoretical_curves: dict) -> dict:
    """
    Match measured data to type curves
    
    Returns best match parameters
    """
    best_match = None
    best_error = float('inf')
    
    for model_name, curve_data in theoretical_curves.items():
        # Calculate error (simplified)
        # In practice, use more sophisticated matching
        error = np.sum((measured_pressure[:len(curve_data['pressure'])] - curve_data['pressure'])**2)
        
        if error < best_error:
            best_error = error
            best_match = model_name
    
    return {
        "best_match": best_match,
        "error": best_error,
        "model": best_match
    }


def generate_type_curve_data(model: str, params: dict, n_points: int = 100) -> dict:
    """
    Generate theoretical type curve data
    
    Common type curves:
    - Homogeneous (infinite)
    - Finite conductivity fracture
    - Dual porosity
    """
    t = np.logspace(-1, 4, n_points)
    
    if model == "homogeneous":
        # Unit slope early, flat late
        pd = 0.5 * (np.log(t) + 0.809)
        pd_deriv = np.ones_like(t)  # Derivative is flat in radial flow
        
    elif model == "fracture":
        # Half-slope early (linear flow)
        pd = np.sqrt(np.pi * t) / 2
        pd_deriv = 0.5 * np.sqrt(np.pi / t)  # Half slope
        
    elif model == "dual_porosity":
        # Transition period on derivative
        pd = 0.5 * (np.log(t) + 0.809)
        # Add characteristic "W" shape for dual porosity
        omega = params.get('storativity_ratio', 0.01)
        pd_deriv = 1 + omega * np.sin(np.log(t) * 2)
        
    else:
        pd = 0.5 * (np.log(t) + 0.809)
        pd_deriv = np.ones_like(t)
    
    return {
        "time": t.tolist(),
        "pressure": pd.tolist(),
        "derivative": pd_deriv.tolist()
    }


def well_test_analysis(pressure_data: PressureData, 
                      well_params: WellTestParameters,
                      B: float = 1.2) -> WellTestResult:
    """
    Perform complete well test analysis
    
    1. Calculate pressure derivative
    2. Diagnose flow regimes
    3. Calculate reservoir parameters
    4. Match type curves
    """
    time = np.array(pressure_data.time)
    pressure = np.array(pressure_data.pressure)
    
    # Calculate derivative
    derivative = calculate_derivative(time, pressure)
    
    # Diagnose regimes
    diagnostics = diagnose_regime(time, pressure, derivative)
    
    # Semilog analysis for permeability and skin
    k, skin = semilog_analysis(
        time, pressure,
        well_params.rate,
        well_params.viscosity,
        B,
        well_params.porosity,
        well_params.compressibility,
        well_params.well_radius
    )
    
    # Estimate initial/reservoir pressure
    # Use late-time extrapolation
    late_idx = len(pressure) * 3 // 4
    log_time = np.log10(time[late_idx:])
    p_late = pressure[late_idx:]
    m, c = np.polyfit(log_time, p_late, 1)
    p_star = c  # Extrapolation to infinite time
    
    # Flow capacity
    flow_capacity = k * well_params.thickness
    
    return WellTestResult(
        permeability=k,
        skin=skin,
        reservoir_pressure=p_star,
        flow_capacity=flow_capacity,
        storativity_ratio=0.01,  # Default
        storativity=well_params.porosity * well_params.compressibility * well_params.thickness,
        model=diagnostics.get("identified_regimes", [{"regime": "radial_flow"}])[0].get("regime", "homogeneous"),
        diagnostics=diagnostics
    )
