"""
Phase 4: Collaboration Service
Multi-user Chat with Annotations, Mentions, and Search
"""
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
import re

from backend.models.models import Annotation, MentionNotification, Message, User, Conversation
from backend.schemas import phase4 as schemas


class CollaborationService:
    """Service for multi-user collaboration features"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ===================
    # Annotations
    # ===================
    
    def create_annotation(
        self,
        user_id: int,
        message_id: int,
        content: str,
        annotation_type: str = "comment",
        parent_annotation_id: Optional[int] = None,
        highlights: Optional[List[dict]] = None
    ) -> Annotation:
        """Create an annotation on a message"""
        annotation = Annotation(
            message_id=message_id,
            user_id=user_id,
            content=content,
            annotation_type=annotation_type,
            parent_annotation_id=parent_annotation_id,
            highlights=highlights or []
        )
        self.db.add(annotation)
        self.db.commit()
        self.db.refresh(annotation)
        return annotation
    
    def get_annotations_for_message(self, message_id: int) -> List[Annotation]:
        """Get all annotations for a message"""
        return self.db.query(Annotation).filter(
            Annotation.message_id == message_id
        ).order_by(Annotation.created_at).all()
    
    def get_annotation_thread(self, annotation_id: int) -> List[Annotation]:
        """Get an annotation and its replies"""
        annotation = self.db.query(Annotation).filter(
            Annotation.id == annotation_id
        ).first()
        if not annotation:
            return []
        
        # Get all related annotations (same thread)
        thread_ids = [annotation.id]
        
        # Find all replies (descendants)
        def get_replies(a_id):
            replies = self.db.query(Annotation).filter(
                Annotation.parent_annotation_id == a_id
            ).all()
            for r in replies:
                thread_ids.append(r.id)
                get_replies(r.id)
        
        get_replies(annotation.id)
        
        return self.db.query(Annotation).filter(
            Annotation.id.in_(thread_ids)
        ).order_by(Annotation.created_at).all()
    
    def resolve_annotation(self, annotation_id: int, user_id: int) -> Annotation:
        """Mark an annotation as resolved"""
        annotation = self.db.query(Annotation).filter(
            Annotation.id == annotation_id
        ).first()
        if annotation:
            annotation.is_resolved = True
            self.db.commit()
            self.db.refresh(annotation)
        return annotation
    
    def delete_annotation(self, annotation_id: int, user_id: int) -> bool:
        """Delete an annotation (only owner can delete)"""
        annotation = self.db.query(Annotation).filter(
            and_(Annotation.id == annotation_id, Annotation.user_id == user_id)
        ).first()
        if annotation:
            self.db.delete(annotation)
            self.db.commit()
            return True
        return False
    
    # ===================
    # Mentions & Notifications
    # ===================
    
    def parse_mentions(self, content: str) -> List[str]:
        """Extract @mentions from message content"""
        # Match @username patterns
        mentions = re.findall(r'@(\w+)', content)
        return list(set(mentions))
    
    def create_mention_notifications(
        self,
        message_id: int,
        sender_id: int,
        mentioned_usernames: List[str]
    ) -> List[MentionNotification]:
        """Create notifications for mentioned users"""
        notifications = []
        
        for username in mentioned_usernames:
            user = self.db.query(User).filter(User.username == username).first()
            if user and user.id != sender_id:  # Don't notify self
                notification = MentionNotification(
                    message_id=message_id,
                    mentioned_user_id=user.id,
                    mentioned_by_user_id=sender_id
                )
                self.db.add(notification)
                notifications.append(notification)
        
        if notifications:
            self.db.commit()
        
        return notifications
    
    def get_user_notifications(self, user_id: int, unread_only: bool = False) -> List[MentionNotification]:
        """Get notifications for a user"""
        query = self.db.query(MentionNotification).filter(
            MentionNotification.mentioned_user_id == user_id
        )
        if unread_only:
            query = query.filter(MentionNotification.is_read == False)
        return query.order_by(MentionNotification.created_at.desc()).all()
    
    def mark_notification_read(self, notification_id: int) -> MentionNotification:
        """Mark a notification as read"""
        notification = self.db.query(MentionNotification).filter(
            MentionNotification.id == notification_id
        ).first()
        if notification:
            notification.is_read = True
            self.db.commit()
            self.db.refresh(notification)
        return notification
    
    def mark_all_notifications_read(self, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        count = self.db.query(MentionNotification).filter(
            and_(
                MentionNotification.mentioned_user_id == user_id,
                MentionNotification.is_read == False
            )
        ).update({"is_read": True})
        self.db.commit()
        return count
    
    # ===================
    # Chat Search
    # ===================
    
    def search_messages(
        self,
        query: str,
        conversation_id: Optional[int] = None,
        user_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        limit: int = 50
    ) -> List[dict]:
        """Search through chat messages"""
        from sqlalchemy import func
        
        # Build filters
        filters = []
        
        # Text search - simple LIKE for now (could use full-text search)
        filters.append(Message.content.ilike(f"%{query}%"))
        
        if conversation_id:
            filters.append(Message.conversation_id == conversation_id)
        
        if user_id:
            filters.append(Message.user_id == user_id)
        
        if date_from:
            filters.append(Message.created_at >= date_from)
        
        if date_to:
            filters.append(Message.created_at <= date_to)
        
        # Execute search
        results = (
            self.db.query(Message, User, Conversation)
            .join(User, Message.user_id == User.id)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .filter(and_(*filters))
            .order_by(Message.created_at.desc())
            .limit(limit)
            .all()
        )
        
        # Format results
        search_results = []
        for msg, user, conv in results:
            # Find matched text highlight
            content_lower = msg.content.lower()
            query_lower = query.lower()
            idx = content_lower.find(query_lower)
            
            if idx >= 0:
                start = max(0, idx - 30)
                end = min(len(msg.content), idx + len(query) + 30)
                highlight = msg.content[start:end]
                if start > 0:
                    highlight = "..." + highlight
                if end < len(msg.content):
                    highlight = highlight + "..."
            else:
                highlight = None
            
            search_results.append({
                "message_id": msg.id,
                "conversation_id": msg.conversation_id,
                "conversation_title": conv.title or "Untitled",
                "user_name": user.full_name or user.username,
                "content": msg.content[:200],  # Preview
                "created_at": msg.created_at,
                "matched_highlight": highlight
            })
        
        return search_results
