from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from database import Base, engine
from app.routes import routes
from config import settings

# Create all database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app instance
app = FastAPI(
    title="Uber Eats Order Automation",
    description="Auto-confirm orders and manage restaurant operations",
    version="1.0.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include order routes
app.include_router(routes.router)

# Test endpoint
@app.get("/")
async def root():
    return {
        "message": "Uber Eats Order Automation Backend",
        "status": "running",
        "version": "1.0.0",
        "docs_url": "/docs",
        "restaurant_id": settings.UBER_EATS_RESTAURANT_ID
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=True
    )