from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import HTMLResponse
from pathlib import Path

app = FastAPI(
    title="myDRE Upload Manager",
    description="A secure web application for managing myDRE configuration files",
    version="1.0.0",
    docs_url=None,  # Disable default docs
    redoc_url=None  # Disable default redoc
)

# Mount static directory
static_dir = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_dir), name="static")

# Templates
templates = Jinja2Templates(directory=Path(__file__).parent / "templates")

# Import routers
from app.api.v1.api import api_router
app.include_router(api_router, prefix="/api/v1")

@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return templates.TemplateResponse(
        "index.html",
        {"request": request}
    )

@app.get("/config/create", response_class=HTMLResponse)
async def create_config_page(request: Request):
    return templates.TemplateResponse(
        "create_config.html",
        {"request": request}
    )

@app.get("/config/combine", response_class=HTMLResponse)
async def combine_config_page(request: Request):
    return templates.TemplateResponse(
        "combine_config.html",
        {"request": request}
    )

@app.get("/upload", response_class=HTMLResponse)
async def upload_page(request: Request):
    return templates.TemplateResponse(
        "upload.html",
        {"request": request}
    )

@app.get("/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return HTMLResponse(
        """
        <!DOCTYPE html>
        <html>
        <head>
            <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
            <link rel="stylesheet" href="https://code.getmdl.io/1.3.0/material.indigo-pink.min.css">
            <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
            <script defer src="https://code.getmdl.io/1.3.0/material.min.js"></script>
            <style>
                .back-nav {
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    z-index: 1000;
                }
                .mdl-button--fab {
                    background: #3f51b5 !important;
                }
                .swagger-ui {
                    margin-top: 20px;
                    padding: 20px;
                }
            </style>
        </head>
        <body>
            <a href="/" class="back-nav mdl-button mdl-js-button mdl-button--fab mdl-button--colored">
                <i class="material-icons">arrow_back</i>
            </a>
            <div id="swagger-ui"></div>
            <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
            <script>
                window.onload = () => {
                    const ui = SwaggerUIBundle({
                        url: '/openapi.json',
                        dom_id: '#swagger-ui',
                        presets: [
                            SwaggerUIBundle.presets.apis,
                            SwaggerUIBundle.SwaggerUIStandalonePreset
                        ],
                        layout: "BaseLayout",
                        deepLinking: true
                    });
                };
            </script>
        </body>
        </html>
        """
    )

@app.get("/redoc", include_in_schema=False)
async def custom_redoc_html():
    return HTMLResponse(
        """
        <!DOCTYPE html>
        <html>
        <head>
            <title>myDRE Upload Manager - ReDoc</title>
            <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons">
            <link rel="stylesheet" href="https://code.getmdl.io/1.3.0/material.indigo-pink.min.css">
            <script defer src="https://code.getmdl.io/1.3.0/material.min.js"></script>
            <meta charset="utf-8"/>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                .back-nav {
                    position: fixed;
                    top: 10px;
                    left: 10px;
                    z-index: 1000;
                }
                .mdl-button--fab {
                    background: #3f51b5 !important;
                }
                body {
                    margin: 0;
                    padding: 0;
                }
                #redoc-container {
                    margin-top: 20px;
                }
            </style>
        </head>
        <body>
            <a href="/" class="back-nav mdl-button mdl-js-button mdl-button--fab mdl-button--colored">
                <i class="material-icons">arrow_back</i>
            </a>
            <div id="redoc-container"></div>
            <script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"></script>
            <script>
                Redoc.init(
                    '/openapi.json',
                    {
                        scrollYOffset: 50
                    },
                    document.getElementById('redoc-container')
                );
            </script>
        </body>
        </html>
        """
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 