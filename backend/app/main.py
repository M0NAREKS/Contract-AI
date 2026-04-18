from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.db import create_tables
from app.routes.contracts import router as contracts_router
from app.routes.health import router as health_router
from app.routes.ui import router as ui_router


@asynccontextmanager
async def lifespan(_: FastAPI):
    create_tables()
    yield


app = FastAPI(
    title="Contract Upload API",
    description="Upload PDF/TXT contracts and persist extracted text for later analysis.",
    version="0.1.0",
    lifespan=lifespan,
)

ROOT_DIR = Path(__file__).resolve().parents[2]
FRONTEND_DIR = ROOT_DIR / "frontend"
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")

app.include_router(ui_router)
app.include_router(health_router)
app.include_router(contracts_router)
