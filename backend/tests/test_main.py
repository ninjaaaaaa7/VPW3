import os
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_track_activity_happy_path():
    """
    Tests the happy path where valid activity is submitted,
    the GenAI SDK client is successfully mocked, and the backend
    returns correct tracking estimation.
    """
    mock_response = MagicMock()
    mock_response.text = (
        '{"estimated_kg": 4.5, '
        '"analysis": "Driving 15 miles in a standard petrol vehicle releases carbon emissions from internal combustion engine combustion.", '
        '"reduction_steps": ["Consider carpooling", "Switch to public transit or cycling", "Transition to an electric vehicle"]}'
    )
    
    with patch.dict("os.environ", {"GEMINI_API_KEY": "fake_key_for_testing"}):
        with patch("backend.main.genai.Client") as MockClientClass:
            mock_client_instance = MagicMock()
            mock_client_instance.models.generate_content.return_value = mock_response
            MockClientClass.return_value = mock_client_instance
            
            response = client.post("/api/track", json={"activity": "Drove 15 miles"})
            
            assert response.status_code == 200
            data = response.json()
            assert data["estimated_kg"] == 4.5
            assert "Driving 15 miles" in data["analysis"]
            assert len(data["reduction_steps"]) == 3
            assert data["reduction_steps"][0] == "Consider carpooling"
            
            # Assert correct client initialization and API request
            MockClientClass.assert_called_once_with(api_key="fake_key_for_testing")
            mock_client_instance.models.generate_content.assert_called_once()

def test_track_activity_empty_input():
    """
    Tests that empty activity input returns validation error (422).
    """
    response = client.post("/api/track", json={"activity": ""})
    assert response.status_code == 422
    assert "activity" in response.json()["detail"][0]["loc"]

def test_track_activity_too_short():
    """
    Tests that activity input shorter than 3 characters returns validation error (422).
    """
    response = client.post("/api/track", json={"activity": "ab"})
    assert response.status_code == 422

def test_track_activity_too_long():
    """
    Tests that activity input longer than 500 characters returns validation error (422).
    """
    long_activity = "a" * 501
    response = client.post("/api/track", json={"activity": long_activity})
    assert response.status_code == 422

def test_track_activity_missing_fields():
    """
    Tests that missing 'activity' key in JSON returns validation error (422).
    """
    response = client.post("/api/track", json={})
    assert response.status_code == 422

def test_track_activity_missing_api_key():
    """
    Tests that if GEMINI_API_KEY is not configured, the API handles the state,
    returning a 500 Internal Server Error.
    """
    with patch("os.getenv", return_value=None):
        response = client.post("/api/track", json={"activity": "Drove 15 miles"})
        assert response.status_code == 500
        assert "GEMINI_API_KEY environment variable is not configured" in response.json()["detail"]

def test_track_activity_invalid_json_returned_by_ai():
    """
    Tests that if Gemini returns invalid JSON structure, backend handles it
    gracefully and responds with a 502 Bad Gateway.
    """
    mock_response = MagicMock()
    mock_response.text = "This is not JSON at all."
    
    with patch.dict("os.environ", {"GEMINI_API_KEY": "fake_key_for_testing"}):
        with patch("backend.main.genai.Client") as MockClientClass:
            mock_client_instance = MagicMock()
            mock_client_instance.models.generate_content.return_value = mock_response
            MockClientClass.return_value = mock_client_instance
            
            response = client.post("/api/track", json={"activity": "Drove 15 miles"})
            assert response.status_code == 502
            assert "invalid JSON response structure" in response.json()["detail"]

def test_track_activity_missing_keys_in_ai_response():
    """
    Tests that if Gemini returns a JSON object missing required schema fields,
    the backend responds with a 502 Bad Gateway.
    """
    mock_response = MagicMock()
    mock_response.text = '{"estimated_kg": 2.1, "analysis": "missing reduction steps key"}'
    
    with patch.dict("os.environ", {"GEMINI_API_KEY": "fake_key_for_testing"}):
        with patch("backend.main.genai.Client") as MockClientClass:
            mock_client_instance = MagicMock()
            mock_client_instance.models.generate_content.return_value = mock_response
            MockClientClass.return_value = mock_client_instance
            
            response = client.post("/api/track", json={"activity": "Drove 15 miles"})
            assert response.status_code == 502
            assert "failed semantic structural validation" in response.json()["detail"]
