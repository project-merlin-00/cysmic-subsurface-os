"""
Phase 4: Collaboration & Integration Schemas
- Multi-user Chat with Annotations
- Petrel/Eclipse/Kappa Integration
- Report Builder
"""
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


# ============================================
# Multi-user Chat with Annotations
# ============================================

class AnnotationType(str, Enum):
    HIGHLIGHT = "highlight"
    COMMENT = "comment"
    REPLY = "reply"
    RESOLVED = "resolved"


class AnnotationCreate(BaseModel):
    message_id: int
    content: str
    annotation_type: AnnotationType = AnnotationType.COMMENT
    parent_annotation_id: Optional[int] = None
    highlights: Optional[List[dict]] = None  # Text ranges to highlight


class AnnotationResponse(BaseModel):
    id: int
    message_id: int
    user_id: int
    user_name: str
    content: str
    annotation_type: AnnotationType
    parent_annotation_id: Optional[int]
    highlights: Optional[List[dict]]
    is_resolved: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MentionNotification(BaseModel):
    """User mention in a message"""
    id: int
    message_id: int
    mentioned_user_id: int
    mentioned_by_user_id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSearchQuery(BaseModel):
    query: str
    conversation_id: Optional[int] = None
    user_id: Optional[int] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = 50


class ChatSearchResult(BaseModel):
    message_id: int
    conversation_id: int
    conversation_title: str
    user_name: str
    content: str
    created_at: datetime
    matched_highlight: Optional[str] = None


# ============================================
# Petrel/Eclipse/Kappa Integration
# ============================================

class PetrelProjectInfo(BaseModel):
    project_name: str
    project_path: str
    wells: List[str] = []
    seismic_volumes: List[str] = []
    petrophysical_models: List[str] = []


class EclipseDeckInfo(BaseModel):
    deck_name: str
    deck_path: str
    include_files: List[str] = []
    run_parameters: dict = {}


class KappaWorkbenchInfo(BaseModel):
    project_name: str
    project_path: str
    well_test_models: List[str] = []
    pressure_transient_models: List[str] = []


class ImportSource(str, Enum):
    PETREL = "petrel"
    ECLIPSE = "eclipse"
    KAPPA = "kappa"
    LAS = "las"
    DLIS = "dlis"
    CSV = "csv"


class ExportFormat(str, Enum):
    PETREL = "petrel"
    ECLIPSE = "eclipse"
    KAPPA = "kappa"
    LAS = "las"
    CSV = "csv"
    JSON = "json"


class ImportRequest(BaseModel):
    source: ImportSource
    file_path: str
    well_id: Optional[int] = None
    options: dict = Field(default_factory=dict)


class ExportRequest(BaseModel):
    format: ExportFormat
    wells: List[int]
    include_data: List[str] = ["production", "well_tests", "properties"]
    output_path: Optional[str] = None


class ImportResult(BaseModel):
    success: bool
    imported_wells: List[str] = []
    imported_data: dict = {}
    errors: List[str] = []
    warnings: List[str] = []


class ExportResult(BaseModel):
    success: bool
    output_file: str
    exported_data: dict = {}
    errors: List[str] = []


class DataConversionRequest(BaseModel):
    source_format: ImportSource
    target_format: ExportFormat
    input_data: Any
    options: dict = Field(default_factory=dict)


# ============================================
# Report Builder
# ============================================

class ReportFormat(str, Enum):
    PDF = "pdf"
    DOCX = "docx"
    PPTX = "pptx"


class ReportSectionType(str, Enum):
    TEXT = "text"
    TABLE = "table"
    CHART = "chart"
    IMAGE = "image"
    WELL_SUMMARY = "well_summary"
    ANALYSIS_RESULT = "analysis_result"


class ReportSection(BaseModel):
    section_type: ReportSectionType
    title: str
    content: Any  # text, table data, chart config, image path
    order: int


class ReportTemplate(BaseModel):
    id: Optional[int] = None
    name: str
    description: Optional[str] = None
    format: ReportFormat
    sections: List[ReportSection]
    is_default: bool = False
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ReportCreate(BaseModel):
    template_id: Optional[int] = None
    name: str
    format: ReportFormat
    wells: List[int] = []
    analyses: List[int] = []
    sections: List[ReportSection] = []
    title: str = "CYSMIC Report"
    subtitle: Optional[str] = None
    include_charts: bool = True
    include_tables: bool = True


class ReportResponse(BaseModel):
    id: int
    name: str
    format: ReportFormat
    file_path: str
    download_url: Optional[str]
    status: str  # "generating", "completed", "failed"
    created_at: datetime
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class ChartConfig(BaseModel):
    chart_type: str  # "line", "bar", "scatter", "area"
    title: str
    x_label: str
    y_label: str
    data: List[dict]
    options: dict = Field(default_factory=dict)


class TableConfig(BaseModel):
    headers: List[str]
    rows: List[List[Any]]
    title: Optional[str] = None
    options: dict = Field(default_factory=dict)
