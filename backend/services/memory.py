"""
Agent Memory Service
Phase 3: Intelligence & Learning

Provides utilities for:
- Storing and retrieving user preferences
- Learning workflow patterns
- Managing conversation context
"""
from typing import List, Optional, Any, Dict
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc

from backend.models.memory import (
    UserPreference, WorkflowPattern, ConversationContext,
    UserSession, UserAlert
)
from backend.models.models import Conversation


class MemoryService:
    """Service for managing agent memory - user preferences, patterns, context"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ================== User Preferences ==================
    
    def get_preference(self, user_id: int, category: str, key: str) -> Optional[Any]:
        """Get a specific preference value."""
        pref = self.db.query(UserPreference).filter(
            and_(
                UserPreference.user_id == user_id,
                UserPreference.category == category,
                UserPreference.key == key
            )
        ).first()
        return pref.value if pref else None
    
    def set_preference(self, user_id: int, category: str, key: str, value: Any, 
                       description: str = None) -> UserPreference:
        """Set a preference (creates or updates)."""
        existing = self.db.query(UserPreference).filter(
            and_(
                UserPreference.user_id == user_id,
                UserPreference.category == category,
                UserPreference.key == key
            )
        ).first()
        
        if existing:
            existing.value = value
            self.db.commit()
            self.db.refresh(existing)
            return existing
        
        new_pref = UserPreference(
            user_id=user_id,
            category=category,
            key=key,
            value=value,
            description=description
        )
        self.db.add(new_pref)
        self.db.commit()
        self.db.refresh(new_pref)
        return new_pref
    
    def get_all_preferences(self, user_id: int, category: str = None) -> List[UserPreference]:
        """Get all preferences for a user."""
        query = self.db.query(UserPreference).filter(UserPreference.user_id == user_id)
        if category:
            query = query.filter(UserPreference.category == category)
        return query.all()
    
    # ================== Workflow Patterns ==================
    
    def learn_workflow_pattern(self, user_id: int, trigger_events: List[Dict], 
                                action_sequence: List[Dict], context_conditions: Dict = None,
                                pattern_type: str = "sequence") -> WorkflowPattern:
        """Learn a new workflow pattern from user behavior."""
        # Check if similar pattern exists
        existing = self.db.query(WorkflowPattern).filter(
            and_(
                WorkflowPattern.user_id == user_id,
                WorkflowPattern.pattern_type == pattern_type,
                WorkflowPattern.action_sequence == action_sequence
            )
        ).first()
        
        if existing:
            existing.frequency += 1
            existing.last_used_at = datetime.utcnow()
            existing.confidence = min(1.0, existing.frequency / 10.0)
            self.db.commit()
            self.db.refresh(existing)
            return existing
        
        pattern = WorkflowPattern(
            user_id=user_id,
            name=f"Pattern {len(action_sequence)} steps",
            pattern_type=pattern_type,
            trigger_events=trigger_events,
            action_sequence=action_sequence,
            context_conditions=context_conditions or {},
            frequency=1,
            confidence=0.1
        )
        self.db.add(pattern)
        self.db.commit()
        self.db.refresh(pattern)
        return pattern
    
    def get_recommended_patterns(self, user_id: int, context: Dict) -> List[WorkflowPattern]:
        """Get workflow patterns that match current context."""
        patterns = self.db.query(WorkflowPattern).filter(
            and_(
                WorkflowPattern.user_id == user_id,
                WorkflowPattern.is_active == True,
                WorkflowPattern.confidence >= 0.3
            )
        ).order_by(desc(WorkflowPattern.confidence)).limit(5).all()
        
        # Filter by context relevance
        matched = []
        for p in patterns:
            if self._matches_context(p.context_conditions, context):
                matched.append(p)
        
        return matched
    
    def _matches_context(self, pattern_conditions: Dict, current_context: Dict) -> bool:
        """Check if pattern conditions match current context."""
        if not pattern_conditions:
            return True
        for key, value in pattern_conditions.items():
            if current_context.get(key) != value:
                return False
        return True
    
    # ================== Conversation Context ==================
    
    def store_context(self, conversation_id: int, context_type: str, 
                      key: str, value: Any, importance: float = 1.0) -> ConversationContext:
        """Store context for a conversation."""
        existing = self.db.query(ConversationContext).filter(
            and_(
                ConversationContext.conversation_id == conversation_id,
                ConversationContext.context_type == context_type,
                ConversationContext.key == key
            )
        ).first()
        
        if existing:
            existing.value = value
            existing.importance = importance
            self.db.commit()
            self.db.refresh(existing)
            return existing
        
        ctx = ConversationContext(
            conversation_id=conversation_id,
            context_type=context_type,
            key=key,
            value=value,
            importance=importance
        )
        self.db.add(ctx)
        self.db.commit()
        self.db.refresh(ctx)
        return ctx
    
    def get_conversation_context(self, conversation_id: int, 
                                  context_type: str = None) -> List[ConversationContext]:
        """Get all context for a conversation."""
        query = self.db.query(ConversationContext).filter(
            ConversationContext.conversation_id == conversation_id
        )
        if context_type:
            query = query.filter(ConversationContext.context_type == context_type)
        return query.order_by(ConversationContext.importance.desc()).all()
    
    def build_context_summary(self, conversation_id: int) -> Dict:
        """Build a summary of all context for a conversation."""
        contexts = self.get_conversation_context(conversation_id)
        summary = {}
        for ctx in contexts:
            if ctx.context_type not in summary:
                summary[ctx.context_type] = {}
            summary[ctx.context_type][ctx.key] = ctx.value
        return summary
    
    # ================== User Sessions ==================
    
    def start_session(self, user_id: int, session_id: str, 
                      ip_address: str = None, user_agent: str = None) -> UserSession:
        """Start a new user session."""
        session = UserSession(
            user_id=user_id,
            session_id=session_id,
            ip_address=ip_address,
            user_agent=user_agent
        )
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        return session
    
    def update_session(self, session_id: str, messages_count: int = None,
                       tool_used: str = None, well_accessed: int = None):
        """Update session activity."""
        session = self.db.query(UserSession).filter(
            UserSession.session_id == session_id
        ).first()
        
        if not session:
            return
        
        if messages_count is not None:
            session.messages_count = messages_count
        
        if tool_used:
            tools = session.tools_used or []
            if tool_used not in tools:
                tools.append(tool_used)
                session.tools_used = tools
        
        if well_accessed:
            wells = session.wells_accessed or []
            if well_accessed not in wells:
                wells.append(well_accessed)
                session.wells_accessed = wells
        
        self.db.commit()
    
    def end_session(self, session_id: str):
        """End a user session."""
        session = self.db.query(UserSession).filter(
            UserSession.session_id == session_id
        ).first()
        
        if session:
            session.is_active = False
            session.ended_at = datetime.utcnow()
            self.db.commit()
