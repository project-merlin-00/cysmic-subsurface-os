"""
LAS File Parser for CYSMIC Subsurface OS
Handles Log ASCII Standard (LAS) files commonly used in petroleum industry
"""

import io
import json
from typing import Any, Optional
from datetime import datetime


def parse_las(file_content: bytes) -> dict[str, Any]:
    """
    Parse LAS file and return structured data
    
    LAS format consists of:
    ~V (Version Information)
    ~W (Well Information)
    ~C (Curve Information)
    ~A (ASCII log data)
    """
    try:
        import lasio
    except ImportError:
        return {"error": "lasio library not installed"}
    
    try:
        # Read LAS file
        las = lasio.read(io.BytesIO(file_content))
        
        result = {
            "file_type": "las",
            "version": las.version.VERSION.value if las.version.VERSION else None,
            "well": {},
            "curves": [],
            "data": [],
            "metadata": {
                "filename": getattr(las, 'filename', 'unknown'),
                "parser": "lasio",
                "parsed_at": datetime.utcnow().isoformat()
            }
        }
        
        # Extract well information
        well_keys = ['WELL', 'WELL1', 'WELL2', 'WELL3']
        for key in well_keys:
            if hasattr(las, key):
                well_item = las[key]
                if well_item:
                    result["well"][key] = {
                        "value": str(well_item.value) if well_item.value else None,
                        "unit": well_item.unit if hasattr(well_item, 'unit') else None,
                        "descr": well_item.descr if hasattr(well_item, 'descr') else None
                    }
        
        # Extract curve information
        for curve in las.curves:
            curve_info = {
                "mnemonic": curve.mnemonic,
                "unit": curve.unit if hasattr(curve, 'unit') else None,
                "descr": curve.descr if hasattr(curve, 'descr') else None,
                "data_type": str(curve.data.dtype) if hasattr(curve, 'data') and curve.data is not None else None
            }
            result["curves"].append(curve_info)
        
        # Extract ASCII data
        if las.data is not None and len(las.data) > 0:
            # Convert to records for JSON serialization
            data_array = las.df()
            result["data"] = data_array.to_dict(orient='records')
            result["data_summary"] = {
                "rows": len(data_array),
                "columns": list(data_array.columns)
            }
        
        return result
        
    except Exception as e:
        return {"error": str(e), "file_type": "las"}


def get_curve_data(las_data: dict, curve_mnemonic: str) -> list[dict]:
    """Extract specific curve data from parsed LAS"""
    if "data" not in las_data:
        return []
    
    # Find the depth curve (usually DEPT or index)
    depth_curve = None
    for curve in las_data.get("curves", []):
        mnemonic = curve.get("mnemonic", "").upper()
        if mnemonic in ["DEPT", "DEPTH", "TIME"]:
            depth_curve = mnemonic
            break
    
    if not depth_curve:
        return []
    
    result = []
    for row in las_data["data"]:
        depth_val = row.get(depth_curve)
        curve_val = row.get(curve_mnemonic.upper())
        if depth_val is not None and curve_val is not None:
            result.append({
                "depth": float(depth_val),
                "value": float(curve_val)
            })
    
    return result
