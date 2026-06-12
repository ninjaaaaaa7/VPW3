import json
import os
from fastapi import HTTPException
from google import genai
from google.genai import types
from backend.models import TrackRequest, TrackResponse

def get_genai_client() -> genai.Client:
    """
    Initializes and returns the Google GenAI SDK client.
    """
    api_key: str | None = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable is not configured on the server."
        )
    return genai.Client(api_key=api_key)

async def generate_carbon_estimate(request: TrackRequest) -> TrackResponse:
    """
    Queries Gemini-1.5-flash via Google GenAI SDK to generate carbon estimates.
    """
    client: genai.Client = get_genai_client()
    system_instruction: str = (
        "You are an Eco-Tracker, an expert AI model specializing in environmental science, "
        "carbon accounting, and sustainability. "
        "Your task is to analyze the user's activity and estimate its carbon footprint in kilograms of CO2 equivalent (kg CO2e)."
    )
    
    try:
        model_name: str = "gemini-1.5-flash"
        config: types.GenerateContentConfig = types.GenerateContentConfig(
            system_instruction=system_instruction,
            response_mime_type="application/json",
            response_schema=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "estimated_kg": types.Schema(type=types.Type.NUMBER),
                    "analysis": types.Schema(type=types.Type.STRING),
                    "reduction_steps": types.Schema(
                        type=types.Type.ARRAY,
                        items=types.Schema(type=types.Type.STRING)
                    )
                },
                required=["estimated_kg", "analysis", "reduction_steps"]
            )
        )
        
        response: types.GenerateContentResponse = client.models.generate_content(
            model=model_name,
            contents=request.activity,
            config=config
        )
        
        if not response.text:
            raise HTTPException(
                status_code=500,
                detail="Empty response received from the GenAI service."
            )
            
        result_data: dict = json.loads(response.text)
        
        if "estimated_kg" not in result_data or "analysis" not in result_data or "reduction_steps" not in result_data:
            raise ValueError("Missing required keys in response structure.")
            
        return TrackResponse(
            estimated_kg=float(result_data["estimated_kg"]),
            analysis=str(result_data["analysis"]),
            reduction_steps=list(result_data["reduction_steps"])
        )

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"The GenAI model returned an invalid JSON response structure: {str(e)}"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=500,
            detail=f"The GenAI model response failed semantic structural validation: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error communicating with Google GenAI service: {str(e)}"
        )
