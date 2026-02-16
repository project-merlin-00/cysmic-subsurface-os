"""
Phase 4: Integration Service
Petrel/Eclipse/Kappa Integration - Bidirectional sync with industry tools
"""
import os
import json
import shutil
from typing import List, Optional, Dict, Any
from datetime import datetime
from pathlib import Path
from sqlalchemy.orm import Session

from backend.models.models import IntegrationSync, Well
from backend.schemas import phase4 as schemas


class IntegrationService:
    """Service for Petrel/Eclipse/Kappa integration"""
    
    def __init__(self, db: Session):
        self.db = db
        self.base_path = Path("/home/arthur/.openclaw/workspace/cysmic-subsurface-os/data")
        self.base_path.mkdir(parents=True, exist_ok=True)
    
    # ===================
    # Petrel Integration
    # ===================
    
    def parse_petrel_project(self, project_path: str) -> schemas.PetrelProjectInfo:
        """Parse Petrel project file to extract metadata"""
        # Petrel stores project data in .pet files (XML) or folder structures
        # This is a simplified parser - real implementation would need Petrel API
        
        project_info = schemas.PetrelProjectInfo(
            project_name=os.path.basename(project_path),
            project_path=project_path,
            wells=[],
            seismic_volumes=[],
            petrophysical_models=[]
        )
        
        # Look for well data in project folder
        wells_folder = os.path.join(project_path, "Wells")
        if os.path.exists(wells_folder):
            for item in os.listdir(wells_folder):
                if item.endswith((".las", ".dlis", ".txt")):
                    project_info.wells.append(item)
        
        # Look for seismic volumes
        seismic_folder = os.path.join(project_path, "Seismic")
        if os.path.exists(seismic_folder):
            for item in os.listdir(seismic_folder):
                if item.endswith((".segy", ".sgy", ".gslib")):
                    project_info.seismic_volumes.append(item)
        
        return project_info
    
    def import_from_petrel(
        self,
        project_path: str,
        well_names: Optional[List[str]] = None
    ) -> schemas.ImportResult:
        """Import data from Petrel project"""
        result = schemas.ImportResult(
            success=True,
            imported_wells=[],
            imported_data={},
            errors=[],
            warnings=[]
        )
        
        try:
            project_info = self.parse_petrel_project(project_path)
            
            # Import wells
            wells_to_import = well_names or project_info.wells
            
            for well_name in wells_to_import:
                # Create or update well in database
                existing_well = self.db.query(Well).filter(Well.name == well_name).first()
                
                if not existing_well:
                    # Would need proper user_id - using system user (1) for now
                    new_well = Well(
                        name=well_name,
                        field=project_info.project_name,
                        owner_id=1  # System user
                    )
                    self.db.add(new_well)
                    result.imported_wells.append(well_name)
                    
                    # Track sync
                    self._track_sync("petrel", "well", well_name, well_name, "synced")
                else:
                    result.warnings.append(f"Well {well_name} already exists, skipping")
            
            self.db.commit()
            
        except Exception as e:
            result.success = False
            result.errors.append(str(e))
        
        return result
    
    def export_to_petrel(
        self,
        well_ids: List[int],
        output_path: str
    ) -> schemas.ExportResult:
        """Export wells to Petrel-compatible format"""
        result = schemas.ExportResult(
            success=True,
            output_file=output_path,
            exported_data={},
            errors=[]
        )
        
        try:
            wells = self.db.query(Well).filter(Well.id.in_(well_ids)).all()
            
            # Create Petrel folder structure
            petrel_folder = Path(output_path) / "CYSMIC_Export"
            petrel_folder.mkdir(parents=True, exist_ok=True)
            
            wells_folder = petrel_folder / "Wells"
            wells_folder.mkdir(exist_ok=True)
            
            for well in wells:
                # Export as CSV (simple format for Petrel import)
                well_file = wells_folder / f"{well.name}.csv"
                
                with open(well_file, 'w') as f:
                    f.write(f"Well Name,{well.name}\n")
                    f.write(f"Field,{well.field or ''}\n")
                    f.write(f"UWI,{well.uwi or ''}\n")
                    f.write(f"Status,{well.status.value if well.status else ''}\n")
                    f.write(f"Type,{well.well_type or ''}\n")
                    f.write(f"TVD,{well.total_depth_tvd or 0}\n")
                    f.write(f"MD,{well.total_depth_md or 0}\n")
                
                result.exported_data[well.name] = str(well_file)
                
                # Track sync
                self._track_sync("petrel", "well", str(well.id), well.name, "synced")
            
            self.db.commit()
            
        except Exception as e:
            result.success = False
            result.errors.append(str(e))
        
        return result
    
    # ===================
    # Eclipse Integration
    # ===================
    
    def parse_eclipse_deck(self, deck_path: str) -> schemas.EclipseDeckInfo:
        """Parse Eclipse deck (.DATA file)"""
        deck_info = schemas.EclipseDeckInfo(
            deck_name=os.path.basename(deck_path),
            deck_path=deck_path,
            include_files=[],
            run_parameters={}
        )
        
        # Parse .DATA file for includes and parameters
        if os.path.exists(deck_path):
            with open(deck_path, 'r') as f:
                content = f.read()
                
                # Find INCLUDE lines
                for line in content.split('\n'):
                    line = line.strip()
                    if line.startswith('INCLUDE'):
                        # Extract filename
                        parts = line.split()
                        if len(parts) > 1:
                            deck_info.include_files.append(parts[1].strip("'\""))
                    
                    # Simple parameter parsing
                    if line.startswith('WELLPDRE') or line.startswith('TMAX'):
                        parts = line.split()
                        if len(parts) > 1:
                            try:
                                deck_info.run_parameters[parts[0]] = float(parts[1])
                            except:
                                deck_info.run_parameters[parts[0]] = parts[1]
        
        return deck_info
    
    def import_from_eclipse(
        self,
        deck_path: str,
        well_mapping: Optional[Dict[str, int]] = None
    ) -> schemas.ImportResult:
        """Import data from Eclipse deck"""
        result = schemas.ImportResult(
            success=True,
            imported_wells=[],
            imported_data={},
            errors=[],
            warnings=[]
        )
        
        try:
            deck_info = self.parse_eclipse_deck(deck_path)
            
            # Extract well data from deck (simplified - real parsing would be more complex)
            # Eclipse wells are defined in WELLDIMS, WELLSPECS, etc.
            
            result.imported_data["deck_name"] = deck_info.deck_name
            result.imported_data["parameters"] = deck_info.run_parameters
            
            self.db.commit()
            
        except Exception as e:
            result.success = False
            result.errors.append(str(e))
        
        return result
    
    def export_to_eclipse(
        self,
        well_ids: List[int],
        output_path: str
    ) -> schemas.ExportResult:
        """Export wells to Eclipse format"""
        result = schemas.ExportResult(
            success=True,
            output_file=output_path,
            exported_data={},
            errors=[]
        )
        
        try:
            wells = self.db.query(Well).filter(Well.id.in_(well_ids)).all()
            
            # Create Eclipse deck
            deck_content = "-- CYSMIC Export\n"
            deck_content += "-- Generated: " + datetime.now().isoformat() + "\n\n"
            
            deck_content += "-- Well Dimensions\n"
            deck_content += "WELLDIMS\n"
            deck_content += f"  {len(wells)}  10  100  20  /\n\n"
            
            deck_content += "-- Well Specifications\n"
            deck_content += "WELLSPECS\n"
            
            for well in wells:
                # Simplified - would need proper coordinates
                deck_content += f"  {well.name}  PERMX  1.0  2.0  3.0  4.0  /\n"
                result.exported_data[well.name] = "exported"
            
            deck_content += "/\n"
            
            # Write deck file
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, 'w') as f:
                f.write(deck_content)
            
            for well in wells:
                self._track_sync("eclipse", "well", str(well.id), well.name, "synced")
            
            self.db.commit()
            
        except Exception as e:
            result.success = False
            result.errors.append(str(e))
        
        return result
    
    # ===================
    # Kappa Integration
    # ===================
    
    def parse_kappa_workbench(self, project_path: str) -> schemas.KappaWorkbenchInfo:
        """Parse Kappa Workbench project"""
        project_info = schemas.KappaWorkbenchInfo(
            project_name=os.path.basename(project_path),
            project_path=project_path,
            well_test_models=[],
            pressure_transient_models=[]
        )
        
        # Kappa stores projects as folders with .kpp files
        if os.path.exists(project_path):
            for item in os.listdir(project_path):
                if item.endswith('.kpp'):
                    if 'welltest' in item.lower():
                        project_info.well_test_models.append(item)
                    else:
                        project_info.pressure_transient_models.append(item)
        
        return project_info
    
    def import_from_kappa(
        self,
        project_path: str,
        model_names: Optional[List[str]] = None
    ) -> schemas.ImportResult:
        """Import from Kappa Workbench"""
        result = schemas.ImportResult(
            success=True,
            imported_wells=[],
            imported_data={},
            errors=[],
            warnings=[]
        )
        
        try:
            project_info = self.parse_kappa_workbench(project_path)
            
            result.imported_data["project_name"] = project_info.project_name
            result.imported_data["well_test_models"] = project_info.well_test_models
            result.imported_data["pressure_models"] = project_info.pressure_transient_models
            
        except Exception as e:
            result.success = False
            result.errors.append(str(e))
        
        return result
    
    def export_to_kappa(
        self,
        well_ids: List[int],
        output_path: str
    ) -> schemas.ExportResult:
        """Export wells to Kappa format"""
        result = schemas.ExportResult(
            success=True,
            output_file=output_path,
            exported_data={},
            errors=[]
        )
        
        try:
            wells = self.db.query(Well).filter(Well.id.in_(well_ids)).all()
            
            # Create Kappa project structure
            kappa_folder = Path(output_path) / "CYSMIC_Kappa"
            kappa_folder.mkdir(parents=True, exist_ok=True)
            
            for well in wells:
                # Export well data as JSON for Kappa import
                well_data = {
                    "well_name": well.name,
                    "uwi": well.uwi,
                    "field": well.field,
                    "coordinates": {
                        "latitude": well.latitude,
                        "longitude": well.longitude
                    },
                    "depths": {
                        "md": well.total_depth_md,
                        "tvd": well.total_depth_tvd
                    }
                }
                
                well_file = kappa_folder / f"{well.name}_welltest.json"
                with open(well_file, 'w') as f:
                    json.dump(well_data, f, indent=2)
                
                result.exported_data[well.name] = str(well_file)
                
                self._track_sync("kappa", "well", str(well.id), well.name, "synced")
            
            self.db.commit()
            
        except Exception as e:
            result.success = False
            result.errors.append(str(e))
        
        return result
    
    # ===================
    # Data Format Conversion
    # ===================
    
    def convert_format(
        self,
        source_data: Any,
        source_format: str,
        target_format: str
    ) -> Any:
        """Convert data between formats"""
        
        if source_format == "las" and target_format == "csv":
            # LAS to CSV conversion
            return self._las_to_csv(source_data)
        elif source_format == "csv" and target_format == "json":
            # CSV to JSON
            return self._csv_to_json(source_data)
        elif source_format == "json" and target_format == "csv":
            # JSON to CSV
            return self._json_to_csv(source_data)
        
        return source_data
    
    def _las_to_csv(self, las_data: dict) -> str:
        """Convert LAS data to CSV string"""
        lines = ["DEPTH,VALUE"]
        for depth, value in zip(las_data.get("depths", []), las_data.get("values", [])):
            lines.append(f"{depth},{value}")
        return "\n".join(lines)
    
    def _csv_to_json(self, csv_data: str) -> dict:
        """Convert CSV string to JSON"""
        lines = csv_data.strip().split("\n")
        if not lines:
            return {}
        
        headers = lines[0].split(",")
        data = []
        
        for line in lines[1:]:
            values = line.split(",")
            row = {headers[i]: values[i] for i in range(len(values))}
            data.append(row)
        
        return {"data": data}
    
    def _json_to_csv(self, json_data: dict) -> str:
        """Convert JSON to CSV string"""
        if "data" not in json_data:
            return ""
        
        data = json_data["data"]
        if not data:
            return ""
        
        headers = list(data[0].keys())
        lines = [",".join(headers)]
        
        for row in data:
            values = [str(row.get(h, "")) for h in headers]
            lines.append(",".join(values))
        
        return "\n".join(lines)
    
    # ===================
    # Sync Tracking
    # ===================
    
    def _track_sync(
        self,
        source: str,
        entity_type: str,
        entity_id: str,
        external_id: str,
        status: str
    ):
        """Track sync status with external system"""
        sync = IntegrationSync(
            source=source,
            entity_type=entity_type,
            entity_id=entity_id,
            external_id=external_id,
            sync_status=status,
            last_sync=datetime.utcnow()
        )
        self.db.add(sync)
    
    def get_sync_status(self, source: str) -> List[IntegrationSync]:
        """Get sync status for a source"""
        return self.db.query(IntegrationSync).filter(
            IntegrationSync.source == source
        ).order_by(IntegrationSync.last_sync.desc()).all()
