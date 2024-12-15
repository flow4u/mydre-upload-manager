from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.core.security import encrypt_data, decrypt_data
from app.schemas.config import ConfigCreate, DecryptRequest
import json
import base64

router = APIRouter()

@router.post("/create")
async def create_config(config: ConfigCreate):
    try:
        # Validate PIN
        if len(config.pin) < 6:
            raise HTTPException(
                status_code=400,
                detail="PIN must be at least 6 characters long"
            )
        
        # Create config data structure
        config_data = {
            "workspaces": {
                config.workspace_name: {
                    "workspace_key": config.workspace_key,
                    "subscription_key": config.subscription_key,
                    "uploader_name": config.uploader_name
                }
            }
        }
        
        # Convert to JSON string before encryption
        json_data = json.dumps(config_data)
        
        # Encrypt configuration data
        encrypted_data = encrypt_data(json_data, config.pin)
        
        # Return as downloadable file
        return Response(
            content=encrypted_data,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{config.workspace_name}-{config.uploader_name}.mydre"'
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating configuration: {str(e)}"
        )

@router.post("/decrypt")
async def decrypt_config(request: DecryptRequest):
    try:
        # Convert base64 to bytes
        encrypted_data = base64.b64decode(request.encrypted_data)
        
        # Decrypt the data
        decrypted_data = decrypt_data(encrypted_data, request.pin)
        
        # Parse JSON
        config_data = json.loads(decrypted_data)
        
        # Check for multiple workspaces
        if 'workspaces' in config_data:
            workspace_count = len(config_data['workspaces'])
            if workspace_count > 1:
                raise HTTPException(
                    status_code=400,
                    detail="This appears to be a combined configuration file. " +
                          "Please use individual configuration files with a single workspace. " +
                          f"This file contains {workspace_count} workspaces."
                )
        
        return config_data

    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid configuration file format"
        )
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=400,
            detail=f"Failed to decrypt configuration: {str(e)}"
        )