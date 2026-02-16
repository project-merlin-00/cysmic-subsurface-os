"""
Phase 4: Integration API Endpoints
Petrel/Eclipse/Kappa Integration
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.models import User
from backend.services.integration import IntegrationService
from backend.schemas import phase4 as schemas

router = APIRouter(prefix="/integration", tags=["Phase4: Integration"])


def get_integration_service(db: Session = Depends(get_db)) -> IntegrationService:
    return IntegrationService(db)


# ===================
# Petrel Integration
# ===================

@router.post("/petrel/parse")
def parse_petrel_project(
    project_path: str = Form(...),
    db: Session = Depends(get_db),
    service: IntegrationService = Depends(get_integration_service)
):
    """Parse Petrel project and extract metadata"""
    return service.parse_petrel_project(project_path)


@router.post("/petrel/import")
def import_from_petrel(
    project_path: str = Form(...),
    well_names: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    service: IntegrationService = Depends(get_integration_service)
):
    """Import wells from Petrel project"""
    wells = well_names.split(",") if well_names else None
    return service.import_from_petrel(project_path, wells)


@router.post("/petrel/export")
def export_to_petrel(
    wells: List[int] = Form(...),
    output_path: str = Form(...),
    db: Session = Depends(get_db),
    service: IntegrationService = Depends(get_integration_service)
):
    """Export wells to Petrel-compatible format"""
    return service.export_to_petrel(wells, output_path)


# ===================
# Eclipse Integration
# ===================

@router.post("/eclipse/parse")
def parse_eclipse_deck(
    deck_path: str = Form(...),
    db: Session = Depends(get_db),
    service: IntegrationService = Depends(get_integration_service)
):
    """Parse Eclipse deck (.DATA file)"""
    return service.parse_eclipse_deck(deck_path)


@router.post("/eclipse/import")
def import_from_eclipse(
    deck_path: str = Form(...),
    db: Session = Depends(get_db),
    service: IntegrationService = Depends(get_integration_service)
):
    """Import data from Eclipse deck"""
    return service.import_from_eclipse(deck_path)


@router.post("/eclipse/export")
def export_to_eclipse(
    wells: List[int] = Form(...),
    output_path: str = Form(...),
    db: Session = Depends(get_db),
    service: IntegrationService = Depends(get_integration_service)
):
    """Export wells to Eclipse format"""
    return service.export_to_eclipse(wells, output_path)


# ===================
# Kappa Integration
# ===================

@router.post("/kappa/parse")
def parse_kappa_workbench(
    project_path: str = Form(...),
    db: Session = Depends(get_db),
    service: IntegrationService = Depends(get_integration_service)
):
    """Parse Kappa Workbench project"""
    return service.parse_kappa_workbench(project_path)


@router.post("/kappa/import")
def import_from_kappa(
    project_path: str = Form(...),
    model_names: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    service: IntegrationService = Depends(get_integration_service)
):
    """Import from Kappa Workbench"""
    models = model_names.split(",") if model_names else None
    return service.import_from_kappa(project_path, models)


@router.post("/kappa/export")
def export_to_kappa(
    wells: List[int] = Form(...),
    output_path: str = Form(...),
    db: Session = Depends(get_db),
    service: IntegrationService = Depends(get_integration_service)
):
    """Export wells to Kappa format"""
    return service.export_to_kappa(wells, output_path)


# ===================
# Data Conversion
# ===================

@router.post("/convert")
def convert_data(
    source_format: str = Form(...),
    target_format: str = Form(...),
    data: str = Form(...),
    service: IntegrationService = Depends(get_integration_service)
):
    """Convert data between formats"""
    return service.convert_format(data, source_format, target_format)


# ===================
# Sync Status
# ===================

@router.get("/sync/status/{source}")
def get_sync_status(
    source: str,
    db: Session = Depends(get_db),
    service: IntegrationService = Depends(get_integration_service)
):
    """Get sync status for a source"""
    return service.get_sync_status(source)
