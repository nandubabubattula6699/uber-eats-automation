from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
import uvicorn
from database import Base, engine
from app.routes import routes
from app.routes import webhook
from app.services.uber_eats_service import enable_store_webhooks
from config import settings

# Create all database tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Enable Uber store-level webhooks on startup so order notifications flow
    await enable_store_webhooks()
    yield

# Create FastAPI app instance
app = FastAPI(
    title="Uber Eats Order Automation",
    description="Auto-confirm orders and manage restaurant operations",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers FIRST
app.include_router(routes.router)
app.include_router(webhook.router)

# Test endpoint
@app.get("/api")
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

# Serve frontend static files LAST (catches everything else)
frontend_dist = Path(__file__).parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")
else:
    print(f"⚠️  Frontend dist folder not found at {frontend_dist}")

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.SERVER_HOST,
        port=settings.SERVER_PORT,
        reload=True
    )