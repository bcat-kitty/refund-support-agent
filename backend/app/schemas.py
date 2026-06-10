from typing import Literal, Optional

from pydantic import BaseModel, Field


class CustomerOut(BaseModel):
    id: str
    name: str
    email: str
    tier: str
    joined_at: str
    lifetime_value: float
    refunds_last_90d: int
    notes: Optional[str] = None


class OrderItemOut(BaseModel):
    id: str
    sku: str
    name: str
    category: str
    unit_price: float
    qty: int
    is_final_sale: bool
    is_digital: bool
    digital_downloaded_at: Optional[str] = None


class OrderOut(BaseModel):
    id: str
    customer_id: str
    ordered_at: str
    delivered_at: Optional[str]
    status: str
    subtotal: float
    shipping: float
    total: float
    items: list[OrderItemOut] = Field(default_factory=list)


class StartSessionIn(BaseModel):
    email: str


class SessionOut(BaseModel):
    id: str
    customer: CustomerOut
    created_at: str
    last_seen_at: str


class SendMessageIn(BaseModel):
    content: str


class TurnMetrics(BaseModel):
    step_count: int
    tool_calls: int
    retries: int
    tokens_in: int
    tokens_out: int
    latency_ms: int
    cost_usd: float


class AssistantMessageOut(BaseModel):
    message_id: str
    role: Literal["assistant"]
    content: str
    created_at: str
    metrics: TurnMetrics


class MessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: str


class TraceEventOut(BaseModel):
    id: str
    session_id: str
    message_id: Optional[str]
    step_index: int
    kind: str
    name: Optional[str]
    input: Optional[dict | list | str] = None
    output: Optional[dict | list | str] = None
    started_at: str
    ended_at: Optional[str]
    latency_ms: Optional[int]
    tokens_in: Optional[int]
    tokens_out: Optional[int]
    cache_read_in: Optional[int]
    cache_write_in: Optional[int]
    cost_usd: Optional[float]
    error: Optional[str]


class SessionSummaryOut(BaseModel):
    id: str
    customer_id: str
    customer_name: str
    customer_email: str
    created_at: str
    last_seen_at: str
    message_count: int
    last_user_message: Optional[str] = None


class PolicyOut(BaseModel):
    version: int
    content_md: str
    effective_at: str
