@echo off
echo Starting Config Manager installation...

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed. Please install Python 3.9 or higher.
    exit /b 1
)

REM Install uv if not present
uv --version >nul 2>&1
if errorlevel 1 (
    echo Installing uv package manager...
    curl -LsSf https://astral.sh/uv/install.sh | sh
)

REM Create virtual environment
echo Creating virtual environment...
python -m venv .venv

REM Activate virtual environment
call .venv\Scripts\activate.bat

REM Install dependencies
echo Installing dependencies...
uv pip install --upgrade pip
uv pip install -r requirements.txt

echo Installation completed successfully!
echo To activate the virtual environment, run:
echo .venv\Scripts\activate