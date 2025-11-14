import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration class"""

    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    REQUESTS_CONNECT_TIMEOUT = 5  # seconds
    REQUESTS_RESPONSE_TIMEOUT = 15  # seconds
    FAV_COOKIE = "favorites"
    MAX_FAVORITES = 10
    MAX_COOKIE_AGE = 60 * 60 * 24 * 30  # seconds*minutes*hours*days


class DebugConfig(Config):
    """Debug config subclass"""

    DEBUG = True
    HOST = "0.0.0.0"
    PORT = 5000


class ProductionConfig(Config):
    """Production config subclass"""

    DEBUG = False
    HOST = "WSGI HOST"
    PORT = "PORT"
