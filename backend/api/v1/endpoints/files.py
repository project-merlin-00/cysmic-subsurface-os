"""
File Ingestion API Endpoints for CYSMIC Subsurface OS
Handles LAS, DLIS, CSV, and Petrel file uploads
"""

import io
import os
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from ..parsers.las_parser import parse_las, get_curve_data
from ..parsers.dlis_parser import parse_dlis
from ..parsers.csv_parser import parse_csv, parse_production_csv
from ..parsers.petrel_parser import parse_petrel_export


router = APIRouter(prefix="/files", tags=["file-ingestion"])


class FileParseResponse(BaseModel):
    file_type: str
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


def get_file_extension(filename: str) -> str:
    """Extract file extension from filename"""
    return os.path.splitext(filename)[-1].lower()


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)) -> FileParseResponse:
    """
    Upload and parse well log files
    
    Supported formats:
    - .las, .LAS - Log ASCII Standard
    - .dlis, .DLIS - Digital Log Interchange Standard
    - .csv - Comma Separated Values
    - .txt, .dat - Petrel ASCII exports
    """
    # Read file content
    content = await file.read()
    
    if len(content) == 0:
        return FileParseResponse(
            file_type="unknown",
            success=False,
            error="Empty file"
        )
    
    ext = get_file_extension(file.filename)
    
    # Route to appropriate parser
    try:
        if ext in ['.las']:
            result = parse_las(content)
            if "error" in result:
                return FileParseResponse(
                    file_type="las",
                    success=False,
                    error=result["error"]
                )
            return FileParseResponse(
                file_type="las",
                success=True,
                data=result
            )
            
        elif ext in ['.dlis']:
            result = parse_dlis(content)
            if "error" in result:
                return FileParseResponse(
                    file_type="dlis",
                    success=False,
                    error=result["error"]
                )
            return FileParseResponse(
                file_type="dlis",
                success=True,
                data=result
            )
            
        elif ext in ['.csv']:
            result = parse_production_csv(content)
            if "error" in result:
                return FileParseResponse(
                    file_type="csv",
                    success=False,
                    error=result["error"]
                )
            return FileParseResponse(
                file_type="csv",
                success=True,
                data=result
            )
            
        elif ext in ['.txt', '.dat']:
            result = parse_petrel_export(content, file.filename)
            if "error" in result:
                return FileParseResponse(
                    file_type="petrel",
                    success=False,
                    error=result["error"]
                )
            return FileParseResponse(
                file_type="petrel",
                success=True,
                data=result
            )
            
        else:
            return FileParseResponse(
                file_type="unknown",
                success=False,
                error=f"Unsupported file type: {ext}"
            )
            
    except Exception as e:
        return FileParseResponse(
            file_type=ext,
            success=False,
            error=str(e)
        )


@router.get("/curve/{curve_mnemonic}")
async def get_curve(
    curve_mnemonic: str,
    las_data: dict = Depends(lambda: {})  # In real impl, get from cache/DB
):
    """Get specific curve data from parsed LAS file"""
    # This would retrieve from storage in production
    return {"curve": curve_mnemonic, "data": []}


@router.get("/formats")
async def get_supported_formats():
    """Get list of supported file formats"""
    return {
        "formats": [
            {
                "extension": ".las",
                "name": "Log ASCII Standard",
                "description": "Industry standard format for wireline log data"
            },
            {
                "extension": ".dlis", 
                "name": "Digital Log Interchange Standard",
                "description": "Complex format for log data with multiple frames"
            },
            {
                "extension": ".csv",
                "name": "Comma Separated Values",
                "description": "Generic tabular data, often production data"
            },
            {
                "extension": ".txt, .dat",
                "name": "Petrel ASCII Export",
                "description": "Petrel software ASCII exports"
            }
        ]
    }
