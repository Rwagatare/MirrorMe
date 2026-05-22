from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import APP_NAME, APP_VERSION, BASE_DIR
from database import engine, Base
import models  # noqa: F401 — side-effect import; registers models with Base.metadata

from routers import tasks, goals, habits, memory, goal_tasks

# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------
app = FastAPI(title=APP_NAME, version=APP_VERSION)

# ---------------------------------------------------------------------------
# CORS — allow the Vite/React dev server to call the API
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Startup: create DB tables and ensure the data directory exists
# ---------------------------------------------------------------------------
@app.on_event("startup")
def on_startup():
    # Create backend/data/ if it doesn't exist yet (SQLite needs the folder)
    data_dir = BASE_DIR / "data"
    data_dir.mkdir(exist_ok=True)

    # Create all tables declared in models.py (no-op if they already exist)
    Base.metadata.create_all(bind=engine)


# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(tasks.router)
app.include_router(goals.router)
app.include_router(goal_tasks.router)
app.include_router(habits.router)
app.include_router(memory.router)


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/health")
def health():
    return {"app": APP_NAME, "version": APP_VERSION, "status": "ok"}
