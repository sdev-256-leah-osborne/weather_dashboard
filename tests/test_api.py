def test_app_loads(client):
    """Smoke test - systems working"""
    response = client.get('/')
    assert response.status_code == 200