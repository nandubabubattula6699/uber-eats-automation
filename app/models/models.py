from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.sql import func
from database import Base
from datetime import datetime

class Order(Base):
    """Order model - stores restaurant orders from Uber Eats"""
    __tablename__ = "orders"

    # Primary key
    id = Column(Integer, primary_key=True, index=True)
    
    # Order identification
    order_id = Column(String(255), unique=True, index=True)  # Uber Eats order ID
    restaurant_id = Column(String(255), index=True)
    
    # Customer information
    customer_name = Column(String(255), index=True)
    customer_phone = Column(String(20))
    customer_email = Column(String(255))
    
    # Order details
    items = Column(Text)  # JSON string of items ordered
    special_requests = Column(Text)  # Special instructions
    total_amount = Column(Float)
    
    # Order status
    status = Column(String(50), default="pending")  # pending, confirmed, preparing, ready, completed
    is_confirmed = Column(Boolean, default=False)
    
    # Timing
    prep_time = Column(Integer, default=30)  # Estimated prep time in minutes
    created_at = Column(DateTime, server_default=func.now())
    confirmed_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    def __repr__(self):
        return f"<Order(order_id={self.order_id}, customer={self.customer_name}, status={self.status})>"