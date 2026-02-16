"""
Phase 4: Report Builder API Endpoints
PDF, DOCX, PPTX Report Generation
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.models import User
from backend.services.report_builder import ReportBuilder
from backend.schemas import phase4 as schemas

router = APIRouter(prefix="/reports", tags=["Phase4: Report Builder"])


def get_report_builder(db: Session = Depends(get_db)) -> ReportBuilder:
    return ReportBuilder(db)


# ===================
# Templates
# ===================

@router.post("/templates", response_model=schemas.ReportTemplate)
def create_template(
    name: str = Query(...),
    format: str = Query(...),
    description: Optional[str] = None,
    sections: List[dict] = Query(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    builder: ReportBuilder = Depends(get_report_builder)
):
    """Create a new report template"""
    return builder.create_template(
        name=name,
        format=format,
        sections=sections,
        description=description,
        owner_id=current_user.id
    )


@router.get("/templates", response_model=List[schemas.ReportTemplate])
def get_templates(
    format: Optional[str] = None,
    db: Session = Depends(get_db),
    builder: ReportBuilder = Depends(get_report_builder)
):
    """Get all report templates"""
    return builder.get_templates(format)


@router.get("/templates/{template_id}", response_model=schemas.ReportTemplate)
def get_template(
    template_id: int,
    db: Session = Depends(get_db),
    builder: ReportBuilder = Depends(get_report_builder)
):
    """Get a specific template"""
    template = builder.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


# ===================
# Reports
# ===================

@router.post("", response_model=schemas.ReportResponse)
def create_report(
    name: str = Query(...),
    format: str = Query(...),
    wells: List[int] = Query(default=[]),
    analyses: List[int] = Query(default=[]),
    sections: List[dict] = Query(default=[]),
    title: str = Query(default="CYSMIC Report"),
    subtitle: Optional[str] = None,
    template_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    builder: ReportBuilder = Depends(get_report_builder)
):
    """Create and generate a report"""
    
    # Validate format
    if format not in ["pdf", "docx", "pptx"]:
        raise HTTPException(status_code=400, detail="Format must be pdf, docx, or pptx")
    
    return builder.create_report(
        name=name,
        format=format,
        wells=wells,
        analyses=analyses,
        sections=sections,
        title=title,
        subtitle=subtitle,
        template_id=template_id,
        owner_id=current_user.id
    )


@router.get("", response_model=List[schemas.ReportResponse])
def get_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    builder: ReportBuilder = Depends(get_report_builder)
):
    """Get all reports for current user"""
    return builder.get_user_reports(current_user.id)


@router.get("/{report_id}", response_model=schemas.ReportResponse)
def get_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    builder: ReportBuilder = Depends(get_report_builder)
):
    """Get a specific report"""
    report = builder.get_report(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    builder: ReportBuilder = Depends(get_report_builder)
):
    """Delete a report"""
    success = builder.delete_report(report_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Report not found or not authorized")
    return {"status": "deleted"}


# ===================
# Default Templates
# ===================

@router.post("/templates/default")
def create_default_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    builder: ReportBuilder = Depends(get_report_builder)
):
    """Create default report templates for all formats"""
    
    templates_created = []
    
    # PDF Template
    pdf_template = builder.create_template(
        name="Standard PDF Report",
        format="pdf",
        description="Standard PDF report with wells and analysis sections",
        sections=[
            {"section_type": "well_summary", "title": "Wells Overview", "order": 1},
            {"section_type": "analysis_result", "title": "Analysis Results", "order": 2},
            {"section_type": "text", "title": "Notes", "order": 3}
        ],
        owner_id=current_user.id
    )
    templates_created.append({"id": pdf_template.id, "name": pdf_template.name})
    
    # DOCX Template
    docx_template = builder.create_template(
        name="Standard DOCX Report",
        format="docx",
        description="Standard Word document with wells and analysis",
        sections=[
            {"section_type": "well_summary", "title": "Wells Overview", "order": 1},
            {"section_type": "analysis_result", "title": "Analysis Results", "order": 2}
        ],
        owner_id=current_user.id
    )
    templates_created.append({"id": docx_template.id, "name": docx_template.name})
    
    # PPTX Template
    pptx_template = builder.create_template(
        name="Standard PPTX Presentation",
        format="pptx",
        description="Standard PowerPoint presentation",
        sections=[
            {"section_type": "well_summary", "title": "Wells", "order": 1},
            {"section_type": "analysis_result", "title": "Analysis", "order": 2}
        ],
        owner_id=current_user.id
    )
    templates_created.append({"id": pptx_template.id, "name": pptx_template.name})
    
    return {"templates_created": templates_created}
