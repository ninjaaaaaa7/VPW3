import os
import json
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
            detail="GEMINI_API_KEY environment variable is not configured."
        )
    return genai.Client(api_key=api_key)

def generate_carbon_estimate(request: TrackRequest) -> TrackResponse:
    """
    Analyzes the carbon footprint using Gemini AI with fallback model routing.
    """
    client: genai.Client = get_genai_client()
    system_instruction: str = (
        "You are an Eco-Tracker, an expert AI model specializing in environmental science, "
        "carbon accounting, and sustainability. "
        "Your task is to analyze the user's activity and estimate its carbon footprint in kilograms of CO2 equivalent (kg CO2e)."
    )

    model_name: str = 'gemini-2.5-flash'
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

    try:
        try:
            response: types.GenerateContentResponse = client.models.generate_content(
                model=model_name,
                contents=request.activity,
                config=config
            )
        except Exception as api_err:
            api_err_str: str = str(api_err)
            if "404" in api_err_str or "not found" in api_err_str.lower():
                available_models = list(client.models.list())
                flash_models: list[str] = [m.name for m in available_models if 'flash' in m.name.lower()]
                
                if flash_models:
                    fallback_model: str = flash_models[0]
                    if fallback_model.startswith("models/"):
                        fallback_model = fallback_model.replace("models/", "")
                    
                    response = client.models.generate_content(
                        model=fallback_model,
                        contents=request.activity,
                        config=config
                    )
                else:
                    raise api_err
            else:
                raise api_err

        if not response.text:
            raise HTTPException(
                status_code=500,
                detail="Empty response received from the GenAI service."
            )

        result_data: dict = json.loads(response.text)

        if "estimated_kg" not in result_data or "analysis" not in result_data or "reduction_steps" not in result_data:
            raise ValueError("Missing required keys in response structure.")

        return TrackResponse(**result_data)

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
