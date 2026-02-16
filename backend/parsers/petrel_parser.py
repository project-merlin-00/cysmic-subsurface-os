"""
Petrel Export Parser for CYSMIC Subsurface OS
Handles various Petrel export formats:
- Petrel ASCII exports
- Petrel table exports
- Petrel grid exports
"""

import io
import json
import re
from typing import Any, Optional
from datetime import datetime


def parse_petrel_export(file_content: bytes, filename: str) -> dict[str, Any]:
    """
    Parse Petrel export file
    
    Supports:
    - Petrel ASCII well logs
    - Petrel table exports (CSV-like)
    - Petrel zone tables
    """
    try:
        text = file_content.decode('utf-8', errors='ignore')
    except:
        text = file_content.decode('latin-1', errors='ignore')
    
    # Detect format and parse accordingly
    if filename.lower().endswith('.csv') or '\t' in text[:500]:
        return _parse_petrel_table(text)
    elif filename.lower().endswith('.txt') or filename.lower().endswith('.dat'):
        return _parse_petrel_ascii(text)
    else:
        return _parse_petrel_generic(text)


def _parse_petrel_table(text: str) -> dict[str, Any]:
    """Parse Petrel table export (TSV/CSV)"""
    try:
        import pandas as pd
        
        # Detect delimiter
        delimiter = '\t' if '\t' in text[:500] else ','
        df = pd.read_csv(io.StringIO(text), delimiter=delimiter)
        
        return {
            "file_type": "petrel_table",
            "format": "table",
            "columns": list(df.columns),
            "data": df.to_dict(orient='records'),
            "metadata": {
                "rows": len(df),
                "columns": len(df.columns),
                "parsed_at": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        return {"error": str(e), "file_type": "petrel_table"}


def _parse_petrel_ascii(text: str) -> dict[str, Any]:
    """Parse Petrel ASCII well log format"""
    lines = text.strip().split('\n')
    
    result = {
        "file_type": "petrel_ascii",
        "format": "ascii_well_log",
        "well": {},
        "curves": [],
        "data": [],
        "metadata": {
            "lines": len(lines),
            "parsed_at": datetime.utcnow().isoformat()
        }
    }
    
    # Parse header section (first ~20 lines typically)
    header_lines = []
    data_start = 0
    
    for i, line in enumerate(lines):
        # Look for well info keywords
        if line.startswith('WELL:') or line.startswith('Well Name:') or line.startswith('well_name'):
            result["well"]["name"] = line.split(':', 1)[-1].strip()
        elif line.startswith('FIELD:') or line.startswith('field_name'):
            result["well"]["field"] = line.split(':', 1)[-1].strip()
        elif line.startswith('DATE:') or line.startswith('date:'):
            result["well"]["date"] = line.split(':', 1)[-1].strip()
        
        # Detect data start (usually columns header or numeric data)
        if line.strip() and not line.startswith('#') and not line.startswith('//'):
            parts = line.split()
            if len(parts) > 2:
                try:
                    # Check if first values are numeric (depth values)
                    float(parts[0].replace('.', '').replace('-', ''))
                    data_start = i
                    # This is likely the column header or data
                    break
                except:
                    header_lines.append(line.strip())
    
    # Parse curve names from header or first data line
    if data_start > 0 and data_start < len(lines):
        header = lines[data_start]
        curves = header.split()
        result["curves"] = [{"mnemonic": c} for c in curves if c]
    
    # Parse data rows
    for i in range(data_start, min(data_start + 10000, len(lines))):
        line = lines[i].strip()
        if not line or line.startswith('#') or line.startswith('//'):
            continue
        
        parts = line.split()
        if len(parts) >= len(result["curves"]):
            row = {}
            for j, curve in enumerate(result["curves"]):
                if j < len(parts):
                    try:
                        row[curve["mnemonic"]] = float(parts[j])
                    except:
                        row[curve["mnemonic"]] = parts[j]
            if row:
                result["data"].append(row)
    
    result["metadata"]["data_rows"] = len(result["data"])
    
    return result


def _parse_petrel_generic(text: str) -> dict[str, Any]:
    """Generic Petrel parser for unknown formats"""
    lines = text.strip().split('\n')
    
    # Look for common Petrel keywords
    well_matches = re.findall(r'(?:WELL|Well Name)[\s:=]+([^\n\r]+)', text, re.IGNORECASE)
    field_matches = re.findall(r'(?:FIELD|Field Name)[\s:=]+([^\n\r]+)', text, re.IGNORECASE)
    
    return {
        "file_type": "petrel_generic",
        "format": "unknown",
        "well": {
            "name": well_matches[0].strip() if well_matches else None,
            "field": field_matches[0].strip() if field_matches else None
        },
        "metadata": {
            "lines": len(lines),
            "first_100_chars": text[:500],
            "parsed_at": datetime.utcnow().isoformat()
        }
    }
