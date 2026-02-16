"""
Reasoning Trace System - Database Models
Phase 3: Intelligence & Learning
Explainable AI - Every decision traceable to data sources and reasoning
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from enum import Enum

from backend.core.database import Base, TimestampMixin


class ReasoningTrace(Base, TimestampMixin):
    """
    Stores the reasoning chain for AI decisions.
    Enables explainable AI by logging every decision's data sources and reasoning.
    """
    __tablename__ = "reasoning_traces"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Link to the message/decision
    message_id = Column(Integer, ForeignKey("messages.id"), nullable=True, index=True)
    
    # Decision context
    decision_type = Column(String(50), nullable=False)  # "analysis_choice", "tool_selection", "parameter_suggestion"
    decision_summary = Column(Text, nullable=False)
    
    # Reasoning chain (step-by-step)
    reasoning_chain = Column(JSON, default=list)  # List of reasoning steps
    
    # Data sources used (with citations)
    data_sources = Column(JSON, default=list)  # [{"source": "well_data", "id": 123, "relevance": 0.95}]
    
    # Confidence and alternative consideration
    confidence = Column(Float, default=1.0)  # 0-1
    alternatives_considered = Column(JSON, default=list)  # Other options that were rejected
    
    # Human verification
    is_verified = Column(Boolean, default=False)
    verified_by = Column(Integer, ForeignKey("users.id"))
    verified_at = Column(DateTime)
    
    # Error tracking
    error = Column(Text)
    correction = Column(Text)


class DataSource(Base, TimestampMixin):
    """
    Tracks data sources used in reasoning.
    Provides traceability and provenance for AI decisions.
    """
    __tablename__ = "data_sources"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Source identification
    source_type = Column(String(50), nullable=False)  # "well", "file", "analysis", "user_input", "knowledge_base"
    source_id = Column(String(100), index=True)  # ID in the source system
    source_name = Column(String(255))
    
    # What data was used
    data_extracted = Column(JSON, default=dict)  # Specific fields/values used
    
    # Provenance
    source_location = Column(String(500))  # File path, API endpoint, etc.
    source_hash = Column(String(64))  # Hash of source data for integrity
    
    # Relevance to decisions
    relevance_score = Column(Float, default=1.0)  # How relevant this source was
    
    # Access metadata
    access_method = Column(String(50))  # "direct_query", "file_parse", "api_call", "rag_retrieval"
    query_time_ms = Column(Integer)  # How long it took to fetch


class ReasoningStep(Base, TimestampMixin):
    """
    Individual step in a reasoning chain.
    """
    __tablename__ = "reasoning_steps"
    
    id = Column(Integer, primary_key=True, index=True)
    trace_id = Column(Integer, ForeignKey("reasoning_traces.id"), nullable=False, index=True)
    
    # Step identification
    step_number = Column(Integer, nullable=False)
    step_type = Column(String(50), nullable=False)  # "observation", "analysis", "inference", "decision"
    
    # Step content
    description = Column(Text, nullable=False)
    input_data = Column(JSON, default=dict)
    output_data = Column(JSON, default=dict)
    
    # Step confidence
    confidence = Column(Float, default=1.0)
    
    # Dependencies (what other steps this depends on)
    depends_on = Column(JSON, default=list)  # List of step numbers


class AlertHistory(Base, TimestampMixin):
    """
    History of triggered alerts for monitoring and auditing.
    """
    __tablename__ = "alert_history"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(Integer, ForeignKey("user_alerts.id"), nullable=False, index=True)
    
    # Trigger info
    triggered_at = Column(DateTime, nullable=False)
    condition_met = Column(JSON, nullable=False)  # What condition was triggered
    
    # What happened
    message = Column(Text)
    severity = Column(String(20), default="info")  # "info", "warning", "critical"
    
    # Action taken
    action_taken = Column(JSON, default=dict)
    notifications_sent = Column(JSON, default=list)
    
    # Acknowledgment
    acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(Integer, ForeignKey("users.id"))
    acknowledged_at = Column(DateTime)
