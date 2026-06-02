"""Pydantic models for Autoniv platform."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone
import uuid


def _uid() -> str:
    return str(uuid.uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ----- Auth -----
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


# ----- User -----
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str = "user"
    plan_id: Optional[str] = None
    minutes_used: float = 0.0
    is_blocked: bool = False
    created_at: str


class UserCreateAdmin(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "user"
    plan_id: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[str] = None
    plan_id: Optional[str] = None
    is_blocked: Optional[bool] = None


# ----- Plan -----
class Plan(BaseModel):
    id: str = Field(default_factory=_uid)
    name: str
    monthly_minutes: int
    price_usd: float
    description: str = ""
    created_at: str = Field(default_factory=_now)


class PlanCreate(BaseModel):
    name: str
    monthly_minutes: int
    price_usd: float
    description: str = ""


# ----- Agent -----
class Agent(BaseModel):
    id: str = Field(default_factory=_uid)
    owner_id: str
    name: str
    voice: str = "alloy"
    model: str = "gpt-4o-mini"
    first_message: str = "Hello! How can I help you today?"
    system_prompt: str = "You are a helpful AI voice assistant."
    vapi_assistant_id: Optional[str] = None
    is_disabled: bool = False
    created_at: str = Field(default_factory=_now)


class AgentCreate(BaseModel):
    name: str
    voice: str = "alloy"
    model: str = "gpt-4o-mini"
    first_message: str = "Hello! How can I help you today?"
    system_prompt: str = "You are a helpful AI voice assistant."


class AgentUpdate(BaseModel):
    name: Optional[str] = None
    voice: Optional[str] = None
    model: Optional[str] = None
    first_message: Optional[str] = None
    system_prompt: Optional[str] = None
    is_disabled: Optional[bool] = None


# ----- Call -----
# ----- Call -----
class Call(BaseModel):
    id: str = Field(default_factory=_uid)
    user_id: str
    agent_id: str
    vapi_call_id: Optional[str] = None
    customer_name: Optional[str] = None
    caller_number: Optional[str] = None      # contact / phone
    customer_email: Optional[str] = None
    customer_address: Optional[str] = None
    status: str = "completed"  # completed | missed | failed | in-progress
    duration_seconds: float = 0.0
    recording_url: Optional[str] = None
    transcript: Optional[str] = None
    summary: Optional[str] = None
    started_at: str = Field(default_factory=_now)
    ended_at: Optional[str] = None


# ----- Appointment -----
class Appointment(BaseModel):
    id: str = Field(default_factory=_uid)
    user_id: str
    customer_name: str
    contact: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    scheduled_at: Optional[str] = None        # ISO datetime
    service: Optional[str] = None             # what the appointment is for
    notes: str = ""
    status: str = "pending"                   # pending | confirmed | cancelled | completed
    source_call_id: Optional[str] = None
    agent_id: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class AppointmentCreate(BaseModel):
    customer_name: str
    contact: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    scheduled_at: Optional[str] = None
    service: Optional[str] = None
    notes: str = ""
    status: str = "pending"
    source_call_id: Optional[str] = None
    agent_id: Optional[str] = None


class AppointmentUpdate(BaseModel):
    customer_name: Optional[str] = None
    contact: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    scheduled_at: Optional[str] = None
    service: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


# ----- Lead -----
class Lead(BaseModel):
    id: str = Field(default_factory=_uid)
    user_id: str
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: str = ""
    status: str = "new"  # new | contacted | converted | lost
    source_call_id: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class LeadCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: str = ""
    status: str = "new"
    source_call_id: Optional[str] = None


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None


# ----- Appointment -----
class Appointment(BaseModel):
    id: str = Field(default_factory=_uid)
    user_id: str
    caller_name: str
    caller_phone: Optional[str] = None
    service_type: str
    preferred_date: str          # ISO date string e.g. "2025-06-10"
    preferred_time: str          # e.g. "14:00"
    status: str = "pending"      # pending | confirmed | cancelled
    notes: str = ""
    source_call_id: Optional[str] = None
    created_at: str = Field(default_factory=_now)


class AppointmentCreate(BaseModel):
    caller_name: str
    caller_phone: Optional[str] = None
    service_type: str
    preferred_date: str
    preferred_time: str
    status: str = "pending"
    notes: str = ""
    source_call_id: Optional[str] = None


class AppointmentUpdate(BaseModel):
    caller_name: Optional[str] = None
    caller_phone: Optional[str] = None
    service_type: Optional[str] = None
    preferred_date: Optional[str] = None
    preferred_time: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None
