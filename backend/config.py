from pathlib import Path

# Base directory — the backend/ folder
BASE_DIR = Path(__file__).parent

# Database — SQLite file stored locally, never leaves your machine
DATABASE_URL = f"sqlite:///{BASE_DIR}/data/mirrorme.db"

# Ollama — runs locally on your machine
OLLAMA_URL = "http://localhost:11434"
OLLAMA_MODEL = "llama3.2:3b"
OLLAMA_EMBED_MODEL = "nomic-embed-text"

# ChromaDB — vector store for RAG, stored locally
CHROMA_DIR = str(BASE_DIR / "data" / "chroma")

# App
APP_NAME = "MirrorMe"
APP_VERSION = "0.1.0"