"""
Reasoning Trace Service
Phase 3: Intelligence & Learning

Provides explainable AI by tracking:
- Data sources used in decisions
- Step-by-step reasoning chains
- Confidence scores and alternatives
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from backend.models.reasoning import ReasoningTrace, DataSource, ReasoningStep, AlertHistory
from backend.models.memory import UserAlert


class ReasoningService:
    """Service for managing reasoning traces - explainable AI"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ================== Data Sources ==================
    
    def record_data_source(self, source_type: str, source_id: str = None,
                          source_name: str = None, data_extracted: Dict = None,
                          source_location: str = None, relevance_score: float = 1.0,
                          access_method: str = None, query_time_ms: int = None) -> DataSource:
        """Record a data source used in reasoning."""
        source = DataSource(
            source_type=source_type,
            source_id=source_id,
            source_name=source_name,
            data_extracted=data_extracted or {},
            source_location=source_location,
            relevance_score=relevance_score,
            access_method=access_method,
            query_time_ms=query_time_ms
        )
        self.db.add(source)
        self.db.commit()
        self.db.refresh(source)
        return source
    
    # ================== Reasoning Traces ==================
    
    def create_trace(self, message_id: int, decision_type: str, 
                     decision_summary: str, reasoning_chain: List[Dict] = None,
                     data_sources: List[Dict] = None, confidence: float = 1.0,
                     alternatives_considered: List[Dict] = None) -> ReasoningTrace:
        """Create a new reasoning trace."""
        trace = ReasoningTrace(
            message_id=message_id,
            decision_type=decision_type,
            decision_summary=decision_summary,
            reasoning_chain=reasoning_chain or [],
            data_sources=data_sources or [],
            confidence=confidence,
            alternatives_considered=alternatives_considered or []
        )
        self.db.add(trace)
        self.db.commit()
        self.db.refresh(trace)
        return trace
    
    def add_reasoning_step(self, trace_id: int, step_number: int, step_type: str,
                           description: str, input_data: Dict = None,
                           output_data: Dict = None, confidence: float = 1.0,
                           depends_on: List[int] = None) -> ReasoningStep:
        """Add a step to a reasoning chain."""
        step = ReasoningStep(
            trace_id=trace_id,
            step_number=step_number,
            step_type=step_type,
            description=description,
            input_data=input_data or {},
            output_data=output_data or {},
            confidence=confidence,
            depends_on=depends_on or []
        )
        self.db.add(step)
        self.db.commit()
        self.db.refresh(step)
        return step
    
    def get_trace(self, trace_id: int) -> Optional[ReasoningTrace]:
        """Get a reasoning trace by ID."""
        return self.db.query(ReasoningTrace).filter(ReasoningTrace.id == trace_id).first()
    
    def get_traces_for_message(self, message_id: int) -> List[ReasoningTrace]:
        """Get all reasoning traces for a message."""
        return self.db.query(ReasoningTrace).filter(
            ReasoningTrace.message_id == message_id
        ).order_by(ReasoningTrace.created_at.desc()).all()
    
    def verify_trace(self, trace_id: int, user_id: int) -> ReasoningTrace:
        """Mark a reasoning trace as verified by a human."""
        trace = self.get_trace(trace_id)
        if trace:
            trace.is_verified = True
            trace.verified_by = user_id
            trace.verified_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(trace)
        return trace
    
    def record_error(self, trace_id: int, error: str, correction: str = None) -> ReasoningTrace:
        """Record an error in reasoning."""
        trace = self.get_trace(trace_id)
        if trace:
            trace.error = error
            trace.correction = correction
            self.db.commit()
            self.db.refresh(trace)
        return trace
    
    # ================== Explainability Helpers ==================
    
    def build_explanation(self, trace_id: int) -> Dict:
        """Build a human-readable explanation from a reasoning trace."""
        trace = self.get_trace(trace_id)
        if not trace:
            return {}
        
        explanation = {
            "decision": trace.decision_summary,
            "confidence": f"{trace.confidence * 100:.0f}%",
            "reasoning_steps": [],
            "data_sources": [],
            "alternatives": []
        }
        
        # Add reasoning steps
        for step in trace.reasoning_chain:
            explanation["reasoning_steps"].append({
                "step": step.get("step_number"),
                "type": step.get("step_type"),
                "description": step.get("description")
            })
        
        # Add data sources
        for source in trace.data_sources:
            explanation["data_sources"].append({
                "type": source.get("source_type"),
                "name": source.get("source_name", source.get("source_type")),
                "relevance": f"{source.get('relevance', 1.0) * 100:.0f}%"
            })
        
        # Add alternatives
        for alt in trace.alternatives_considered:
            explanation["alternatives"].append({
                "option": alt.get("option"),
                "reason_rejected": alt.get("reason")
            })
        
        return explanation
    
    def get_data_source_summary(self) -> Dict:
        """Get summary of data sources used."""
        sources = self.db.query(DataSource).all()
        
        summary = {
            "total": len(sources),
            "by_type": {},
            "average_query_time_ms": 0
        }
        
        total_time = 0
        for source in sources:
            summary["by_type"][source.source_type] = summary["by_type"].get(source.source_type, 0) + 1
            if source.query_time_ms:
                total_time += source.query_time_ms
        
        if sources:
            summary["average_query_time_ms"] = total_time // len(sources)
        
        return summary


