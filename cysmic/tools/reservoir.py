"""
Reservoir engineering calculations - grounded tools for agents
"""

import math
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass


@dataclass
class FluidProperties:
    """Fluid properties for reservoir calculations"""
    api_gravity: float  # API gravity
    gamma_gas: float = 0.7  # Gas specific gravity
    rs: float = 0  # Solution GOR (scf/STB)
    bo: float = 1.0  # Oil formation volume factor (rb/STB)
    bg: float = 0.001  # Gas formation volume factor (rb/scf)
    muo: float = 1.0  # Oil viscosity (cp)
    bob: float = 1.0  # Oil FVF at bubble point


def calculate_ooip_volumetric(
    area: float,  # Drainage area (acres)
    thickness: float,  # Net thickness (ft)
    porosity: float,  # Porosity (decimal)
    sw: float,  # Water saturation (decimal)
    boi: float = 1.2,  # Oil FVF at initial conditions (rb/STB)
) -> float:
    """
    Calculate Original Oil in Place (OOIP) using volumetric method.
    
    OOIP = (A * h * phi * (1 - Sw)) / (5.615 * Boi)
    
    Returns: STB (stock tank barrels)
    """
    if area <= 0 or thickness <= 0 or porosity <= 0:
        return 0.0
    
    # 5.615 conversion factor from acre-ft to bbl
    ooip = (area * thickness * porosity * (1 - sw)) / (5.615 * boi)
    return ooip


def calculate_gip_volumetric(
    area: float,  # Drainage area (acres)
    thickness: float,  # Net thickness (ft)
    porosity: float,  # Porosity (decimal)
    sg: float,  # Gas saturation (decimal)
    bgi: float = 0.001,  # Initial gas FVF (rb/scf)
) -> float:
    """
    Calculate Gas in Place (GIP) using volumetric method.
    
    GIP = (A * h * phi * Sg) / (Bgi)
    
    Returns: SCF (standard cubic feet)
    """
    if area <= 0 or thickness <= 0 or porosity <= 0:
        return 0.0
    
    # GIP in scf
    gip = (area * thickness * porosity * sg) / (bgi * 0.001)  # Convert rb to 1000 scf
    return gip


def calculate_recovery_factor(
    drive_mechanism: str,
    ooip: float,
    recovered: float,
) -> float:
    """
    Estimate recovery factor based on drive mechanism.
    
    Typical recovery factors:
    - Solution gas drive: 5-15%
    - Gas cap drive: 15-25%
    - Water drive: 20-40%
    - Combination drive: 25-35%
    """
    if ooip <= 0:
        return 0.0
    
    rf = (recovered / ooip) * 100  # As percentage
    
    # Expected RF based on drive
    expected_rf = {
        'solution_gas': 10,
        'gas_cap': 20,
        'water_drive': 30,
        'combination': 30,
    }.get(drive_mechanism.lower().replace(' ', '_'), 15)
    
    return {
        'current_rf': rf,
        'expected_rf': expected_rf,
        'remaining': expected_rf - rf if rf < expected_rf else 0
    }


def arps_decline_curve(
    qi: float,  # Initial rate (bbl/d or MMscf/d)
    di: float,  # Initial decline rate (1/month or 1/year)
    b: float,   # Decline exponent (0=hyperbolic, 1=exponential)
    time: float,  # Time since start
) -> Dict[str, float]:
    """
    Arps decline curve analysis.
    
    q = qi / (1 + b*di*t)^(1/b)
    
    Parameters:
    - b = 0: Harmonic decline
    - 0 < b < 1: Hyperbolic decline  
    - b = 1: Exponential decline
    
    Returns dict with rate, cumulative, and time
    """
    if qi <= 0 or di <= 0:
        return {'rate': 0, 'cumulative': 0, 'time': time}
    
    if b == 0:
        # Exponential decline
        q = qi * math.exp(-di * time)
        cumulative = qi * (1 - math.exp(-di * time)) / di
    elif b == 1:
        # Harmonic decline
        q = qi / (1 + di * time)
        cumulative = qi / di * math.log(1 + di * time)
    else:
        # Hyperbolic decline
        q = qi / ((1 + b * di * time) ** (1/b))
        if b != 0:
            cumulative = (qi / ((1-b) * di)) * (qi**(1-b) - q**(1-b))
        else:
            cumulative = 0
    
    return {
        'rate': q,
        'cumulative': cumulative,
        'time': time,
        'unit': 'bbl/d'  # or MMscf/d for gas
    }


