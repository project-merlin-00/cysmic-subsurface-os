"""
Database Models
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
import enum

from backend.core.database import Base, TimestampMixin


class UserRole(str, enum.Enum):
    ENGINEER = "engineer"
    GEOLOGIST = "geologist"
    MANAGER = "manager"
    ADMIN = "admin"


class User(Base, TimestampMixin):
    """User model"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    role = Column(SQLEnum(UserRole), default=UserRole.ENGINEER)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # Relationships
    conversations = relationship("Conversation", back_populates="user")
    wells = relationship("Well", back_populates="owner")


class WellStatus(str, enum.Enum):
    DRILLING = "drilling"
    PRODUCING = "producing"
    INJECTING = "injecting"
    SHUT_IN = "shut_in"
    ABANDONED = "abandoned"


class Well(Base, TimestampMixin):
    """Well model - for context in chat"""
    __tablename__ = "wells"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    field = Column(String(255), index=True)
    uwi = Column(String(100), unique=True)  # Unique Well Identifier
    
    # Location
    country = Column(String(100))
    basin = Column(String(255))
    latitude = Column(Float)
    longitude = Column(Float)
    
    # Well details
    status = Column(SQLEnum(WellStatus), default=WellStatus.DRILLING)
    well_type = Column(String(50))  # oil, gas, water, injection
    total_depth_md = Column(Float)  # Measured depth in meters
    total_depth_tvd = Column(Float)  # True vertical depth
    
    # Current context for chat
    current_depth = Column(Float, default=0)
    current_pressure = Column(Float)
    bottom_hole_pressure = Column(Float)
    
    # Owner
    owner_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="wells")
    
    # Relationships
    conversations = relationship("Conversation", back_populates="well")


class Conversation(Base, TimestampMixin):
    """Conversation model - chat session"""
    __tablename__ = "conversations"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255))
    
    # Context
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="conversations")
    
    well_id = Column(Integer, ForeignKey("wells.id"), nullable=True)
    well = relationship("Well", back_populates="conversations")
    
    # State
    is_active = Column(Boolean, default=True)
    chat_context = Column(JSON, default=dict)  # Stores context like current depth, parameters
    
    # Relationships
    messages = relationship("Message", back_populates="conversation", order_by="Message.created_at")


class Message(Base, TimestampMixin):
    """Message model - individual chat messages"""
    __tablename__ = "messages"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    conversation = relationship("Conversation", back_populates="messages")
    
    role = Column(String(20), nullable=False)  # "user" or "assistant"
    content = Column(Text, nullable=False)
    
    # For AI responses - what model, tokens used
    model = Column(String(50))
    tokens_used = Column(Integer)
    
    # Metadata
    message_metadata = Column(JSON, default=dict)  # For tool calls, reasoning, etc.
    attachments = Column(JSON, default=list)  # Files, images
    
    # For RAG - embedded message content
    embedding = Column(JSON, default=list)  # Store vector embedding


class ToolCall(Base, TimestampMixin):
    """Tool call records"""
    __tablename__ = "tool_calls"
    
    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(Integer, ForeignKey("messages.id"))
    
    tool_name = Column(String(100), nullable=False)
    arguments = Column(JSON, default=dict)
    result = Column(JSON)
    
    success = Column(Boolean, default=True)
    error = Column(String(500))


class AnalysisResult(Base, TimestampMixin):
    """Store analysis results (decline curves, volumetrics, etc.)"""
    __tablename__ = "analysis_results"
    
    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id"))
    
    analysis_type = Column(String(50), nullable=False)  # "decline_curve", "volumetric", "pressure_transient"
    name = Column(String(255))
    
    parameters = Column(JSON)  # Input parameters
    results = Column(JSON)     # Output results
    charts = Column(JSON)      # Chart configurations
    
    is_archived = Column(Boolean, default=False)
