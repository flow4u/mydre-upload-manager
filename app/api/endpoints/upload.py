from fastapi import APIRouter, File, Form, UploadFile, HTTPException
from typing import List
from ...utils.uploader import Upload
import os
import logging
from datetime import datetime
import tempfile
import traceback
import json

# Configure logging properly
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

router = APIRouter()

def sanitize_filename(name):
    """Sanitize the user name to create a valid filename."""
    # Replace invalid characters with underscores
    return ''.join(c if c.isalnum() or c in (' ', '_') else '_' for c in name)



@router.post("/workspace")
async def upload_to_workspace(
    workspace_name: str = Form(...),
    uploader_name: str = Form(...),
    workspace_key: str = Form(...),
    subscription_key: str = Form(...),
    config_data: str = Form(...),
    files: List[UploadFile] = File(...)
):
    try:
        logger.info(f"Starting upload process for workspace: {workspace_name}")
        
        # Parse config data
        config = json.loads(config_data)
        workspace_key = config.get('workspace_key')
        subscription_key = config.get('subscription_key')

        if not workspace_key or not subscription_key:
            raise ValueError("Missing required keys in config data")

        # Initialize uploader
        uploader = Upload(
            ws_name=workspace_name,
            ws_description=f"Upload via web interface by {uploader_name}",
            ws_key=workspace_key,
            tenant_key=subscription_key,
            user_name=uploader_name
        )

        # uploader = Upload(workspace_name, workspace_key, subscription_key, uploader_name)
        logger.debug(f'{workspace_name=}')
        logger.debug(f'{workspace_key=}')
        logger.debug(f'{subscription_key=}')
        logger.debug(f'{uploader_name=}')
        # uploader.create_workspace_container()

# Create and upload the user name file
        sanitized_user_name = sanitize_filename(uploader_name)
        user_file_path = f"{sanitized_user_name}.txt"
        with open(user_file_path, "w") as f:
            # Write the uploader information and upload timestamp
            upload_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            f.write(f"Uploaded by: {uploader_name}\n")
            f.write(f"Uploaded on: {upload_time}\n\n")
            f.write("List of all the uploaded files:\n")
        #     Write all filenames to the txt file first
        # uploaded_files = []
        # with tempfile.TemporaryDirectory() as temp_dir:
        #     for file in files:
        #                        f.write(f"{file.filename}\n")
        #         logger.debug(file.filename)


        # # Upload user name file first
        # # file_label.config(text=f"Uploading: {user_file_path}")
        # logger.debug(f'{user_file_path=}')
        # # uploader.file2(user_file_path)

        # Upload selected files
        # for i, file in enumerate(files, start=2):
        for file in files:
            logger.log(f'{file=}')
            uploader.file2(file)

        uploader.commit_workspace_container()


        # # logger.debug("Creating workspace container")
        # # try:
        # #     uploader.create_workspace_container()
        # # except Exception as e:
        # #     logger.error(f"Container creation failed: {str(e)}")
        # #     raise HTTPException(
        # #         status_code=401,
        # #         detail=f"Authentication failed: {str(e)}"
        # #     )

        # # uploaded_files = []
        # # for file in files:
        # #     logger.debug(f"Processing file: {file.filename}")
        # #     temp_path = f"/tmp/{file.filename}"
        # #     try:
        # #         with open(temp_path, "wb") as buffer:
        # #             content = await file.read()
        # #             buffer.write(content)
                
        # #         logger.debug(f"Uploading file: {file.filename}")
        # #         uploader.file2(temp_path)
        # #         uploaded_files.append(file.filename)
        # #     except Exception as e:
        # #         logger.error(f"Error processing file {file.filename}: {str(e)}")
        # #         raise
        # #     finally:
        # #         if os.path.exists(temp_path):
        # #             os.remove(temp_path)
        try:
            temp_path = os.path.join(temp_dir, file.filename)
            logger.info(f"Processing file: {file.filename}")
            
            # Save to temp file
            content = await file.read()
            with open(temp_path, "wb") as f:
                f.write(content)
            
            # Upload file
            logger.info(f"Uploading: {file.filename}")
            uploader.file2(temp_path)
            uploaded_files.append(file.filename)
            logger.info(f"Successfully uploaded: {file.filename}")
        
        except Exception as e:
            logger.error(f"Failed to upload {file.filename}: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )

        # logger.debug("Committing workspace container")
        # uploader.commit_workspace_container()
        
        return {
            "status": "success",
            "message": f"Successfully uploaded {len(uploaded_files)} files",
            "files": uploaded_files
        }

    except Exception as e:
        error_msg = f"Upload failed: {str(e)}"
        logger.error(error_msg)
        logger.error(traceback.format_exc())
        raise HTTPException(
            status_code=500,
            detail=error_msg
        )