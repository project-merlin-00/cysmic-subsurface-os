"""
Volumetric Analysis - Monte Carlo Simulation for STOIIP
For CYSMIC Subsurface OS

STOIIP = 7758 * A * h * φ * (1-Sw) / Bo

References:
- Dake, L. P. (1978). Fundamentals of Reservoir Engineering. Elsevier.
"""

import numpy as np
from typing import Optional, List


class DistributionType(str, Enum):
    """Probability distribution types for Monte Carlo"""
    NORMAL = "normal"
    LOG_NORMAL = "lognormal"
    TRIANGLE = "triangle"
    UNIFORM = "uniform"


class VolumetricParameters(BaseModel):
    """Input parameters for volumetric calculation"""
    area: float  # acres
    thickness: float  # ft
    porosity: float  # fraction
    water_saturation: float  # fraction
    oil_fvf: float  # rbbl/stb
    area_std: Optional[float] = None  # Standard deviation for Monte Carlo
    thickness_std: Optional[float] = None
    porosity_std: Optional[float] = None
    water_saturation_std: Optional[float] = None
    oil_fvf_std: Optional[float] = None


class VolumetricResult(BaseModel):
    """Results from volumetric calculation"""
    stoiip: float  # STOIIP in stock tank barrels
    stoiip_p10: float  # P10 (high estimate)
    stoiip_p50: float  # P50 (median)
    stoiip_p90: float  # P90 (low estimate)
    mean: float
    std: float
    samples: Optional[List[float]] = None
    distribution_type: str


class MonteCarloSimulation(BaseModel):
    """Monte Carlo simulation parameters"""
    n_iterations: int = 10000
    seed: Optional[int] = None
    parameters: VolumetricParameters


def calculate_stoiip_deterministic(params: VolumetricParameters) -> float:
    """
    Calculate STOIIP using deterministic approach
    
    STOIIP = 7758 * A * h * φ * (1-Sw) / Bo
    
    Parameters:
    - A: drainage area (acres)
    - h: net thickness (ft)
    - φ: porosity (fraction)
    - Sw: water saturation (fraction)
    - Bo: oil formation volume factor (rbbl/stb)
    
    Returns:
    - STOIIP in stock tank barrels (stb)
    """
    stoiip = 7758 * params.area * params.thickness * params.porosity * (1 - params.water_saturation) / params.oil_fvf
    return stoiip


def run_monte_carlo_simulation(params: VolumetricParameters, n_iterations: int = 10000, seed: Optional[int] = None) -> VolumetricResult:
    """
    Run Monte Carlo simulation for STOIIP uncertainty analysis
    
    Uses log-normal distribution (common for reservoir properties)
    """
    if seed is not None:
        np.random.seed(seed)
    
    # Generate random samples for each parameter
    samples_area = np.random.normal(params.area, params.area_std or params.area * 0.1, n_iterations)
    samples_thickness = np.random.normal(params.thickness, params.thickness_std or params.thickness * 0.1, n_iterations)
    samples_porosity = np.random.normal(params.porosity, params.porosity_std or params.porosity * 0.1, n_iterations)
    samples_sw = np.random.normal(params.water_saturation, params.water_saturation_std or params.water_saturation * 0.1, n_iterations)
    samples_bo = np.random.normal(params.oil_fvf, params.oil_fvf_std or params.oil_fvf * 0.1, n_iterations)
    
    # Ensure physical constraints
    samples_porosity = np.clip(samples_porosity, 0.01, 0.5)
    samples_sw = np.clip(samples_sw, 0.01, 0.99)
    samples_bo = np.clip(samples_bo, 0.5, 5.0)
    samples_area = np.clip(samples_area, 0.1, None)
    samples_thickness = np.clip(samples_thickness, 0.1, None)
    
    # Calculate STOIIP for each iteration
    stoiip_samples = 7758 * samples_area * samples_thickness * samples_porosity * (1 - samples_sw) / samples_bo
    
    # Calculate statistics
    mean_stoiip = np.mean(stoiip_samples)
    std_stoiip = np.std(stoiip_samples)
    
    # Calculate percentiles
    stoiip_p10 = np.percentile(stoiip_samples, 90)  # P10 = 90th percentile (high)
    stoiip_p50 = np.percentile(stoiip_samples, 50)  # P50 = median
    stoiip_p90 = np.percentile(stoiip_samples, 10)  # P90 = 10th percentile (low)
    
    return VolumetricResult(
        stoiip=mean_stoiip,
        stoiip_p10=stoiip_p10,
        stoiip_p50=stoiip_p50,
        stoiip_p90=stoiip_p90,
        mean=mean_stoiip,
        std=std_stoiip,
        samples=stoiip_samples.tolist()[:1000],  # Return first 1000 samples for histogram
        distribution_type="log-normal"
    )


