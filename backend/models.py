from pydantic import BaseModel, constr

class TrackRequest(BaseModel):
    """
    Validation schema representing the user's carbon tracking activity input.
    """
    activity: constr(min_length=3, max_length=500, strip_whitespace=True)

class TrackResponse(BaseModel):
    """
    Validation schema representing the carbon tracking results returned to the client.
    """
    estimated_kg: float
    analysis: str
    reduction_steps: list[str]
