from fastapi import APIRouter, HTTPException, Form
from fastapi.responses import Response
from typing import Dict, Any
import json
from app.core.security import encrypt_data

router = APIRouter()

@router.post("/encrypt")
async def encrypt_combined_config(
    pin: str = Form(...),
    filename: str = Form(...),
    config: str = Form(...)
):
    try:
        # Parse the config JSON string
        config_data = json.loads(config)
        
        # Validate the config structure
        if not isinstance(config_data, dict) or 'workspaces' not in config_data:
            raise HTTPException(
                status_code=400,
                detail="Invalid configuration format"
            )
            
        # Convert to JSON string
        json_data = json.dumps(config_data)
        
        # Encrypt the configuration
        encrypted_data = encrypt_data(json_data, pin)
        
        # Return as downloadable file
        return Response(
            content=encrypted_data,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
        
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=400,
            detail="Invalid JSON format"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error encrypting configuration: {str(e)}"
        )
