#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

echo "Starting Config Manager installation..."

# Check Python version
if ! command_exists python3; then
    echo "Error: Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
python -m pip install --no-cache-dir --upgrade pip
python -m pip install --no-cache-dir -r requirements.txt

echo "Installation completed successfully!"
