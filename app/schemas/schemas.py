from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class OrderItemSchema(BaseModel):
    """Schema for individual order items"""
    item_name: str
    quantity: int
    price: float

class OrderCreateSchema(BaseModel):
    """Schema for creating/receiving orders from Uber Eats"""
    order_id: str
    restaurant_id: str
    customer_name: str
    customer_phone: str
    customer_email: str
    items: str  # JSON string of items
    special_requests: Optional[str] = None
    total_amount: float
    prep_time: int = 30

class OrderResponseSchema(BaseModel):
    """Schema for returning order data"""
    id: int
    order_id: str
    customer_name: str
    items: str
    special_requests: Optional[str]
    status: str
    is_confirmed: bool
    prep_time: int
    created_at: datetime
    confirmed_at: Optional[datetime]
    
    class Config:
        from_orm = True  # For SQLAlchemy compatibility

class OrderUpdateSchema(BaseModel):
    """Schema for updating order status"""
    status: str
    is_confirmed: Optional[bool] = False

class OrderListResponseSchema(BaseModel):
    """Schema for list of orders"""
    total: int
    orders: list[OrderResponseSchema]

    class Config:
        from_orm = True