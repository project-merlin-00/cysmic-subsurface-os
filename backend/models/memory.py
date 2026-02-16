"""
Agent Memory System - Database Models
Phase 3: Intelligence & Learning
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from datetime import datetime

from backend.core.database import Base, TimestampMixin


class UserPreference(Base, TimestampMixin):
    """User preferences storage - UI settings, defaults, etc."""
    __tablename__ = "user_preferences"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Preference category
    category = Column(String(50), nullable=False)  # "ui", "analysis", "notifications", "display"
    key = Column(String(100), nullable=False)
    value = Column(JSON, nullable=False)  # Store any type as JSON
    
    # Description
    description = Column(Text)
    
    # Is this preference inherited from defaults?
    is_default = Column(Boolean, default=False)
    
    __table_args__ = (
        {'mysql_engine': 'InnoDB', 'mysql_charset': 'utf8mb4'},
    )


class WorkflowPattern(Base, TimestampMixin):
    """Learned workflow patterns from user behavior"""
    __tablename__ = "workflow_patterns"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Pattern identification
    name = Column(String(255), nullable=False)
    pattern_type = Column(String(50), nullable=False)  # "sequence", "frequency", "context"
    
    # What the pattern captures
    trigger_events = Column(JSON, default=list)  # Events that trigger this pattern
    action_sequence = Column(JSON, default=list)  # Ordered list of actions
    frequency = Column(Integer, default=1)  # How often this pattern occurs
    
    # Context where pattern applies
    context_conditions = Column(JSON, default=dict)  # e.g., {"well_type": "oil", "status": "producing"}
    
    # Confidence score (0-1) based on occurrence
    confidence = Column(Float, default=0.0)
    
    # Is this pattern active for recommendations?
    is_active = Column(Boolean, default=True)
    
    # Last used timestamp
    last_used_at = Column(DateTime, default=datetime.utcnow)


class ConversationContext(Base, TimestampMixin):
    """Persistent conversation context - remembers what's been discussed"""
    __tablename__ = "conversation_contexts"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"), nullable=False, index=True)
    
    # Context type
    context_type = Column(String(50), nullable=False)  # "well_info", "analysis_state", "parameter_set"
    
    # Context data
    key = Column(String(100), nullable=False)
    value = Column(JSON)
    
    # Importance score for context retention
    importance = Column(Float, default=1.0)


class UserSession(Base, TimestampMixin):
    """User session tracking for analytics"""
    __tablename__ = "user_sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Session info
    session_id = Column(String(100), unique=True, index=True)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime)
    
    # Activity summary
    messages_count = Column(Integer, default=0)
    tools_used = Column(JSON, default=list)
    wells_accessed = Column(JSON, default=list)
    
    # Session metadata
    ip_address = Column(String(50))
    user_agent = Column(Text)
    
    # Is session active?
    is_active = Column(Boolean, default=True)


class UserAlert(Base, TimestampMixin):
    """User-configured alerts"""
    __tablename__ = "user_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Alert configuration
    name = Column(String(255), nullable=False)
    alert_type = Column(String(50), nullable=False)  # "threshold", "schedule", "anomaly"
    
    # What to monitor
    target_type = Column(String(50))  # "well", "field", "analysis"
    target_id = Column(Integer)
    
    # Conditions
    condition = Column(JSON)  # e.g., {"metric": "bhp", "operator": "lt", "value": 2000}
    schedule = Column(JSON)   # e.g., {"frequency": "hourly", "time": "09:00"}
    
    # Notification settings
    notify_on_trigger = Column(Boolean, default=True)
    notify_channels = Column(JSON, default=["in_app"])  # "in_app", "email", "webhook"
    
    # Alert state
    is_active = Column(Boolean, default=True)
    last_triggered_at = Column(DateTime)
    trigger_count = Column(Integer, default=0)
