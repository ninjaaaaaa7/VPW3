import os
from unittest.mock import MagicMock, patch
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)

def test_track_activity_happy_path() -> None:
    """
    Tests the happy path where valid activity is submitted.
    """
    mock_response = MagicMock()
    mock_response.text = (
        '{"estimated_kg": 4.5, '
        '"analysis": "Driving 15 miles in a standard petrol vehicle releases carbon emissions from internal combustion engine combustion.", '
        '"reduction_steps": ["Consider carpooling", "Switch to public transit or cycling", "Transition to an electric vehicle"]}'
    )
    
    with patch.dict("os.environ", {"GEMINI_API_KEY": "fake_key_for_testing"}):
        with patch("backend.services.genai.Client") as MockClientClass:
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
            
            MockClientClass.assert_called_once_with(api_key="fake_key_for_testing")
            mock_client_instance.models.generate_content.assert_called_once()

def test_track_activity_empty_input() -> None:
    """
    Tests that empty activity input returns validation error.
    """
    response = client.post("/api/track", json={"activity": ""})
    assert response.status_code == 422
    assert "activity" in response.json()["detail"][0]["loc"]

def test_track_activity_too_short() -> None:
    """
    Tests that activity input shorter than 3 characters returns validation error.
    """
    response = client.post("/api/track", json={"activity": "ab"})
    assert response.status_code == 422

def test_track_activity_too_long() -> None:
    """
    Tests that activity input longer than 500 characters returns validation error.
    """
    long_activity = "a" * 501
    response = client.post("/api/track", json={"activity": long_activity})
    assert response.status_code == 422

def test_track_activity_missing_fields() -> None:
    """
    Tests that missing activity key in JSON returns validation error.
    """
    response = client.post("/api/track", json={})
    assert response.status_code == 422

def test_track_activity_missing_api_key() -> None:
    """
    Tests that if GEMINI_API_KEY is not configured, the API returns status code 500.
    """
    with patch("os.getenv", return_value=None):
        response = client.post("/api/track", json={"activity": "Drove 15 miles"})
        assert response.status_code == 500
        assert "GEMINI_API_KEY environment variable is not configured" in response.json()["detail"]

def test_track_activity_invalid_json_returned_by_ai() -> None:
    """
    Tests that if Gemini returns invalid JSON structure, backend responds with status code 500.
    """
    mock_response = MagicMock()
    mock_response.text = "This is not JSON at all."
    
    with patch.dict("os.environ", {"GEMINI_API_KEY": "fake_key_for_testing"}):
        with patch("backend.services.genai.Client") as MockClientClass:
            mock_client_instance = MagicMock()
            mock_client_instance.models.generate_content.return_value = mock_response
            MockClientClass.return_value = mock_client_instance
            
            response = client.post("/api/track", json={"activity": "Drove 15 miles"})
            assert response.status_code == 500
            assert "invalid JSON response structure" in response.json()["detail"]

def test_track_activity_missing_keys_in_ai_response() -> None:
    """
    Tests that if Gemini returns JSON missing required schema fields, backend responds with status code 500.
    """
    mock_response = MagicMock()
    mock_response.text = '{"estimated_kg": 2.1, "analysis": "missing reduction steps key"}'
    
    with patch.dict("os.environ", {"GEMINI_API_KEY": "fake_key_for_testing"}):
        with patch("backend.services.genai.Client") as MockClientClass:
            mock_client_instance = MagicMock()
            mock_client_instance.models.generate_content.return_value = mock_response
            MockClientClass.return_value = mock_client_instance
            
            response = client.post("/api/track", json={"activity": "Drove 15 miles"})
            assert response.status_code == 500
            assert "failed semantic structural validation" in response.json()["detail"]
