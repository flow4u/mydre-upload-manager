from fastapi import APIRouter
from app.api.endpoints import config, combine, upload

api_router = APIRouter()

# Config endpoints
api_router.include_router(
    config.router,
    prefix="/config",
    tags=["config"]
)

# Combine endpoints
api_router.include_router(
    combine.router,
    prefix="/combine",
    tags=["combine"]
)

# Upload endpoints
api_router.include_router(
    upload.router,
    prefix="/upload",
    tags=["upload"]
) 