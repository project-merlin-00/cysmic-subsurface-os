"""
CSV File Parser for CYSMIC Subsurface OS
Handles CSV files with production data, well data, etc.
"""

import io
import json
from typing import Any, Optional
from datetime import datetime
import csv


def parse_csv(file_content: bytes) -> dict[str, Any]:
    """
    Parse CSV file and return structured data
    
    Supports various delimiters and handles common petroleum data formats
    """
    try:
        import pandas as pd
    except ImportError:
        return {"error": "pandas library not installed"}
    
    try:
        # Detect encoding
        try:
            text_content = file_content.decode('utf-8')
        except UnicodeDecodeError:
            try:
                text_content = file_content.decode('latin-1')
            except:
                text_content = file_content.decode('cp1252')
        
        # Try to detect delimiter
        first_line = text_content.split('\n')[0]
        delimiter = detect_delimiter(first_line)
        
        # Read CSV with pandas
        df = pd.read_csv(io.StringIO(text_content), delimiter=delimiter)
        
        result = {
            "file_type": "csv",
            "columns": list(df.columns),
            "data": df.to_dict(orient='records'),
            "metadata": {
                "rows": len(df),
                "columns": len(df.columns),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
                "parsed_at": datetime.utcnow().isoformat()
            }
        }
        
        # Add basic statistics
        numeric_cols = df.select_dtypes(include=['number']).columns
        if len(numeric_cols) > 0:
            result["statistics"] = {}
            for col in numeric_cols:
                result["statistics"][col] = {
                    "min": float(df[col].min()) if pd.notna(df[col].min()) else None,
                    "max": float(df[col].max()) if pd.notna(df[col].max()) else None,
                    "mean": float(df[col].mean()) if pd.notna(df[col].mean()) else None,
                    "std": float(df[col].std()) if pd.notna(df[col].std()) else None,
                }
        
        return result
        
    except Exception as e:
        return {"error": str(e), "file_type": "csv"}


def detect_delimiter(line: str) -> str:
    """Detect CSV delimiter from header line"""
    delimiters = [',', ';', '\t', '|']
    counts = {d: line.count(d) for d in delimiters}
    return max(counts, key=counts.get)


def parse_production_csv(file_content: bytes) -> dict[str, Any]:
    """
    Specialized parser for production data CSV
    
    Expected columns: Date, Oil, Gas, Water, etc.
    """
    data = parse_csv(file_content)
    
    if "error" in data:
        return data
    
    # Try to identify date column
    date_col = None
    for col in data.get("columns", []):
        col_lower = col.lower()
        if any(x in col_lower for x in ['date', 'time', 'month', 'year']):
            date_col = col
            break
    
    if date_col:
        data["date_column"] = date_col
        
        # Try to identify production columns
        prod_cols = {}
        for col in data.get("columns", []):
            col_lower = col.lower()
            if 'oil' in col_lower:
                prod_cols['oil'] = col
            elif 'gas' in col_lower:
                prod_cols['gas'] = col
            elif 'water' in col_lower:
                prod_cols['water'] = col
        
        data["production_columns"] = prod_cols
    
    return data
