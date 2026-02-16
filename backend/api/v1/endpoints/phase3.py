"""
API Endpoints for Phase 3 - Intelligence & Learning
Agent Memory, Reasoning Traces, and Monitoring
"""
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from backend.core.database import get_db, get_sync_db
from backend.core.security import get_current_user
from backend.schemas.phase3 import (
    # Memory schemas
    UserPreferenceCreate, UserPreferenceResponse,
    WorkflowPatternCreate, WorkflowPatternResponse,
    ConversationContextCreate, ConversationContextResponse,
    UserSessionCreate, UserSessionResponse,
    # Alert schemas
    UserAlertCreate, UserAlertResponse,
    # Reasoning schemas
    ReasoningTraceCreate, ReasoningTraceResponse,
    DataSourceCreate, DataSourceResponse,
    # Monitoring schemas
    AlertHistoryResponse, MonitoringStatus, SystemMetrics,
)
from backend.models.memory import (
    UserPreference, WorkflowPattern, ConversationContext,
    UserSession, UserAlert,
)
from backend.models.reasoning import ReasoningTrace, DataSource, AlertHistory
from backend.models.models import User

router = APIRouter(prefix="/phase3", tags=["Phase 3 - Intelligence & Learning"])


# ================== User Preferences Endpoints ==================

