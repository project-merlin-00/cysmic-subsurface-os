"""
Pydantic Schemas for API Validation
"""
from typing import Optional, List, Any
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from enum import Enum


class UserRole(str, Enum):
    ENGINEER = "engineer"
    GEOLOGIST = "geologist"
    MANAGER = "manager"
    ADMIN = "admin"


class WellStatus(str, Enum):
    DRILLING = "drilling"
    PRODUCING = "producing"
    INJECTING = "injecting"
    SHUT_IN = "shut_in"
    ABANDONED = "abandoned"


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    role: UserRole = UserRole.ENGINEER


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Auth Schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Optional[int] = None


class LoginRequest(BaseModel):
    username: str
    password: str


# Well Schemas
class WellBase(BaseModel):
    name: str
    field: Optional[str] = None
    uwi: Optional[str] = None
    country: Optional[str] = None
    basin: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: WellStatus = WellStatus.DRILLING
    well_type: Optional[str] = None
    total_depth_md: Optional[float] = None
    total_depth_tvd: Optional[float] = None
    current_depth: Optional[float] = 0
    current_pressure: Optional[float] = None
    bottom_hole_pressure: Optional[float] = None


class WellCreate(WellBase):
    pass


class WellUpdate(BaseModel):
    name: Optional[str] = None
    field: Optional[str] = None
    status: Optional[WellStatus] = None
    current_depth: Optional[float] = None
    current_pressure: Optional[float] = None
    bottom_hole_pressure: Optional[float] = None


class WellResponse(WellBase):
    id: int
    owner_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Conversation Schemas
class ConversationContext(BaseModel):
    """Context for chat - well, depth, etc."""
    well_id: Optional[int] = None
    well_name: Optional[str] = None
    current_depth: Optional[float] = None
    current_pressure: Optional[float] = None
    parameters: dict = Field(default_factory=dict)


class ConversationBase(BaseModel):
    title: Optional[str] = None
    context: ConversationContext = Field(default_factory=ConversationContext)


class ConversationCreate(ConversationBase):
    pass


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    context: Optional[ConversationContext] = None
    is_active: Optional[bool] = None


class ConversationResponse(ConversationBase):
    id: int
    user_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Message Schemas
class MessageBase(BaseModel):
    role: str
    content: str
    metadata: dict = Field(default_factory=dict)
    attachments: List[Any] = Field(default_factory=list)


class MessageCreate(MessageBase):
    conversation_id: int


class MessageResponse(MessageBase):
    id: int
    conversation_id: int
    model: Optional[str] = None
    tokens_used: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Chat Schemas
class ChatMessage(BaseModel):
    """Incoming chat message from client"""
    content: str
    context: Optional[ConversationContext] = None


class ChatResponse(BaseModel):
    """Response from chat endpoint"""
    message: MessageResponse
    tool_calls: List[dict] = Field(default_factory=list)
    components: List[dict] = Field(default_factory=list)  # UI components to spawn


# Analysis Schemas
class AnalysisResultBase(BaseModel):
    analysis_type: str
    name: Optional[str] = None
    parameters: dict = Field(default_factory=dict)
    results: dict = Field(default_factory=dict)
    charts: dict = Field(default_factory=dict)


class AnalysisResultCreate(AnalysisResultBase):
    conversation_id: int


class AnalysisResultResponse(AnalysisResultBase):
    id: int
    conversation_id: int
    is_archived: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
