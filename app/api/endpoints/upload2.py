from fastapi import APIRouter, File, Form, UploadFile, HTTPException, Body
from typing import List, Dict
import logging
import os
from datetime import datetime
from pathlib import Path
from app.core.security import decrypt_data
from pydantic import BaseModel
from app.utils.uploader import Upload  # Import the uploader

router = APIRouter()
logger = logging.getLogger(__name__)

# Define upload directory relative to project root
UPLOAD_DIR = Path("app/uploads")

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

def sanitize_filename(name):
    """Sanitize the user name to create a valid filename."""
    # Replace invalid characters with underscores
    return ''.join(c if c.isalnum() or c in (' ', '_') else '_' for c in name)


class Upload2Request(BaseModel):
    workspace_name: str
    workspace_key: str
    subscription_key: str
    uploader_name: str
    files: List[str]

@router.post("/upload")
async def upload_files(upload_data: Upload2Request):
    try:
        logger.info(f"Received upload request for workspace: {upload_data.workspace_name}")
        
        # Initialize uploader with all required parameters
        uploader = Upload(
            workspace_name=upload_data.workspace_name,
            workspace_key=upload_data.workspace_key,
            subscription_key=upload_data.subscription_key,
            uploader_name=upload_data.uploader_name
        )
        uploader.create_workspace_container()
        logger.info(f"Initialized uploader for workspace: {upload_data.workspace_name}")

        # Upload each file
        # cwd = os.getcwd()
        # os.chdir(UPLOAD_DIR)
        upload_log = ''
        for file_path in upload_data.files:
            try:
                file_path = Path(file_path)
                if file_path.exists():
                    logger.info(f"Processing file: {file_path}")
                    
                    # Get just the filename without the path
                    file_name = file_path.name
                    
                    logger.info(f"Uploading file: {file_name} from path: {file_path}")
                    logger.info(f'{file_path=}')
                    try:
                        # Call file2 with just the file path as string
                        uploader.file2(str(file_path))
                        upload_log= upload_log + (f'- {file_name}\n')
                        logger.info(f"Successfully uploaded: {file_name}")
                    except Exception as upload_error:
                        logger.error(f"Error in file2 upload: {str(upload_error)}")
                        raise HTTPException(
                            status_code=500, 
                            detail=f"Error uploading {file_name}: {str(upload_error)}"
                        )
                else:
                    logger.error(f"File not found: {file_path}")
                    raise HTTPException(
                        status_code=404, 
                        detail=f"File not found: {file_path}"
                    )
            except Exception as file_error:
                logger.error(f"Error processing file {file_path}: {str(file_error)}")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Error processing file {file_path}: {str(file_error)}"
                )

            sanitized_user_name = sanitize_filename(upload_data.uploader_name)
            user_file_path = f"{sanitized_user_name}.txt"
            with open(user_file_path, "w") as f:
                # Write the uploader information and upload timestamp
                upload_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                f.write(f"Uploaded by: {upload_data.uploader_name}\n")
                f.write(f"Uploaded on: {upload_time}\n\n")
                f.write("List of all the uploaded files:\n")
                f.write(upload_log)
            uploader.file2(user_file_path)


        try:
            # Commit the workspace container
            uploader.commit_workspace_container()
            logger.info(f"Successfully committed workspace container for: {upload_data.workspace_name}")
        except Exception as commit_error:
            logger.error(f"Error committing workspace: {str(commit_error)}")
            raise HTTPException(
                status_code=500, 
                detail=f"Error committing workspace: {str(commit_error)}"
            )
        # os.chdir(cwd)
        return {
            "status": "success",
            "message": f"Files uploaded to workspace {upload_data.workspace_name}"
        }

    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/files/{filename}")
async def delete_file(filename: str):
    try:
        file_path = UPLOAD_DIR / filename
        if file_path.exists():
            os.remove(file_path)
            logger.info(f"File deleted successfully: {file_path}")
            return {"status": "success", "message": "File deleted"}
        else:
            raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        logger.error(f"Delete failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/decrypt")
async def decrypt_mydre_file(
    file: UploadFile = File(...),
    pin: str = Form(...)
):
    try:
        # Read the encrypted file content
        content = await file.read()
        
        try:
            # Use the security.py decrypt_data function
            decrypted_data = decrypt_data(content, pin)
            
            return {
                "status": "success",
                "data": decrypted_data
            }
        except Exception as decrypt_error:
            logger.error(f"Decryption failed: {str(decrypt_error)}")
            return {
                "status": "error",
                "message": "Invalid PIN or corrupted file"
            }
            
    except Exception as e:
        logger.error(f"Decryption process failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/files")
async def get_uploaded_files():
    """Get list of files in the upload directory"""
    try:
        logger.info(f"Accessing upload directory at: {UPLOAD_DIR}")
        
        # Ensure upload directory exists
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        if not UPLOAD_DIR.exists():
            logger.error(f"Upload directory does not exist: {UPLOAD_DIR}")
            raise HTTPException(status_code=500, detail="Upload directory not found")
        
        files = []
        try:
            # List all files in the upload directory
            for file_path in UPLOAD_DIR.glob('*'):
                if file_path.is_file() and not file_path.name.startswith('.'):
                    files.append({
                        "filename": file_path.name,
                        "path": str(file_path.absolute())
                    })
            
            logger.info(f"Found {len(files)} files in upload directory")
            return {
                "status": "success",
                "files": files
            }
            
        except Exception as e:
            logger.error(f"Error listing files: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")
            
    except Exception as e:
        logger.error(f"Failed to get uploaded files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