def fit_arps_decline(
    rates: List[float],  # Production rates
    times: List[float],  # Time values
    time_unit: str = 'month',  # 'month' or 'year'
) -> Dict:
    """
    Fit Arps decline curve to production data.
    
    Returns best-fit parameters (qi, di, b) and curve type
    """
    if len(rates) < 3 or len(times) < 3:
        return {'error': 'Insufficient data'}
    
    # Simple exponential fit for initial estimate
    q0 = max(rates)
    qn = rates[-1]
    tn = times[-1] - times[0]
    
    if q0 > 0 and qn > 0 and tn > 0:
        # Exponential decline rate
        di_exp = -math.log(qn / q0) / tn if qn < q0 else 0
        
        # Try different b values and find best fit
        best_b = 1.0
        best_error = float('inf')
        
        for b_test in [0.0, 0.3, 0.5, 0.7, 1.0]:
            error = 0
            for q, t in zip(rates, times):
                if b_test == 0:
                    q_pred = q0 * math.exp(-di_exp * (t - times[0]))
                else:
                    try:
                        q_pred = q0 / ((1 + b_test * di_exp * (t - times[0])) ** (1/b_test))
                    except:
                        q_pred = q0
                error += (q - q_pred) ** 2
            
            if error < best_error:
                best_error = error
                best_b = b_test
        
        curve_type = {
            0.0: 'Exponential',
            1.0: 'Harmonic'
        }.get(b_best := round(best_b, 1), f'Hyperbolic (b={best_b:.1f})')
        
        return {
            'qi': q0,
            'di': di_exp,
            'b': best_b,
            'curve_type': curve_type,
            'unit': time_unit
        }
    
    return {'error': 'Could not fit decline curve'}


def calculate_eur(
    qi: float,
    di: float,
    b: float,
    rate_limit: float = 10,  # Economic limit (bbl/d)
    time_unit: str = 'month',
) -> float:
    """
    Calculate Estimated Ultimate Recovery (EUR).
    
    Integral of decline curve from t=0 to t=economic limit
    """
    if qi <= 0 or di <= 0:
        return 0.0
    
    # Time to reach economic limit
    if b == 0:
        t_eco = -math.log(rate_limit / qi) / di if rate_limit < qi else float('inf')
        if t_eco < 0:
            t_eco = 0
        eur = qi * (1 - math.exp(-di * t_eco)) / di
    elif b == 1:
        t_eco = (qi / rate_limit - 1) / di if rate_limit < qi else float('inf')
        if t_eco < 0:
            t_eco = 0
        eur = qi / di * math.log(1 + di * t_eco)
    else:
        t_eco = ((qi / rate_limit) ** b - 1) / (b * di) if rate_limit < qi else float('inf')
        if t_eco < 0:
            t_eco = 0
        if b != 0:
            eur = (qi / ((1-b) * di)) * (qi**(1-b) - rate_limit**(1-b))
        else:
            eur = 0
    
    return eur if not math.isinf(eur) else 0


def calculate_npv(
    cash_flows: List[Tuple[float, float]],  # [(time, cash_flow)]
    discount_rate: float = 0.1,  # Annual discount rate
    inflation_rate: float = 0.0,  # Inflation rate
) -> Dict[str, float]:
    """
    Calculate Net Present Value.
    
    Args:
        cash_flows: List of (time in years, cash flow) tuples
        discount_rate: Annual discount rate (decimal)
        inflation_rate: Annual inflation rate (decimal)
    
    Returns:
        Dict with NPV, PI, and IRR estimates
    """
    if not cash_flows:
        return {'npv': 0, 'pi': 0, 'irr': None}
    
    # Calculate NPV
    npv = 0
    total_positive = 0
    total_investment = 0
    
    for time, cf in cash_flows:
        # Apply inflation adjustment
        cf_adjusted = cf / ((1 + inflation_rate) ** time)
        
        # Discount to present
        pv = cf_adjusted / ((1 + discount_rate) ** time)
        npv += pv
        
        if cf > 0:
            total_positive += cf
        else:
            total_investment += abs(cf)
    
    # Profitability Index
    pi = total_positive / total_investment if total_investment > 0 else 0
    
    # Simple IRR approximation (Newton-Raphson could be used for more precision)
    irr = None
    for r in [i * 0.05 for i in range(0, 40)]:
        npv_test = sum(cf / ((1 + r) ** t) for t, cf in cash_flows)
        if abs(npv_test) < abs(npv * 0.1):
            irr = r
            break
    
    return {
        'npv': npv,
        'pi': pi,
        'irr': irr,
        'discount_rate': discount_rate
    }


def calculate_productivity_index(
    q: float,  # Flow rate (m3/d or bbl/d)
    p_res: float,  # Reservoir pressure (bar)
    p_wf: float,  # Flowing bottom hole pressure (bar)
) -> float:
    """
    Calculate Productivity Index (PI or J).
    
    J = q / (P_res - P_wf)
    
    Returns PI in m3/d/bar or bbl/d/psi
    """
    delta_p = p_res - p_wf
    
    if delta_p <= 0:
        return 0.0
    
    return q / delta_p


def calculate_voip(
    area: float,  # acres
    thickness: float,  # ft
    porosity: float,  # decimal
    sw: float,  # decimal
    bv: float = 1.0,  # formation volume factor
) -> float:
    """
    Calculate Bulk Volume of Oil in Place.
    
    VOIP = A * h * phi * (1 - Sw) * BV
    """
    if area <= 0 or thickness <= 0:
        return 0.0
    
    voip = area * thickness * porosity * (1 - sw) * bv
    return voip
