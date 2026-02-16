"""
Tools Registry
Petroleum engineering tools available to the agent
"""
from typing import Dict, Callable, Any


# Tool registry - maps tool names to implementations
TOOL_REGISTRY: Dict[str, Callable] = {}


def register_tool(name: str):
    """Decorator to register a tool"""
    def decorator(func: Callable):
        TOOL_REGISTRY[name] = func
        return func
    return decorator


# Example tools (placeholders for real implementations)

@register_tool("decline_curve_analysis")
async def decline_curve_analysis(well_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform decline curve analysis
    
    Parameters:
    - qi: Initial rate (STB/d)
    - di: Initial decline rate (1/month)
    - b: b-factor (0=exponential, 0-1=hyperbolic, 1=harmonic)
    - type: hyperbolic, exponential, or harmonic
    - time_months: Forecast period
    """
    import numpy as np
    
    qi = params.get("qi", 1000)
    di = params.get("di", 0.1)
    b = params.get("b", 0.5)
    curve_type = params.get("type", "hyperbolic")
    time_months = params.get("time_months", 120)
    
    t = np.linspace(0, time_months, 100)
    
    if curve_type == "exponential":
        q = qi * np.exp(-di * t)
    elif curve_type == "harmonic":
        q = qi / (1 + di * t)
    else:  # hyperbolic
        q = qi / np.power(1 + b * di * t, 1/b)
    
    # Generate forecast data
    forecast = [
        {"month": int(ti), "rate": float(qi_)} 
        for ti, qi_ in zip(t, q)
    ]
    
    return {
        "type": "decline_curve",
        "well_name": well_name,
        "parameters": params,
        "forecast": forecast,
        "eur": float(qi / di * (1/(1-b)) if b < 1 else qi * 100)  # Estimated Ultimate Recovery
    }


@register_tool("volumetric_analysis")
async def volumetric_analysis(well_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Perform volumetric analysis (STOIIP)
    
    Parameters:
    - area: Drainage area (acres)
    - net_pay: Net pay thickness (ft)
    - porosity: Porosity (fraction)
    - sw: Water saturation (fraction)
    - bf: Formation volume factor (RB/STB)
    """
    
    area = params.get("area", 1000)
    net_pay = params.get("thickness", 50)
    porosity = params.get("porosity", 0.2)
    sw = params.get("sw", 0.3)
    bf = params.get("bf", 1.2)
    
    # STOIIP = 7758 * A * h * phi * (1-Sw) / Bo
    stoiip = 7758 * area * net_pay * porosity * (1 - sw) / bf
    
    # Simple Monte Carlo (placeholder)
    import numpy as np
    
    n_samples = 1000
    area_dist = np.random.normal(area, area * 0.1, n_samples)
    phi_dist = np.random.normal(porosity, porosity * 0.1, n_samples)
    sw_dist = np.random.normal(sw, sw * 0.1, n_samples)
    
    stoiip_dist = 7758 * area_dist * net_pay * phi_dist * (1 - sw_dist) / bf
    
    return {
        "type": "volumetric",
        "well_name": well_name,
        "parameters": params,
        "stoiip": float(stoiip),
        "stoiip_p10": float(np.percentile(stoiip_dist, 10)),
        "stoiip_p50": float(np.percentile(stoiip_dist, 50)),
        "stoiip_p90": float(np.percentile(stoiip_dist, 90)),
    }


@register_tool("pressure_transient")
async def pressure_transient_analysis(well_name: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pressure transient analysis (placeholder)
    """
    return {
        "type": "pressure_transient",
        "well_name": well_name,
        "parameters": params,
        "permeability": 50,  # mD
        "skin": 0,
        "reservoir_pressure": 3000,  # psi
    }


@register_tool("get_well_data")
async def get_well_data(well_id: int) -> Dict[str, Any]:
    """Get well data"""
    return {
        "well_id": well_id,
        "status": "producing",
        "current_depth": 3500,
        "pressure": 2500,
    }