class MonitoringService:
    """Service for proactive monitoring and alerts"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ================== Alerts ==================
    
    def create_alert(self, user_id: int, name: str, alert_type: str,
                     target_type: str = None, target_id: int = None,
                     condition: Dict = None, schedule: Dict = None,
                     notify_on_trigger: bool = True, 
                     notify_channels: List[str] = None) -> UserAlert:
        """Create a new alert."""
        alert = UserAlert(
            user_id=user_id,
            name=name,
            alert_type=alert_type,
            target_type=target_type,
            target_id=target_id,
            condition=condition or {},
            schedule=schedule or {},
            notify_on_trigger=notify_on_trigger,
            notify_channels=notify_channels or ["in_app"]
        )
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        return alert
    
    def get_active_alerts(self, user_id: int) -> List[UserAlert]:
        """Get all active alerts for a user."""
        return self.db.query(UserAlert).filter(
            and_(
                UserAlert.user_id == user_id,
                UserAlert.is_active == True
            )
        ).all()
    
    def check_threshold(self, current_value: float, operator: str, 
                        threshold: float) -> bool:
        """Check if a value meets a threshold condition."""
        if operator == "gt":
            return current_value > threshold
        elif operator == "lt":
            return current_value < threshold
        elif operator == "gte":
            return current_value >= threshold
        elif operator == "lte":
            return current_value <= threshold
        elif operator == "eq":
            return current_value == threshold
        return False
    
    def trigger_alert(self, alert_id: int, condition_met: Dict,
                      message: str = None, severity: str = "info") -> AlertHistory:
        """Record that an alert was triggered."""
        alert = self.db.query(UserAlert).filter(UserAlert.id == alert_id).first()
        if not alert:
            return None
        
        # Update alert
        alert.last_triggered_at = datetime.utcnow()
        alert.trigger_count += 1
        
        # Create history record
        history = AlertHistory(
            alert_id=alert_id,
            triggered_at=datetime.utcnow(),
            condition_met=condition_met,
            message=message or f"Alert '{alert.name}' triggered",
            severity=severity
        )
        self.db.add(history)
        self.db.commit()
        self.db.refresh(history)
        
        return history
    
    def get_alert_history(self, user_id: int, limit: int = 50) -> List[AlertHistory]:
        """Get alert history for a user."""
        # Get alerts for user
        alert_ids = [a.id for a in self.get_active_alerts(user_id)]
        
        if not alert_ids:
            return []
        
        return self.db.query(AlertHistory).filter(
            AlertHistory.alert_id.in_(alert_ids)
        ).order_by(AlertHistory.triggered_at.desc()).limit(limit).all()
    
    def acknowledge_alert(self, history_id: int, user_id: int) -> AlertHistory:
        """Acknowledge an alert."""
        alert = self.db.query(AlertHistory).filter(AlertHistory.id == history_id).first()
        if alert:
            alert.acknowledged = True
            alert.acknowledged_by = user_id
            alert.acknowledged_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(alert)
        return alert


from sqlalchemy import and_
from typing import List
