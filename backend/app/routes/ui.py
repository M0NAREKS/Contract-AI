from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse


router = APIRouter(tags=["ui"])
FRONTEND_DIR = Path(__file__).resolve().parents[3] / "frontend"


@router.get("/", include_in_schema=False)
def serve_ui() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")