def run_triangle_monte_carlo(
    area_min: float, area_mode: float, area_max: float,
    thickness_min: float, thickness_mode: float, thickness_max: float,
    porosity_min: float, porosity_mode: float, porosity_max: float,
    sw_min: float, sw_mode: float, sw_max: float,
    bo_min: float, bo_mode: float, bo_max: float,
    n_iterations: int = 10000,
    seed: Optional[int] = None
) -> VolumetricResult:
    """
    Run Monte Carlo using triangular distributions (common in petroleum industry)
    
    Triangular is preferred when you have min, mode, max estimates from geological analogues
    """
    if seed is not None:
        np.random.seed(seed)
    
    # Generate triangular distribution samples
    samples_area = np.random.triangle(area_min, area_mode, area_max, n_iterations)
    samples_thickness = np.random.triangle(thickness_min, thickness_mode, thickness_max, n_iterations)
    samples_porosity = np.random.triangle(porosity_min, porosity_mode, porosity_max, n_iterations)
    samples_sw = np.random.triangle(sw_min, sw_mode, sw_max, n_iterations)
    samples_bo = np.random.triangle(bo_min, bo_mode, bo_max, n_iterations)
    
    # Calculate STOIIP for each iteration
    stoiip_samples = 7758 * samples_area * samples_thickness * samples_porosity * (1 - samples_sw) / samples_bo
    
    # Calculate statistics
    mean_stoiip = np.mean(stoiip_samples)
    std_stoiip = np.std(stoiip_samples)
    
    # Calculate percentiles
    stoiip_p10 = np.percentile(stoiip_samples, 90)
    stoiip_p50 = np.percentile(stoiip_samples, 50)
    stoiip_p90 = np.percentile(stoiip_samples, 10)
    
    return VolumetricResult(
        stoiip=mean_stoiip,
        stoiip_p10=stoiip_p10,
        stoiip_p50=stoiip_p50,
        stoiip_p90=stoiip_p90,
        mean=mean_stoiip,
        std=std_stoiip,
        samples=stoiip_samples.tolist()[:1000],
        distribution_type="triangular"
    )


def calculate_recovery_factor(
    initial_pressure: float,
    bubble_point_pressure: float,
    reservoir_type: str = "solution_gas",
    gor: Optional[float] = None,
    wc: Optional[float] = None,
    we: Optional[float] = None
) -> float:
    """
    Calculate expected recovery factor based on drive mechanism
    
    Recovery factor estimates:
    - Solution gas drive: 5-25% (typically ~15%)
    - Gas cap drive: 20-40% (typically ~30%)
    - Water drive: 30-50% (typically ~40%)
    - Combination: 25-45% (typically ~35%)
    """
    if reservoir_type == "solution_gas":
        # Solution gas drive
        if initial_pressure > bubble_point_pressure:
            # Undersaturated
            rf = 0.05 + 0.15 * (1 - bubble_point_pressure / initial_pressure)
        else:
            # Saturated
            rf = 0.10 + 0.15 * (1 - bubble_point_pressure / initial_pressure)
    elif reservoir_type == "gas_cap":
        # Gas cap drive
        rf = 0.20 + 0.20 * min(1.0, (gor or 500) / 1000)
    elif reservoir_type == "water_drive":
        # Water drive
        rf = 0.30 + 0.20 * min(1.0, (wc or 0.3) / 0.5)
    else:
        # Combination drive
        rf = 0.25 + 0.10 * min(1.0, (gor or 500) / 1000)
    
    return min(0.60, max(0.05, rf))  # Cap between 5% and 60%


def calculate_remaining_reserves(stoiip_p50: float, recovery_factor: float) -> float:
    """
    Calculate remaining reserves from STOIIP and recovery factor
    
    Returns reserves in stock tank barrels
    """
    return stoiip_p50 * recovery_factor
