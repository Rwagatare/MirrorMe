import os
from pathlib import Path

# Base directory — the backend/ folder
BASE_DIR = Path(__file__).parent
ROOT_DIR = BASE_DIR.parent

# Database — SQLite file stored locally, never leaves your machine
DATABASE_URL = f"sqlite:///{BASE_DIR}/data/mirrorme.db"

# Resolve chosen Ollama model from .mirrorme_config (written by setup.sh),
# falling back to the bundled default.
_config_path  = ROOT_DIR / ".mirrorme_config"
_ollama_model = "llama3.2:3b"
if _config_path.exists():
    for _line in _config_path.read_text().splitlines():
        if _line.startswith("OLLAMA_MODEL="):
            _ollama_model = _line.split("=", 1)[1].strip()

OLLAMA_URL         = "http://localhost:11434"
OLLAMA_MODEL       = _ollama_model
OLLAMA_EMBED_MODEL = "nomic-embed-text"

# ChromaDB — vector store for RAG, stored locally
CHROMA_DIR = str(BASE_DIR / "data" / "chroma")

# App
APP_NAME    = "MirrorMe"
APP_VERSION = "0.1.0"
