from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from src.actor_factory.api.routes import router as api_router

app = FastAPI(
    title="ActorFactory API",
    description="Universal intelligence engine for building, cataloging, and orchestrating specialized Actor Armies.",
    version="0.1.0",
)

# Add CORS middleware for frontend UI communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)

class HealthCheckResponse(BaseModel):
    status: str
    version: str

@app.get("/health", response_model=HealthCheckResponse)
def health_check():
    return HealthCheckResponse(status="ok", version="0.1.0")
