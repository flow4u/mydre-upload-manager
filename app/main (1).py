from fastapi import FastAPI, File, UploadFile, Form, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from pathlib import Path

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
app.mount("/static", StaticFiles(directory="app/static"), name="static")

# Configure templates
templates = Jinja2Templates(directory="app/templates")

# Configure upload folder
UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(exist_ok=True)

@app.get("/")
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/combine")
async def combine_config(request: Request):
    return templates.TemplateResponse("combine_config.html", {"request": request})

@app.post("/api/decrypt/")  # Note the trailing slash
async def decrypt_file(
    request: Request,
    file: UploadFile = File(...),
    pin: str = Form(...)
):
    print(f"Decrypt endpoint called with PIN: {pin}")  # Debug print
    
    try:
        # Create temporary directory if it doesn't exist
        temp_dir = UPLOAD_FOLDER / "temp"
        temp_dir.mkdir(exist_ok=True)
        
        # Save the file temporarily
        temp_path = temp_dir / file.filename
        content = await file.read()
        
        with open(temp_path, "wb") as f:
            f.write(content)

        print(f"File saved temporarily at: {temp_path}")  # Debug print

        # TODO: Add your actual decryption logic here
        # For now, we'll just simulate successful decryption
        decryption_successful = True

        # Clean up the temporary file
        temp_path.unlink()

        if decryption_successful:
            return {
                "success": True,
                "message": "File decrypted successfully"
            }
        else:
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": "Invalid PIN or corrupted file"
                }
            )

    except Exception as e:
        print(f"Error in decrypt_file: {str(e)}")  # Debug print
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": str(e)
            }
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 