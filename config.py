import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    """Application configuration settings"""
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./orders.db"
    )
    
    # Uber Eats API
    UBER_EATS_RESTAURANT_ID: str = os.getenv(
        "UBER_EATS_RESTAURANT_ID",
        "test_restaurant_id"
    )
    UBER_EATS_API_KEY: str = os.getenv(
        "UBER_EATS_API_KEY",
        "test_api_key"
    )
    UBER_EATS_API_URL: str = os.getenv(
        "UBER_EATS_API_URL",
        "https://api.uber.com/v2/eats"
    )
    
    # Server
    SERVER_HOST: str = os.getenv("SERVER_HOST", "127.0.0.1")
    SERVER_PORT: int = int(os.getenv("SERVER_PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "True").lower() == "true"

# Create settings instance
settings = Settings()