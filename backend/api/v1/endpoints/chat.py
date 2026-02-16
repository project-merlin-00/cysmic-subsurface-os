"""
Chat API Endpoints
"""
import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database import get_db
from backend.core.security import get_current_user as auth_get_current_user
from backend.models.models import Conversation, Message, Well, User, AnalysisResult
from backend.schemas.schemas import ChatMessage, ChatResponse, MessageResponse, ConversationContext
from backend.services.agent.cysmic_agent import CysmicAgent

# Alias to avoid conflict
get_current_user = auth_get_current_user

router = APIRouter()


@router.post("/{conversation_id}/messages", response_model=ChatResponse)
async def send_message(
    conversation_id: int,
    chat_message: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Send a message to a conversation and get AI response"""
    
    # Get conversation
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.user_id == current_user.id
        )
    )
    conversation = result.scalar_one_or_none()
    
    if not conversation:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    # Merge context if provided
    if chat_message.context:
        existing_context = conversation.context or {}
        new_context = chat_message.context.model_dump()
        existing_context.update({k: v for k, v in new_context.items() if v is not None})
        conversation.context = existing_context
    
    # Save user message
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=chat_message.content,
        metadata=chat_message.context.model_dump() if chat_message.context else {}
    )
    db.add(user_message)
    await db.commit()
    await db.refresh(user_message)
    
    # Process with agent
    agent = CysmicAgent(db=db, user=current_user, conversation=conversation)
    response_content, tool_calls, components = await agent.process_message(
        chat_message.content,
        context=chat_message.context
    )
    
    # Save assistant message
    assistant_message = Message(
        conversation_id=conversation_id,
        role="assistant",
        content=response_content,
        metadata={"tool_calls": tool_calls, "components": components}
    )
    db.add(assistant_message)
    await db.commit()
    await db.refresh(assistant_message)
    
    # If there are analysis results, save them
    for component in components:
        if component.get("type") == "analysis":
            analysis = AnalysisResult(
                conversation_id=conversation_id,
                analysis_type=component.get("analysis_type"),
                name=component.get("name"),
                parameters=component.get("parameters", {}),
                results=component.get("results", {}),
                charts=component.get("charts", {})
            )
            db.add(analysis)
    
    await db.commit()
    
    return ChatResponse(
        message=MessageResponse.model_validate(assistant_message),
        tool_calls=tool_calls,
        components=components
    )


@router.post("/quick", response_model=ChatResponse)
async def quick_chat(
    chat_message: ChatMessage,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Quick chat - creates a conversation if needed"""
    
    # Create new conversation
    context = chat_message.context.model_dump() if chat_message.context else {}
    conversation = Conversation(
        title=chat_message.content[:50] + "...",
        user_id=current_user.id,
        well_id=context.get("well_id"),
        context=context
    )
    db.add(conversation)
    await db.commit()
    await db.refresh(conversation)
    
    # Process message
    return await send_message(conversation.id, chat_message, db, current_user)
