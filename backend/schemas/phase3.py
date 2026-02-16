"""
Pydantic Schemas for Phase 3 - Intelligence & Learning
Agent Memory, Reasoning Traces, and Monitoring
"""
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ================== Agent Memory Schemas ==================

class UserPreferenceBase(BaseModel):
    category: str
    key: str
    value: Any
    description: Optional[str] = None
    is_default: bool = False


class UserPreferenceCreate(UserPreferenceBase):
    user_id: int


class UserPreferenceResponse(UserPreferenceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WorkflowPatternBase(BaseModel):
    name: str
    pattern_type: str
    trigger_events: List[dict] = Field(default_factory=list)
    action_sequence: List[dict] = Field(default_factory=list)
    context_conditions: dict = Field(default_factory=dict)


class WorkflowPatternCreate(WorkflowPatternBase):
    user_id: int


class WorkflowPatternResponse(WorkflowPatternBase):
    id: int
    user_id: int
    frequency: int
    confidence: float
    is_active: bool
    last_used_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ConversationContextBase(BaseModel):
    context_type: str
    key: str
    value: Any
    importance: float = 1.0


class ConversationContextCreate(ConversationContextBase):
    conversation_id: int


class ConversationContextResponse(ConversationContextBase):
    id: int
    conversation_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class UserSessionBase(BaseModel):
    session_id: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class UserSessionCreate(UserSessionBase):
    user_id: int


class UserSessionResponse(UserSessionBase):
    id: int
    user_id: int
    started_at: datetime
    ended_at: Optional[datetime]
    messages_count: int
    tools_used: List[str]
    wells_accessed: List[int]
    is_active: bool

    class Config:
        from_attributes = True


# ================== Alert Schemas ==================

class AlertCondition(BaseModel):
    metric: str
    operator: str  # "gt", "lt", "eq", "gte", "lte"
    value: float


class AlertSchedule(BaseModel):
    frequency: str  # "hourly", "daily", "weekly", "custom"
    time: Optional[str] = None  # "09:00"
    day_of_week: Optional[int] = None  # 0-6


class UserAlertBase(BaseModel):
    name: str
    alert_type: str
    target_type: Optional[str] = None
    target_id: Optional[int] = None
    condition: Optional[dict] = None
    schedule: Optional[dict] = None
    notify_on_trigger: bool = True
    notify_channels: List[str] = ["in_app"]


class UserAlertCreate(UserAlertBase):
    user_id: int


class UserAlertResponse(UserAlertBase):
    id: int
    user_id: int
    is_active: bool
    last_triggered_at: Optional[datetime]
    trigger_count: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ================== Reasoning Trace Schemas ==================

class ReasoningStepSchema(BaseModel):
    step_number: int
    step_type: str  # "observation", "analysis", "inference", "decision"
    description: str
    input_data: dict = Field(default_factory=dict)
    output_data: dict = Field(default_factory=dict)
    confidence: float = 1.0
    depends_on: List[int] = Field(default_factory=list)


class DataSourceSchema(BaseModel):
    source_type: str
    source_id: Optional[str] = None
    source_name: Optional[str] = None
    data_extracted: dict = Field(default_factory=dict)
    source_location: Optional[str] = None
    relevance_score: float = 1.0


class ReasoningTraceBase(BaseModel):
    decision_type: str
    decision_summary: str
    reasoning_chain: List[dict] = Field(default_factory=list)
    data_sources: List[dict] = Field(default_factory=list)
    confidence: float = 1.0
    alternatives_considered: List[dict] = Field(default_factory=list)


class ReasoningTraceCreate(ReasoningTraceBase):
    message_id: Optional[int] = None


class ReasoningTraceResponse(ReasoningTraceBase):
    id: int
    message_id: Optional[int]
    is_verified: bool
    verified_by: Optional[int]
    verified_at: Optional[datetime]
    error: Optional[str]
    correction: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DataSourceBase(BaseModel):
    source_type: str
    source_id: Optional[str] = None
    source_name: Optional[str] = None
    data_extracted: dict = Field(default_factory=dict)
    source_location: Optional[str] = None
    relevance_score: float = 1.0
    access_method: Optional[str] = None
    query_time_ms: Optional[int] = None


class DataSourceCreate(DataSourceBase):
    pass


class DataSourceResponse(DataSourceBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# ================== Alert History Schemas ==================

class AlertHistoryBase(BaseModel):
    alert_id: int
    condition_met: dict
    message: Optional[str] = None
    severity: str = "info"
    action_taken: dict = Field(default_factory=dict)


class AlertHistoryCreate(AlertHistoryBase):
    pass


class AlertHistoryResponse(AlertHistoryBase):
    id: int
    triggered_at: datetime
    notifications_sent: List[str]
    acknowledged: bool
    acknowledged_by: Optional[int]
    acknowledged_at: Optional[datetime]

    class Config:
        from_attributes = True


# ================== Monitoring Dashboard Schemas ==================

class MonitoringStatus(BaseModel):
    """Status of all monitoring components"""
    active_alerts: int
    pending_alerts: int
    scheduled_tasks: int
    recent_triggers: List[AlertHistoryResponse] = Field(default_factory=list)
    system_health: str = "healthy"


class SystemMetrics(BaseModel):
    """System metrics for monitoring dashboard"""
    total_wells_monitored: int
    total_alerts_configured: int
    alerts_triggered_today: int
    reasoning_traces_today: int
    active_sessions: int
