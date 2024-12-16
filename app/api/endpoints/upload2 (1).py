from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from typing import List
import logging
import os
from pathlib import Path
# from app.core.security import decrypt_key_file  # Import from security.py
from app.core.security import decrypt_data

router = APIRouter()
logger = logging.getLogger(__name__)

# Define upload directory relative to project root
UPLOAD_DIR = Path("app/uploads")

# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/files")
async def upload_files(files: List[UploadFile] = File(...)):
    try:
        uploaded_files = []
        for file in files:
            # Create safe file path
            file_path = UPLOAD_DIR / file.filename
            
            # Save file
            with open(file_path, "wb") as buffer:
                content = await file.read()
                buffer.write(content)
            
            uploaded_files.append({
                "filename": file.filename,
                "path": str(file_path)
            })
            
            logger.info(f"File uploaded successfully: {file_path}")
        
        return {
            "status": "success",
            "message": f"Uploaded {len(uploaded_files)} files",
            "files": uploaded_files
        }
        
    except Exception as e:
        logger.error(f"Upload failed: {str(e)}")
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
    try:
        files = []
        for file_path in UPLOAD_DIR.glob('*'):
            if file_path.is_file() and not file_path.name.startswith('.'):
                files.append({
                    "filename": file_path.name,
                    "path": str(file_path)
                })
        
        return {
            "status": "success",
            "files": files
        }
    except Exception as e:
        logger.error(f"Failed to get uploaded files: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
