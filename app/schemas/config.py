from pydantic import BaseModel, Field
from typing import Dict, Any, List

class ConfigCreate(BaseModel):
    workspace_name: str = Field(..., min_length=1)
    workspace_key: str = Field(..., min_length=1)
    subscription_key: str = Field(..., min_length=1)
    uploader_name: str = Field(..., min_length=1)
    pin: str = Field(..., min_length=6)

class ConfigResponse(BaseModel):
    message: str
    encrypted_data: str

class ConfigCombine(BaseModel):
    pin: str
    config_files: List[str]

class DecryptRequest(BaseModel):
    encrypted_data: str  # base64 encoded
    pin: str = Field(..., min_length=6)
