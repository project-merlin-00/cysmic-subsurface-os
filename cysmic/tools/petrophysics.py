"""
Petrophysics calculations - grounded tools for agents
"""

import math
from typing import Dict, List, Tuple, Optional


def calculate_porosity_from_density(
    rho_ma: float,  # Matrix density (g/cm3)
    rho_fluid: float,  # Fluid density (g/cm3)
    rho_log: float  # Logged bulk density (g/cm3)
) -> float:
    """
    Calculate porosity from density log.
    
    Phi = (rho_ma - rho_log) / (rho_ma - rho_fluid)
    
    Typical values:
    - Sandstone: rho_ma = 2.65 g/cm3
    - Limestone: rho_ma = 2.71 g/cm3
    - Dolomite: rho_ma = 2.87 g/cm3
    - Fresh water: rho_fluid = 1.0 g/cm3
    - Salt water: rho_fluid = 1.1 g/cm3
    """
    if rho_ma <= rho_log or rho_ma <= rho_fluid:
        return 0.0
    
    phi = (rho_ma - rho_log) / (rho_ma - rho_fluid)
    return max(0.0, min(1.0, phi))  # Clamp to 0-1


def calculate_porosity_from_neutron(
    phi_n: float,  # Neutron porosity (decimal)
    phi_d: float,  # Density porosity (decimal)
    lithology: str = 'sandstone'
) -> float:
    """
    Calculate corrected porosity from neutron-density combination.
    
    For sandstone: Phi = (Phi_N + Phi_D) / 2
    For limestone: Use crossplot method
    """
    if lithology.lower() == 'sandstone':
        return (phi_n + phi_d) / 2
    elif lithology.lower() == 'limestone':
        # Simplified limestone correction
        return phi_n + 0.05  # Typical shift
    return phi_n


def calculate_water_saturation_archie(
    rw: float,  # Water resistivity (ohm-m)
    rt: float,  # True resistivity (ohm-m)
    phi: float,  # Porosity (decimal)
    a: float = 1.0,  # Tortuosity factor
    m: float = 2.0,  # Cementation exponent
    n: float = 2.0,  # Saturation exponent
) -> float:
    """
    Calculate water saturation using Archie's equation.
    
    Sw = (a * rw / (phi^m * rt)) ^ (1/n)
    
    Typical values:
    - a = 0.62 (sandstone), 1.0 (carbonate)
    - m = 2.0 (sandstone), 2.0-2.2 (carbonate)
    - n = 2.0
    """
    if phi <= 0 or rt <= 0:
        return 1.0  # Assume 100% water if no porosity or infinite resistance
    
    sw_numerator = a * rw
    sw_denominator = (phi ** m) * rt
    
    if sw_denominator <= 0:
        return 1.0
    
    sw = (sw_numerator / sw_denominator) ** (1 / n)
    return max(0.0, min(1.0, sw))


def calculate_permeability_timor_coates(
    phi: float,  # Porosity (decimal)
    swir: float,  # Irreducible water saturation (decimal)
    sw: float,  # Water saturation (decimal)
    c: float = 100,  # Constant (typically 100 for sandstones)
) -> float:
    """
    Calculate permeability using Timur-Coates model.
    
    K = c * phi^4 * (1 - Swir) / Swir
    
    Valid for phi > 0.1 and Swir < Sw
    """
    if phi <= 0 or sw <= 0 or sw <= swir:
        return 0.0
    
    # Simplified Timur-Coates
    k = c * (phi ** 4) * ((1 - swir) / swir)
    return max(0.0, k)


def calculate_net_pay(
    gr_log: List[float],  # Gamma ray log
    depth: List[float],  # Depth values
    gr_clean: float,  # Clean sand GR value
    gr_shale: float,  # Shale GR value
    porosity_cutoff: float = 0.10,  # 10% porosity cutoff
    sw_cutoff: float = 0.50,  # 50% Sw cutoff
    rt_log: Optional[List[float]] = None,  # Resistivity log (optional)
    rw: float = 0.1,  # Water resistivity
    phi_log: Optional[List[float]] = None,  # Porosity log (optional)
) -> Dict:
    """
    Calculate net pay thickness based on cutoffs.
    
    Returns dict with net pay thickness and intervals.
    """
    if not gr_log or not depth:
        return {'net_pay': 0.0, 'gross': 0.0, 'intervals': []}
    
    # Calculate Vsh (shale volume)
    vsh = []
    for gr in gr_log:
        if gr_clean == gr_shale:
            vsh.append(0.0)
        else:
            vsh_val = (gr - gr_clean) / (gr_shale - gr_clean)
            vsh.append(max(0.0, min(1.0, vsh_val)))
    
    # Identify net pay intervals
    intervals = []
    in_pay = False
    pay_start = 0.0
    
    for i, (d, v) in enumerate(zip(depth, vsh)):
        # Simple Vsh cutoff (25% max)
        is_pay = v < 0.25
        
        # Add porosity/Sw check if available
        if phi_log and rt_log and i < len(phi_log) and i < len(rt_log):
            phi = phi_log[i]
            sw = calculate_water_saturation_archie(rw, rt_log[i], phi)
            is_pay = is_pay and (phi >= porosity_cutoff) and (sw <= sw_cutoff)
        
        if is_pay and not in_pay:
            pay_start = d
            in_pay = True
        elif not is_pay and in_pay:
            intervals.append({'start': pay_start, 'end': d})
            in_pay = False
    
    # Close last interval if still in pay
    if in_pay:
        intervals.append({'start': pay_start, 'end': depth[-1]})
    
    # Calculate net pay
    net_pay = sum(interval['end'] - interval['start'] for interval in intervals)
    gross = depth[-1] - depth[0] if depth else 0.0
    
    return {
        'net_pay': net_pay,
        'gross': gross,
        'net_to_gross': net_pay / gross if gross > 0 else 0.0,
        'intervals': intervals
    }


def calculate_fluid_density(
    api_gravity: float,  # Oil API gravity
    rs: float = 0,  # Solution gas-oil ratio (scf/STB)
    temperature: float = 60  # Temperature (degF)
) -> float:
    """
    Calculate fluid density using Standing correlation.
    
    Returns density in g/cm3
    """
    # Oil density at stock tank conditions
    gamma_g = 0.6  # Gas specific gravity (default)
    rho_o = 141.5 / (api_gravity + 131.5)  # lb/ft3 -> convert
    
    # Convert to g/cm3
    rho_o_gcm3 = rho_o * 0.0160185
    
    return rho_o_gcm3


def calculate_bhp_from_whp(
    whp: float,  # Wellhead pressure (bar)
    depth: float,  # TVD (m)
    rho_fluid: float = 1.0,  # Fluid density (g/cm3)
) -> float:
    """
    Calculate bottom hole pressure from wellhead pressure.
    
    BHP = WHP + (rho * g * depth) / 10^5
    
    Returns BHP in bar
    """
    g = 9.81  # m/s2
    rho_water = 1000  # kg/m3 (if rho_fluid is g/cm3)
    rho_kg_m3 = rho_fluid * 1000  # Convert g/cm3 to kg/m3
    
    # Hydrostatic pressure in bar
    bhp = whp + (rho_kg_m3 * g * depth) / 1e5
    return bhp
