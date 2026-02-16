"""
Phase 4: Collaboration API Endpoints
Multi-user Chat with Annotations
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from datetime import datetime

from backend.core.database import get_db
from backend.core.security import get_current_user
from backend.models.models import User
from backend.services.collaboration import CollaborationService
from backend.schemas import phase4 as schemas

router = APIRouter(prefix="/collaboration", tags=["Phase4: Collaboration"])


def get_collaboration_service(db: Session = Depends(get_db)) -> CollaborationService:
    return CollaborationService(db)


# ===================
# Annotations
# ===================

@router.post("/annotations", response_model=schemas.AnnotationResponse)
def create_annotation(
    annotation: schemas.AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: CollaborationService = Depends(get_collaboration_service)
):
    """Create an annotation on a message"""
    return service.create_annotation(
        user_id=current_user.id,
        message_id=annotation.message_id,
        content=annotation.content,
        annotation_type=annotation.annotation_type.value,
        parent_annotation_id=annotation.parent_annotation_id,
        highlights=annotation.highlights
    )


@router.get("/messages/{message_id}/annotations", response_model=List[schemas.AnnotationResponse])
def get_message_annotations(
    message_id: int,
    db: Session = Depends(get_db),
    service: CollaborationService = Depends(get_collaboration_service)
):
    """Get all annotations for a message"""
    return service.get_annotations_for_message(message_id)


@router.get("/annotations/{annotation_id}/thread", response_model=List[schemas.AnnotationResponse])
def get_annotation_thread(
    annotation_id: int,
    db: Session = Depends(get_db),
    service: CollaborationService = Depends(get_collaboration_service)
):
    """Get an annotation and its replies"""
    return service.get_annotation_thread(annotation_id)


@router.post("/annotations/{annotation_id}/resolve")
def resolve_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: CollaborationService = Depends(get_collaboration_service)
):
    """Mark an annotation as resolved"""
    return service.resolve_annotation(annotation_id, current_user.id)


@router.delete("/annotations/{annotation_id}")
def delete_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: CollaborationService = Depends(get_collaboration_service)
):
    """Delete an annotation"""
    success = service.delete_annotation(annotation_id, current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Annotation not found or not authorized")
    return {"status": "deleted"}


# ===================
# Mentions & Notifications
# ===================

@router.get("/notifications", response_model=List[schemas.MentionNotification])
def get_notifications(
    unread_only: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: CollaborationService = Depends(get_collaboration_service)
):
    """Get notifications for current user"""
    return service.get_user_notifications(current_user.id, unread_only)


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: int,
    db: Session = Depends(get_db),
    service: CollaborationService = Depends(get_collaboration_service)
):
    """Mark a notification as read"""
    return service.mark_notification_read(notification_id)


@router.post("/notifications/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: CollaborationService = Depends(get_collaboration_service)
):
    """Mark all notifications as read"""
    count = service.mark_all_notifications_read(current_user.id)
    return {"marked_read": count}


# ===================
# Chat Search
# ===================

@router.post("/search", response_model=List[schemas.ChatSearchResult])
def search_messages(
    search_query: schemas.ChatSearchQuery,
    db: Session = Depends(get_db),
    service: CollaborationService = Depends(get_collaboration_service)
):
    """Search through chat messages"""
    return service.search_messages(
        query=search_query.query,
        conversation_id=search_query.conversation_id,
        user_id=search_query.user_id,
        date_from=search_query.date_from,
        date_to=search_query.date_to,
        limit=search_query.limit
    )
