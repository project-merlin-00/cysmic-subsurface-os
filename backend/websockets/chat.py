"""
WebSocket Chat Handler
Real-time chat via Socket.IO
"""
import json
from typing import Dict, Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.core.database import AsyncSessionLocal
from backend.core.redis import get_redis
from backend.models.models import User, Conversation, Message
from backend.services.agent.cysmic_agent import CysmicAgent
from backend.schemas.schemas import ConversationContext


router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections"""
    
    def __init__(self):
        self.active_connections: Dict[int, WebSocket] = {}  # user_id -> websocket
    
    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        self.active_connections[user_id] = websocket
    
    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def send_message(self, user_id: int, message: Dict[str, Any]):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_json(message)


manager = ConnectionManager()


@router.websocket("/chat/{conversation_id}")
async def websocket_chat(websocket: WebSocket, conversation_id: int):
    """WebSocket endpoint for real-time chat"""
    
    # Get user_id from query params (in real app, validate from token)
    user_id = int(websocket.query_params.get("user_id", 0))
    
    if not user_id:
        await websocket.close(code=4001)
        return
    
    await manager.connect(user_id, websocket)
    
    try:
        async with AsyncSessionLocal() as db:
            # Get conversation
            result = await db.execute(
                select(Conversation).where(
                    Conversation.id == conversation_id,
                    Conversation.user_id == user_id
                )
            )
            conversation = result.scalar_one_or_none()
            
            if not conversation:
                await websocket.send_json({"error": "Conversation not found"})
                await websocket.close()
                return
            
            # Get user
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            
            # Listen for messages
            while True:
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                content = message_data.get("content", "")
                context_data = message_data.get("context", {})
                
                # Create context object
                context = None
                if context_data:
                    context = ConversationContext(**context_data)
                
                # Process message
                agent = CysmicAgent(db=db, user=user, conversation=conversation)
                response_content, tool_calls, components = await agent.process_message(
                    content,
                    context=context
                )
                
                # Save messages
                user_message = Message(
                    conversation_id=conversation_id,
                    role="user",
                    content=content,
                    metadata=context_data
                )
                db.add(user_message)
                
                assistant_message = Message(
                    conversation_id=conversation_id,
                    role="assistant",
                    content=response_content,
                    metadata={"tool_calls": tool_calls, "components": components}
                )
                db.add(assistant_message)
                await db.commit()
                
                # Send response
                await websocket.send_json({
                    "type": "message",
                    "message": {
                        "id": assistant_message.id,
                        "role": "assistant",
                        "content": response_content,
                        "tool_calls": tool_calls,
                        "components": components,
                        "created_at": assistant_message.created_at.isoformat()
                    }
                })
                
                # Send typing indicator if processing
                await websocket.send_json({"type": "typing", "status": False})
    
    except WebSocketDisconnect:
        manager.disconnect(user_id)
    except Exception as e:
        await websocket.send_json({"error": str(e)})
        manager.disconnect(user_id)


@router.websocket("/events")
async def websocket_events(websocket: WebSocket):
    """WebSocket endpoint for real-time events"""
    await websocket.accept()
    
    try:
        while True:
            data = await websocket.receive_text()
            # Handle events (well updates, notifications, etc.)
            await websocket.send_json({"status": "ok"})
    except WebSocketDisconnect:
        pass
