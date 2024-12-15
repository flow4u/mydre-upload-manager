# myDRE Upload Manager

A secure web application for managing myDRE configuration files. This application allows users to create, combine, and manage encrypted configuration files with a modern Material Design interface.

## Features

- Create encrypted myDRE configuration files
- Combine multiple configurations
- Upload and view configuration data
- Modern Material Design UI
- Secure PIN-based encryption
- Drag & drop file handling

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/config-manager.git
cd config-manager
```

2. Create a virtual environment and activate it:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

## Usage

1. Start the application:
```bash
python -m app.main
```

2. Open your browser and navigate to:
```
http://localhost:8000
```

### Creating a Configuration

1. Click "Create Config" on the home page
2. Fill in the required details:
   - Workspace Name
   - Workspace Key
   - Subscription Key
   - Uploader Name
   - PIN (minimum 6 characters)
3. Click "Create and Download Config"

### Combining Configurations

1. Click "Combine Configs" on the home page
2. Drag & drop or select multiple .mydre files
3. Enter the PIN for each file to decrypt
4. Review the workspaces to be combined
5. Enter a new PIN for the combined configuration
6. Click "Combine and Download"

### Uploading Data

1. Click "Upload Data" on the home page
2. Select configuration files to view
3. Enter PINs to decrypt configurations
4. View and manage workspace details

## Development

The project uses:
- FastAPI for the backend
- Material Design Lite for the frontend
- Pydantic for data validation
- Cryptography for secure encryption

### Project Structure

```
config_manager/
├── app/
│   ├── api/
│   │   ├── v1/
│   │   └── endpoints/
│   ├── core/
│   ├── models/
│   ├── schemas/
│   ├── services/
│   ├── static/
│   └── templates/
├── scripts/
├── tests/
└── docs/
```

## Security

- All configuration files are encrypted using strong encryption
- PINs must be at least 6 characters long
- Files are encrypted using Fernet (AES-128)
- Secure key derivation using PBKDF2

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Your chosen license]