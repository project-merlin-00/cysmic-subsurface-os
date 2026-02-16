"""
DLIS File Parser for CYSMIC Subsurface OS
Handles Digital Log Interchange Standard (DLIS) files
"""

import io
import json
from typing import Any, Optional
from datetime import datetime


def parse_dlis(file_content: bytes) -> dict[str, Any]:
    """
    Parse DLIS file and return structured data
    
    DLIS is a more complex format than LAS, supporting:
    - Multiple frames per file
    - Channels with various data types
    - Structured metadata
    - Foreign files
    """
    try:
        import dlisio
    except ImportError:
        return {"error": "dlisio library not installed"}
    
    try:
        # Open the DLIS file
        with io.BytesIO(file_content) as f:
            dlis_files = dlisio.load(f)
        
        result = {
            "file_type": "dlis",
            "files": [],
            "metadata": {
                "parsed_at": datetime.utcnow().isoformat()
            }
        }
        
        for dlis_file in dlis_files:
            file_info = {
                "origin": {},
                "frames": [],
                "channels": []
            }
            
            # Extract origin information
            if dlis_file.origin:
                origin = dlis_file.origin
                file_info["origin"] = {
                    "file_id": origin.file_id if hasattr(origin, 'file_id') else None,
                    "file_set_id": origin.file_set_id if hasattr(origin, 'file_set_id') else None,
                    "file_type": origin.file_type if hasattr(origin, 'file_type') else None,
                    "company": origin.company if hasattr(origin, 'company') else None,
                    "field_name": origin.field_name if hasattr(origin, 'field_name') else None,
                    "well_name": origin.well_name if hasattr(origin, 'well_name') else None,
                    "prod_date": str(origin.prod_date) if hasattr(origin, 'prod_date') and origin.prod_date else None,
                }
            
            # Extract frames
            if dlis_file.frames:
                for frame in dlis_file.frames:
                    frame_info = {
                        "name": frame.name if hasattr(frame, 'name') else None,
                        "index_type": frame.index_type if hasattr(frame, 'index_type') else None,
                        "channels": []
                    }
                    
                    # Get channels in this frame
                    if hasattr(frame, 'channels'):
                        for channel in frame.channels:
                            channel_info = {
                                "name": channel.name if hasattr(channel, 'name') else None,
                                "units": channel.units if hasattr(channel, 'units') else None,
                                "representation_code": channel.reprc if hasattr(channel, 'reprc') else None,
                            }
                            frame_info["channels"].append(channel_info)
                            file_info["channels"].append(channel_info)
                    
                    file_info["frames"].append(frame_info)
            
            # Extract all channels (flattened)
            if dlis_file.channels:
                for channel in dlis_file.channels:
                    channel_info = {
                        "name": channel.name if hasattr(channel, 'name') else None,
                        "long_name": channel.long_name if hasattr(channel, 'long_name') else None,
                        "units": channel.units if hasattr(channel, 'units') else None,
                        "frame": channel.frame.name if hasattr(channel, 'frame') and channel.frame else None,
                    }
            
            result["files"].append(file_info)
        
        return result
        
    except Exception as e:
        return {"error": str(e), "file_type": "dlis"}


def extract_dlis_channels(dlis_data: dict) -> list[str]:
    """Extract all channel names from parsed DLIS data"""
    channels = []
    for file_info in dlis_data.get("files", []):
        for channel in file_info.get("channels", []):
            if channel.get("name"):
                channels.append(channel["name"])
    return channels
