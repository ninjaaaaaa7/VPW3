import os
import json
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, constr
from google import genai
from google.genai import types

# Set up logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("carbon_tracker")

app = FastAPI(
    title="Carbon Footprint Awareness Platform",
    description="Analyze and reduce your carbon footprint with AI assistance.",
    version="1.0.0"
)

# CORS configuration
# Allows requests from standard web ports or * safely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request validation schema using Pydantic constr
class TrackRequest(BaseModel):
    activity: constr(min_length=3, max_length=500, strip_whitespace=True)

# Response schema matching the Pydantic type returned to frontend
class TrackResponse(BaseModel):
    estimated_kg: float
    analysis: str
    reduction_steps: list[str]

# Lazy-loaded GenAI Client to prevent import-time or startup-time failures in test environment
def get_genai_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable is not configured on the server."
        )
    return genai.Client(api_key=api_key)

@app.post("/api/track", response_model=TrackResponse)
async def track_activity(request: TrackRequest):
    """
    Tracks carbon footprint for a user activity.
    Uses Gemini-1.5-flash via Google GenAI SDK with strict JSON schema response.
    """
    logger.info(f"Received carbon tracking request: {request.activity}")
    
    client = get_genai_client()
    
    system_instruction = (
        "You are an Eco-Tracker, an expert AI model specializing in environmental science, "
        "carbon accounting, and sustainability. "
        "Your task is to analyze the user's activity and estimate its carbon footprint in kilograms of CO2 equivalent (kg CO2e). "
        "You must return a JSON object containing:\n"
        "1. 'estimated_kg': A floating-point number representing the estimated carbon footprint. "
        "If the activity cannot be carbon-tracked, return 0.0.\n"
        "2. 'analysis': A concise, professional analysis (1-3 sentences) explaining why the activity "
        "emits that amount of CO2 and its environmental context.\n"
        "3. 'reduction_steps': An array of 2-4 actionable, high-impact suggestions the user can take "
        "to reduce their footprint for this specific activity."
    )
    
    try:
        model_name = 'gemini-1.5-flash'
        config = types.GenerateContentConfig(
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
            ),
            temperature=0.1,
        )

        try:
            # Generate content with primary model
            response = client.models.generate_content(
                model=model_name,
                contents=request.activity,
                config=config
            )
        except Exception as api_err:
            api_err_str = str(api_err)
            # Check for 404 Not Found error
            if "404" in api_err_str or "not_found" in api_err_str.upper() or "not found" in api_err_str.lower():
                logger.warning(f"Primary model '{model_name}' not found. Querying available models for key...")
                try:
                    available_models = list(client.models.list())
                    # Look for any available model with 'flash' or 'gemini' in its name
                    flash_models = [m.name for m in available_models if 'flash' in m.name.lower()]
                    gemini_models = [m.name for m in available_models if 'gemini' in m.name.lower()]
                    
                    fallback_candidates = flash_models + [m for m in gemini_models if m not in flash_models]
                    
                    if fallback_candidates:
                        fallback_model = fallback_candidates[0]
                        # Strip standard 'models/' prefix if present in SDK model list
                        if fallback_model.startswith("models/"):
                            fallback_model = fallback_model.replace("models/", "")
                        
                        logger.info(f"Retrying carbon analysis using fallback model: '{fallback_model}'")
                        response = client.models.generate_content(
                            model=fallback_model,
                            contents=request.activity,
                            config=config
                        )
                    else:
                        raise api_err
                except Exception as list_err:
                    logger.error(f"Failed to query model list for fallback: {list_err}")
                    raise api_err
            else:
                raise api_err
        
        if not response.text:
            raise HTTPException(
                status_code=502,
                detail="Empty response received from the GenAI service."
            )
            
        # Parse the JSON response returned by the model
        result_data = json.loads(response.text)
        
        # Validate that the keys exist before constructing response
        if "estimated_kg" not in result_data or "analysis" not in result_data or "reduction_steps" not in result_data:
            raise ValueError("Required keys missing from AI JSON response.")
            
        return TrackResponse(
            estimated_kg=float(result_data["estimated_kg"]),
            analysis=str(result_data["analysis"]),
            reduction_steps=list(result_data["reduction_steps"])
        )
        
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse JSON response from Gemini model: {e}")
        raise HTTPException(
            status_code=502,
            detail="The GenAI model returned an invalid JSON response structure."
        )
    except ValueError as e:
        logger.error(f"Validation failure in AI response keys: {e}")
        raise HTTPException(
            status_code=502,
            detail="The GenAI model response failed semantic structural validation."
        )
    except Exception as e:
        logger.error(f"Unexpected error calling Gemini API: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"Error communicating with Google GenAI service: {str(e)}"
        )

# Mount frontend build output directory (dist) for single-process hosting
frontend_dist = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

# In production/deployment, static files exist in the container
if os.path.exists(frontend_dist):
    logger.info(f"Serving frontend static files from: {frontend_dist}")
    
    # Mount specific assets directory for optimized direct caching
    assets_dir = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        
    # Standard fallback catch-all route to serve the React SPA
    @app.get("/{rest_of_path:path}")
    async def serve_spa(rest_of_path: str):
        # Protect API endpoints from falling back to frontend SPA
        if rest_of_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
            
        file_path = os.path.join(frontend_dist, rest_of_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    logger.warning(f"Frontend dist directory not found at: {frontend_dist}. Development fallback active.")
    
    @app.get("/{rest_of_path:path}")
    async def serve_fallback(rest_of_path: str):
        if rest_of_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        return JSONResponse(
            status_code=200,
            content={"status": "running", "message": "FastAPI server is running. Compile frontend/dist to view dashboard."}
        )