@router.post("/preferences", response_model=UserPreferenceResponse)
def create_preference(
    preference: UserPreferenceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update a user preference."""
    # Check if preference already exists
    existing = db.query(UserPreference).filter(
        and_(
            UserPreference.user_id == current_user.id,
            UserPreference.category == preference.category,
            UserPreference.key == preference.key
        )
    ).first()
    
    if existing:
        # Update existing
        existing.value = preference.value
        if preference.description:
            existing.description = preference.description
        db.commit()
        db.refresh(existing)
        return existing
    
    # Create new
    db_preference = UserPreference(**preference.model_dump())
    db.add(db_preference)
    db.commit()
    db.refresh(db_preference)
    return db_preference


@router.get("/preferences", response_model=List[UserPreferenceResponse])
def get_preferences(
    category: Optional[str] = Query(None, description="Filter by category"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all preferences for current user."""
    query = db.query(UserPreference).filter(UserPreference.user_id == current_user.id)
    
    if category:
        query = query.filter(UserPreference.category == category)
    
    return query.all()


@router.get("/preferences/{pref_id}", response_model=UserPreferenceResponse)
def get_preference(
    pref_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific preference."""
    pref = db.query(UserPreference).filter(
        and_(UserPreference.id == pref_id, UserPreference.user_id == current_user.id)
    ).first()
    
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")
    
    return pref


@router.delete("/preferences/{pref_id}")
def delete_preference(
    pref_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a preference."""
    pref = db.query(UserPreference).filter(
        and_(UserPreference.id == pref_id, UserPreference.user_id == current_user.id)
    ).first()
    
    if not pref:
        raise HTTPException(status_code=404, detail="Preference not found")
    
    db.delete(pref)
    db.commit()
    return {"message": "Preference deleted"}


# ================== Workflow Patterns Endpoints ==================

@router.post("/workflows", response_model=WorkflowPatternResponse)
def create_workflow_pattern(
    pattern: WorkflowPatternCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a workflow pattern (learned or manual)."""
    db_pattern = WorkflowPattern(
        user_id=current_user.id,
        **pattern.model_dump()
    )
    db.add(db_pattern)
    db.commit()
    db.refresh(db_pattern)
    return db_pattern


@router.get("/workflows", response_model=List[WorkflowPatternResponse])
def get_workflow_patterns(
    pattern_type: Optional[str] = Query(None),
    active_only: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get workflow patterns for current user."""
    query = db.query(WorkflowPattern).filter(WorkflowPattern.user_id == current_user.id)
    
    if pattern_type:
        query = query.filter(WorkflowPattern.pattern_type == pattern_type)
    
    if active_only:
        query = query.filter(WorkflowPattern.is_active == True)
    
    return query.order_by(desc(WorkflowPattern.frequency)).all()


@router.post("/workflows/{pattern_id}/use")
def use_workflow_pattern(
    pattern_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Record that a workflow pattern was used (increases frequency)."""
    pattern = db.query(WorkflowPattern).filter(
        and_(WorkflowPattern.id == pattern_id, WorkflowPattern.user_id == current_user.id)
    ).first()
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    pattern.frequency += 1
    pattern.last_used_at = datetime.utcnow()
    
    # Update confidence based on frequency
    pattern.confidence = min(1.0, pattern.frequency / 10.0)
    
    db.commit()
    return {"message": "Pattern usage recorded", "confidence": pattern.confidence}


# ================== Conversation Context Endpoints ==================

@router.post("/context", response_model=ConversationContextResponse)
def create_context(
    context: ConversationContextCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Store conversation context."""
    db_context = ConversationContext(**context.model_dump())
    db.add(db_context)
    db.commit()
    db.refresh(db_context)
    return db_context


@router.get("/context/{conversation_id}", response_model=List[ConversationContextResponse])
def get_conversation_context(
    conversation_id: int,
    context_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get context for a conversation."""
    query = db.query(ConversationContext).filter(
        ConversationContext.conversation_id == conversation_id
    )
    
    if context_type:
        query = query.filter(ConversationContext.context_type == context_type)
    
    return query.order_by(ConversationContext.importance.desc()).all()


# ================== User Alerts Endpoints ==================

@router.post("/alerts", response_model=UserAlertResponse)
def create_alert(
    alert: UserAlertCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new alert."""
    db_alert = UserAlert(user_id=current_user.id, **alert.model_dump())
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    return db_alert


@router.get("/alerts", response_model=List[UserAlertResponse])
def get_alerts(
    active_only: bool = Query(True),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all alerts for current user."""
    query = db.query(UserAlert).filter(UserAlert.user_id == current_user.id)
    
    if active_only:
        query = query.filter(UserAlert.is_active == True)
    
    return query.all()


@router.put("/alerts/{alert_id}/toggle")
def toggle_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle alert active state."""
    alert = db.query(UserAlert).filter(
        and_(UserAlert.id == alert_id, UserAlert.user_id == current_user.id)
    ).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_active = not alert.is_active
    db.commit()
    return {"alert_id": alert_id, "is_active": alert.is_active}


# ================== Reasoning Trace Endpoints ==================

@router.post("/reasoning", response_model=ReasoningTraceResponse)
def create_reasoning_trace(
    trace: ReasoningTraceCreate,
    db: Session = Depends(get_db)
):
    """Create a reasoning trace for an AI decision."""
    db_trace = ReasoningTrace(**trace.model_dump())
    db.add(db_trace)
    db.commit()
    db.refresh(db_trace)
    return db_trace


@router.get("/reasoning", response_model=List[ReasoningTraceResponse])
def get_reasoning_traces(
    message_id: Optional[int] = Query(None),
    decision_type: Optional[str] = Query(None),
    limit: int = Query(20),
    db: Session = Depends(get_db)
):
    """Get reasoning traces."""
    query = db.query(ReasoningTrace)
    
    if message_id:
        query = query.filter(ReasoningTrace.message_id == message_id)
    
    if decision_type:
        query = query.filter(ReasoningTrace.decision_type == decision_type)
    
    return query.order_by(desc(ReasoningTrace.created_at)).limit(limit).all()


@router.get("/reasoning/{trace_id}", response_model=ReasoningTraceResponse)
def get_reasoning_trace(
    trace_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific reasoning trace with full details."""
    trace = db.query(ReasoningTrace).filter(ReasoningTrace.id == trace_id).first()
    
    if not trace:
        raise HTTPException(status_code=404, detail="Reasoning trace not found")
    
    return trace


# ================== Data Sources Endpoints ==================

@router.post("/data-sources", response_model=DataSourceResponse)
def create_data_source(
    source: DataSourceCreate,
    db: Session = Depends(get_db)
):
    """Record a data source used in reasoning."""
    db_source = DataSource(**source.model_dump())
    db.add(db_source)
    db.commit()
    db.refresh(db_source)
    return db_source


# ================== Alert History Endpoints ==================

@router.get("/alert-history", response_model=List[AlertHistoryResponse])
def get_alert_history(
    alert_id: Optional[int] = Query(None),
    acknowledged: Optional[bool] = Query(None),
    limit: int = Query(50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get alert history."""
    query = db.query(AlertHistory)
    
    if alert_id:
        query = query.filter(AlertHistory.alert_id == alert_id)
    
    if acknowledged is not None:
        query = query.filter(AlertHistory.acknowledged == acknowledged)
    
    return query.order_by(desc(AlertHistory.triggered_at)).limit(limit).all()


@router.post("/alert-history/{history_id}/acknowledge")
def acknowledge_alert(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Acknowledge an alert."""
    alert = db.query(AlertHistory).filter(AlertHistory.id == history_id).first()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.acknowledged = True
    alert.acknowledged_by = current_user.id
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    
    return {"message": "Alert acknowledged", "id": history_id}


# ================== Monitoring Dashboard Endpoints ==================

@router.get("/monitoring/status", response_model=MonitoringStatus)
def get_monitoring_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current monitoring status for dashboard."""
    
    # Count active alerts
    active_alerts = db.query(UserAlert).filter(
        and_(
            UserAlert.user_id == current_user.id,
            UserAlert.is_active == True
        )
    ).count()
    
    # Count unacknowledged alerts from last 24 hours
    yesterday = datetime.utcnow() - timedelta(days=1)
    pending_alerts = db.query(AlertHistory).filter(
        and_(
            AlertHistory.acknowledged == False,
            AlertHistory.triggered_at >= yesterday
        )
    ).count()
    
    # Get recent triggers
    recent = db.query(AlertHistory).order_by(
        desc(AlertHistory.triggered_at)
    ).limit(5).all()
    
    return MonitoringStatus(
        active_alerts=active_alerts,
        pending_alerts=pending_alerts,
        scheduled_tasks=0,  # Would count from Celery
        recent_triggers=recent,
        system_health="healthy"
    )


@router.get("/monitoring/metrics", response_model=SystemMetrics)
def get_system_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get system metrics for monitoring dashboard."""
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    week_ago = today - timedelta(days=7)
    
    return SystemMetrics(
        total_wells_monitored=0,  # Would query wells
        total_alerts_configured=db.query(UserAlert).filter(
            UserAlert.user_id == current_user.id
        ).count(),
        alerts_triggered_today=db.query(AlertHistory).filter(
            AlertHistory.triggered_at >= today
        ).count(),
        reasoning_traces_today=db.query(ReasoningTrace).filter(
            ReasoningTrace.created_at >= today
        ).count(),
        active_sessions=0  # Would query sessions
    )


from datetime import timedelta
