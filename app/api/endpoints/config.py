from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse, Response
from app.core.security import decrypt_data, encrypt_data
from pydantic import BaseModel
import json
import base64
import logging
import re

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def sanitize_filename(filename: str, is_email: bool = False) -> str:
    """
    Sanitize filename to be safe across operating systems.
    Preserves underscores and hyphens, removes other special characters.
    For email addresses, only uses the part before @.
    """
    # If it's an email, take only the part before @ first
    if is_email and '@' in filename:
        filename = filename.split('@')[0]
        # Remove any dots from the email username part
        filename = filename.replace('.', '')
    
    # Remove any characters that aren't alphanumeric, underscore, or hyphen
    filename = re.sub(r'[^\w\-]', '', filename)
    
    # Remove leading/trailing underscores or hyphens
    filename = filename.strip('_-')
    
    return filename

class ConfigCreate(BaseModel):
    workspace_name: str
    workspace_key: str
    subscription_key: str
    uploader_name: str
    pin: str

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
        
        # Create safe filename
        safe_workspace_name = sanitize_filename(config.workspace_name)
        safe_uploader_name = sanitize_filename(config.uploader_name, is_email=True)
        filename = f"{safe_workspace_name}-{safe_uploader_name}.mydre"
        
        logger.debug(f"Generated filename: {filename}")
        
        # Return as downloadable file
        return Response(
            content=encrypted_data,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"'
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error creating configuration: {str(e)}"
        )

@router.post("/decrypt")
async def decrypt_config(
    file: UploadFile = File(...),
    pin: str = Form(...)
):
    try:
        # Log received data
        logger.debug(f"Received file: {file.filename}")
        logger.debug(f"PIN length: {len(pin)}")
        
        # Read the file content
        file_content = await file.read()
        logger.debug(f"File content length: {len(file_content)}")
        
        try:
            # Decrypt the file content using the PIN
            decrypted_data = decrypt_data(file_content, pin)
            logger.debug("Decryption successful")
        except Exception as decrypt_error:
            logger.error(f"Decryption failed: {str(decrypt_error)}")
            raise HTTPException(
                status_code=400,
                detail=f"Decryption failed: {str(decrypt_error)}"
            )
        
        try:
            # Parse the decrypted data
            config = json.loads(decrypted_data)
            logger.debug(f"Parsed config: {json.dumps(config, indent=2)}")
        except json.JSONDecodeError as json_error:
            logger.error(f"JSON parsing failed: {str(json_error)}")
            raise HTTPException(
                status_code=400,
                detail="Invalid JSON format in decrypted data"
            )
        
        # Extract workspace data
        if 'workspaces' in config:
            try:
                workspace_data = next(iter(config['workspaces'].values()))
                response_data = {
                    'workspace_name': next(iter(config['workspaces'].keys())),
                    'workspace_key': workspace_data['workspace_key'],
                    'subscription_key': workspace_data['subscription_key'],
                    'uploader_name': workspace_data['uploader_name']
                }
                logger.debug(f"Response data: {json.dumps(response_data, indent=2)}")
                return response_data
            except Exception as extract_error:
                logger.error(f"Data extraction failed: {str(extract_error)}")
                raise HTTPException(
                    status_code=400,
                    detail="Failed to extract configuration data"
                )
        else:
            logger.error("No workspaces found in config")
            raise HTTPException(
                status_code=400,
                detail="Invalid configuration format: no workspaces found"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )