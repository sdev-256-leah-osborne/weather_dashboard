import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration class"""

    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")


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
