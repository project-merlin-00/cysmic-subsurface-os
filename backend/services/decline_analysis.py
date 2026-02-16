"""
Decline Curve Analysis - Arps Models
For CYSMIC Subsurface OS
"""

import numpy as np
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timedelta


class DeclineParameters(BaseModel):
    """Parameters for decline curve analysis"""
    qi: float  # Initial production rate (bbl/d or MMscf/d)
    Di: float  # Initial decline rate (1/month or 1/year)
    b: float   # Decline exponent (0 = exponential, 0-1 = hyperbolic, 1 = harmonic)
    ti: float = 0  # Start time (months)


class DeclineResult(BaseModel):
    """Results from decline curve analysis"""
    time: list[float]
    rate: list[float]
    cumulative: list[float]
    model: str  # 'hyperbolic', 'exponential', 'harmonic'
    parameters: DeclineParameters


def hyperbolic_decline(t: np.ndarray, qi: float, Di: float, b: float, ti: float = 0) -> np.ndarray:
    """
    Hyperbolic decline curve (Arps)
    
    q = qi / (1 + b * Di * (t - ti))^(1/b)
    
    Parameters:
    - t: time array
    - qi: initial rate
    - Di: initial decline rate
    - b: decline exponent (0 < b < 1)
    - ti: start time
    """
    # Ensure b is in valid range for hyperbolic
    b = np.clip(b, 0.001, 0.999)
    
    dt = t - ti
    denominator = 1 + b * Di * dt
    q = qi / np.power(denominator, 1/b)
    
    # Set negative rates to zero
    q = np.maximum(q, 0)
    
    return q


def exponential_decline(t: np.ndarray, qi: float, Di: float, ti: float = 0) -> np.ndarray:
    """
    Exponential decline curve (Arps)
    
    q = qi * exp(-Di * (t - ti))
    """
    dt = t - ti
    q = qi * np.exp(-Di * dt)
    
    return np.maximum(q, 0)


def harmonic_decline(t: np.ndarray, qi: float, Di: float, ti: float = 0) -> np.ndarray:
    """
    Harmonic decline curve (Arps)
    
    q = qi / (1 + Di * (t - ti))
    """
    dt = t - ti
    q = qi / (1 + Di * dt)
    
    return np.maximum(q, 0)


def calculate_cumulative(t: np.ndarray, q: np.ndarray) -> np.ndarray:
    """
    Calculate cumulative production using trapezoidal integration
    """
    cumulative = np.zeros_like(t)
    for i in range(1, len(t)):
        cumulative[i] = cumulative[i-1] + 0.5 * (t[i] - t[i-1]) * (q[i] + q[i-1])
    return cumulative


def fit_decline_curve(
    time_data: list[float],
    rate_data: list[float],
    model: str = 'hyperbolic',
    b: Optional[float] = None
) -> DeclineResult:
    """
    Fit decline curve to production data
    
    Uses curve fitting to find optimal parameters
    """
    from scipy.optimize import curve_fit
    
    t = np.array(time_data)
    q = np.array(rate_data)
    
    # Filter out zero/negative rates
    valid = q > 0
    t = t[valid]
    q = q[valid]
    
    if len(t) < 3:
        raise ValueError("Need at least 3 data points for fitting")
    
    # Initial guesses
    qi_guess = q[0]
    Di_guess = 0.1  # 10% initial decline
    
    if model == 'exponential':
        def model_func(t_, qi, Di):
            return exponential_decline(t_, qi, Di)
        popt, _ = curve_fit(model_func, t, q, p0=[qi_guess, Di_guess], maxfev=5000)
        qi, Di = popt
        b = 0
        fitted_params = DeclineParameters(qi=qi, Di=Di, b=b, ti=0)
        
    elif model == 'harmonic':
        def model_func(t_, qi, Di):
            return harmonic_decline(t_, qi, Di)
        popt, _ = curve_fit(model_func, t, q, p0=[qi_guess, Di_guess], maxfev=5000)
        qi, Di = popt
        b = 1
        fitted_params = DeclineParameters(qi=qi, Di=Di, b=b, ti=0)
        
    else:  # hyperbolic
        # If b not provided, fit it too
        if b is None:
            def model_func(t_, qi, Di, b):
                return hyperbolic_decline(t_, qi, Di, b)
            # Try multiple b values and pick best
            best_b = 0.5
            best_residual = float('inf')
            for test_b in [0.3, 0.4, 0.5, 0.6, 0.7, 0.8]:
                try:
                    popt, _ = curve_fit(
                        lambda t_, qi, Di: hyperbolic_decline(t_, qi, Di, test_b),
                        t, q, p0=[qi_guess, Di_guess], maxfev=5000
                    )
                    q_pred = hyperbolic_decline(t, *popt, test_b)
                    residual = np.sum((q - q_pred)**2)
                    if residual < best_residual:
                        best_residual = residual
                        best_b = test_b
                        qi, Di = popt
                except:
                    continue
            b = best_b
        else:
            def model_func(t_, qi, Di):
                return hyperbolic_decline(t_, qi, Di, b)
            popt, _ = curve_fit(model_func, t, q, p0=[qi_guess, Di_guess], maxfev=5000)
            qi, Di = popt
        
        fitted_params = DeclineParameters(qi=qi, Di=Di, b=b, ti=0)
    
    # Generate forecast
    t_forecast = np.linspace(0, max(t) * 2, 100)
    
    if model == 'exponential':
        q_forecast = exponential_decline(t_forecast, qi, Di)
    elif model == 'harmonic':
        q_forecast = harmonic_decline(t_forecast, qi, Di)
    else:
        q_forecast = hyperbolic_decline(t_forecast, qi, Di, b)
    
    cum_forecast = calculate_cumulative(t_forecast, q_forecast)
    
    return DeclineResult(
        time=t_forecast.tolist(),
        rate=q_forecast.tolist(),
        cumulative=cum_forecast.tolist(),
        model=model,
        parameters=fitted_params
    )


def generate_decline_forecast(
    params: DeclineParameters,
    months: int = 60,
    model: str = 'hyperbolic'
) -> DeclineResult:
    """
    Generate decline curve forecast from parameters
    """
    t = np.linspace(0, months, months + 1)
    
    if model == 'exponential':
        q = exponential_decline(t, params.qi, params.Di)
    elif model == 'harmonic':
        q = harmonic_decline(t, params.qi, params.Di)
    else:
        q = hyperbolic_decline(t, params.qi, params.Di, params.b)
    
    cumulative = calculate_cumulative(t, q)
    
    return DeclineResult(
        time=t.tolist(),
        rate=q.tolist(),
        cumulative=cumulative.tolist(),
        model=model,
        parameters=params
    )
