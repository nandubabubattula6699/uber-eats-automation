from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from app.models import Order
from app.schemas import (
    OrderCreateSchema,
    OrderResponseSchema,
    OrderUpdateSchema,
    OrderListResponseSchema
)
from datetime import datetime

# Create router for order endpoints
router = APIRouter(
    prefix="/api/orders",
    tags=["orders"],
    responses={404: {"description": "Not found"}}
)

@router.post("/", response_model=OrderResponseSchema, status_code=status.HTTP_201_CREATED)
async def create_order(order: OrderCreateSchema, db: Session = Depends(get_db)):
    """
    Create a new order (receives from Uber Eats)
    Automatically confirms the order
    """
    # Check if order already exists
    existing_order = db.query(Order).filter(Order.order_id == order.order_id).first()
    if existing_order:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order already exists"
        )
    
    # Create new order
    db_order = Order(
        order_id=order.order_id,
        restaurant_id=order.restaurant_id,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        customer_email=order.customer_email,
        items=order.items,
        special_requests=order.special_requests,
        total_amount=order.total_amount,
        prep_time=order.prep_time,
        status="confirmed",  # Auto-confirm
        is_confirmed=True,
        confirmed_at=datetime.now()
    )
    
    db.add(db_order)
    db.commit()
    db.refresh(db_order)
    
    return db_order

@router.get("/")
async def get_all_orders(db: Session = Depends(get_db)):
    """Get all orders"""
    orders = db.query(Order).all()
    return {
        "total": len(orders),
        "orders": [
            {
                "id": order.id,
                "order_id": order.order_id,
                "customer_name": order.customer_name,
                "items": order.items,
                "special_requests": order.special_requests,
                "status": order.status,
                "is_confirmed": order.is_confirmed,
                "total_amount": order.total_amount,
                "prep_time": order.prep_time,
                "created_at": order.created_at,
                "confirmed_at": order.confirmed_at,
            }
            for order in orders
        ]
    }


@router.get("/{order_id}", response_model=OrderResponseSchema)
async def get_order(order_id: str, db: Session = Depends(get_db)):
    """Get specific order by ID"""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    return order

@router.put("/{order_id}", response_model=OrderResponseSchema)
async def update_order(order_id: str, order_update: OrderUpdateSchema, db: Session = Depends(get_db)):
    """Update order status"""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    order.status = order_update.status
    if order_update.is_confirmed:
        order.is_confirmed = True
        order.confirmed_at = datetime.now()
    if order_update.status == "ready":
        order.completed_at = datetime.now()

    db.commit()
    db.refresh(order)
    return order


@router.delete("/{order_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_order(order_id: str, db: Session = Depends(get_db)):
    """Delete an order"""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found"
        )
    
    db.delete(order)
    db.commit()
    return None