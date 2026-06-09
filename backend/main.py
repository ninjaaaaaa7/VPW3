import os
import json
import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, constr
from google import genai
from google.genai import types

logging.basicConfig(level=logging.INFO)
logger: logging.Logger = logging.getLogger("carbon_tracker")

app: FastAPI = FastAPI(
    title="Carbon Footprint Awareness Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TrackRequest(BaseModel):
    activity: constr(min_length=3, max_length=500, strip_whitespace=True)

class TrackResponse(BaseModel):
    estimated_kg: float
    analysis: str
    reduction_steps: list[str]

def get_genai_client() -> genai.Client:
    api_key: str | None = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY environment variable is not configured on the server."
        )
    return genai.Client(api_key=api_key)

@app.post("/api/track", response_model=TrackResponse)
async def track_activity(request: TrackRequest) -> TrackResponse:
    client: genai.Client = get_genai_client()
    system_instruction: str = (
        "You are an Eco-Tracker, an expert AI model specializing in environmental science, "
        "carbon accounting, and sustainability. "
        "Your task is to analyze the user's activity and estimate its carbon footprint in kilograms of CO2 equivalent (kg CO2e)."
    )
    
    try:
        model_name: str = 'gemini-1.5-flash'
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
        
        response = client.models.generate_content(
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

frontend_dist: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(frontend_dist):
    assets_dir: str = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        
    @app.get("/{rest_of_path:path}", response_model=None, response_class=FileResponse)
    async def serve_spa(rest_of_path: str) -> FileResponse:
        if rest_of_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
            
        file_path: str = os.path.join(frontend_dist, rest_of_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/{rest_of_path:path}", response_model=None, response_class=JSONResponse)
    async def serve_fallback(rest_of_path: str) -> JSONResponse:
        if rest_of_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        return JSONResponse(
            status_code=200,
            content={"status": "running", "message": "FastAPI server is running."}
        )