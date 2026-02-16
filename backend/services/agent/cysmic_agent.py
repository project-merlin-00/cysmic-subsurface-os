"""
Cysmic Agent Service
Multi-model AI agent for petroleum engineering
"""
import json
import asyncio
from typing import Optional, List, Dict, Any, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from backend.models.models import User, Conversation, Message, Well
from backend.schemas.schemas import ConversationContext
from backend.services.agent.tools import TOOL_REGISTRY


class CysmicAgent:
    """
    Agent for processing petroleum engineering queries.
    Supports multiple models (Claude, GPT) via tool calling.
    """
    
    def __init__(self, db: AsyncSession, user: User, conversation: Conversation):
        self.db = db
        self.user = user
        self.conversation = conversation
        self.tools = TOOL_REGISTRY
        
    async def process_message(
        self, 
        message: str, 
        context: Optional[ConversationContext] = None
    ) -> Tuple[str, List[Dict], List[Dict]]:
        """
        Process user message and return response + tool calls + UI components
        """
        # Get conversation history
        messages = await self._get_conversation_history()
        
        # Determine intent
        intent = self._classify_intent(message)
        
        # Build context info
        context_info = await self._build_context_info(context)
        
        # Process based on intent
        if intent == "analysis":
            return await self._handle_analysis(message, context_info)
        elif intent == "data_query":
            return await self._handle_data_query(message, context_info)
        elif intent == "help":
            return await self._handle_help(message, context_info)
        else:
            return await self._handle_general(message, context_info, messages)
    
    async def _get_conversation_history(self) -> List[Message]:
        """Get conversation history"""
        result = await self.db.execute(
            select(Message)
            .where(Message.conversation_id == self.conversation.id)
            .order_by(Message.created_at)
            .limit(20)
        )
        return result.scalars().all()
    
    async def _build_context_info(self, context: Optional[ConversationContext]) -> Dict[str, Any]:
        """Build context information for the agent"""
        info = {}
        
        # From conversation context
        if self.conversation.context:
            info.update(self.conversation.context)
        
        # From message context (overrides)
        if context:
            info.update(context.model_dump(exclude_none=True))
        
        # Get well info if available
        well_id = info.get("well_id") or self.conversation.well_id
        if well_id:
            result = await self.db.execute(select(Well).where(Well.id == well_id))
            well = result.scalar_one_or_none()
            if well:
                info["well"] = {
                    "name": well.name,
                    "field": well.field,
                    "status": well.status.value if well.status else None,
                    "current_depth": well.current_depth,
                    "current_pressure": well.current_pressure,
                    "total_depth_md": well.total_depth_md,
                    "total_depth_tvd": well.total_depth_tvd,
                }
        
        return info
    
    def _classify_intent(self, message: str) -> str:
        """Classify user intent"""
        message_lower = message.lower()
        
        # Analysis keywords
        analysis_keywords = ["analyze", "decline", "forecast", "volumetric", "pressure", "calculate", "curve", "recovery"]
        if any(kw in message_lower for kw in analysis_keywords):
            return "analysis"
        
        # Data query keywords
        data_keywords = ["show", "get", "list", "what is", "find", "search", "data"]
        if any(kw in message_lower for kw in data_keywords):
            return "data_query"
        
        # Help keywords
        if "help" in message_lower or "what can you do" in message_lower:
            return "help"
        
        return "general"
    
    async def _handle_analysis(
        self, 
        message: str, 
        context_info: Dict[str, Any]
    ) -> Tuple[str, List[Dict], List[Dict]]:
        """Handle analysis requests"""
        
        # Check for specific analysis types
        message_lower = message.lower()
        
        if "decline" in message_lower or "forecast" in message_lower:
            return self._decline_curve_response(context_info)
        elif "volumetric" in message_lower or "stoiip" in message_lower:
            return self._volumetric_response(context_info)
        elif "pressure" in message_lower:
            return self._pressure_response(context_info)
        else:
            # General analysis - spawn parameter panel
            response = "I can help you with various analyses. What type would you like to perform?"
            components = [
                {
                    "type": "component",
                    "component_type": "analysis_selector",
                    "options": ["decline_curve", "volumetric", "pressure_transient"]
                }
            ]
            return response, [], components
    
    def _decline_curve_response(self, context_info: Dict) -> Tuple[str, List[Dict], List[Dict]]:
        """Generate decline curve analysis response"""
        response = "I'll set up a Decline Curve Analysis for you. Please adjust the parameters below."
        
        components = [
            {
                "type": "component",
                "component_type": "decline_curve_panel",
                "props": {
                    "well_name": context_info.get("well", {}).get("name", "Unknown Well"),
                    "parameters": {
                        "qi": 1000,  # Initial rate
                        "di": 0.1,   # Initial decline
                        "b": 0.5,    # b-factor
                        "type": "hyperbolic"
                    }
                }
            }
        ]
        
        tool_calls = [
            {
                "tool": "decline_curve_analysis",
                "arguments": context_info.get("well", {}).get("name", "Unknown")
            }
        ]
        
        return response, tool_calls, components
    
    def _volumetric_response(self, context_info: Dict) -> Tuple[str, List[Dict], List[Dict]]:
        """Generate volumetric analysis response"""
        response = "I'll set up a Volumetric Analysis (STOIIP) for you."
        
        components = [
            {
                "type": "component",
                "component_type": "volumetric_panel",
                "props": {
                    "well_name": context_info.get("well", {}).get("name", "Unknown Well"),
                    "parameters": {
                        "area": 1000,  # acres
                        "thickness": 50,  # ft
                        "porosity": 0.2,  # fraction
                        "sw": 0.3,  # water saturation
                        "bf": 1.2   # formation volume factor
                    }
                }
            }
        ]
        
        return response, [], components
    
    def _pressure_response(self, context_info: Dict) -> Tuple[str, List[Dict], List[Dict]]:
        """Generate pressure analysis response"""
        response = "I'll set up a Pressure Transient Analysis for you."
        
        components = [
            {
                "type": "component",
                "component_type": "pressure_panel",
                "props": {
                    "well_name": context_info.get("well", {}).get("name", "Unknown Well"),
                    "current_pressure": context_info.get("well", {}).get("current_pressure", 3000),
                }
            }
        ]
        
        return response, [], components
    
    async def _handle_data_query(
        self, 
        message: str, 
        context_info: Dict[str, Any]
    ) -> Tuple[str, List[Dict], List[Dict]]:
        """Handle data queries"""
        
        if "well" in message.lower():
            wells = await self._get_wells()
            if wells:
                response = f"Here are your wells:\n" + "\n".join([f"- {w.name} ({w.field})" for w in wells])
            else:
                response = "You don't have any wells yet. Would you like to add one?"
            
            return response, [], []
        
        return "I can help you query well data, production records, and more. What specifically would you like to see?", [], []
    
    async def _get_wells(self) -> List[Well]:
        """Get user's wells"""
        result = await self.db.execute(
            select(Well).where(Well.owner_id == self.user.id).limit(10)
        )
        return result.scalars().all()
    
    async def _handle_help(
        self, 
        message: str, 
        context_info: Dict[str, Any]
    ) -> Tuple[str, List[Dict], List[Dict]]:
        """Handle help requests"""
        response = """I can help you with:

1. **Decline Curve Analysis** - Forecast production using Arps equations (hyperbolic, exponential, harmonic)

2. **Volumetric Analysis** - Calculate STOIIP using Monte Carlo simulation

3. **Pressure Transient Analysis** - Analyze well tests

4. **Data Management** - Query and manage well data, logs, and production records

5. **File Import** - Upload LAS, DLIS, CSV files

What would you like to do?"""
        
        return response, [], []
    
    async def _handle_general(
        self, 
        message: str, 
        context_info: Dict[str, Any],
        history: List[Message]
    ) -> Tuple[str, List[Dict], List[Dict]]:
        """Handle general conversation"""
        
        # Simple response based on context
        well_name = context_info.get("well", {}).get("name", None)
        
        if well_name:
            response = f"I understand you're working with well **{well_name}**. "
        else:
            response = "I understand. "
        
        response += """I'm here to help with petroleum engineering analysis. 

You can ask me to:
- Run a decline curve analysis
- Calculate volumetric estimates
- Query well data
- Import log files

What would you like to do?"""
        
        return response, [], []
