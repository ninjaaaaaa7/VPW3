import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from backend.models import TrackRequest, TrackResponse
from backend.services import generate_carbon_estimate

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

@app.post("/api/track", response_model=TrackResponse)
async def track_activity(request: TrackRequest) -> TrackResponse:
    """
    API endpoint that accepts an activity log and returns a carbon estimate.
    """
    return await generate_carbon_estimate(request)

frontend_dist: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))

if os.path.exists(frontend_dist):
    assets_dir: str = os.path.join(frontend_dist, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")
        
    @app.get("/{rest_of_path:path}", response_model=None, response_class=FileResponse)
    async def serve_spa(rest_of_path: str) -> FileResponse:
        """
        Serves the React single page application files.
        """
        if rest_of_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
            
        file_path: str = os.path.join(frontend_dist, rest_of_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))
else:
    @app.get("/{rest_of_path:path}", response_model=None, response_class=JSONResponse)
    async def serve_fallback(rest_of_path: str) -> JSONResponse:
        """
        Provides fallback message during backend-only development.
        """
        if rest_of_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API route not found")
        return JSONResponse(
            status_code=200,
            content={"status": "running", "message": "FastAPI server is running."}
        )