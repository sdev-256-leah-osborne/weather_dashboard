import pytest
from app.app import app   

@pytest.fixture
def client():
    """Test the client"""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture  
def mock_api(requests_mock):
    """Mock the API calls"""
    return requests_mock