import chromadb
from config import CHROMA_DIR

_collection = None


def get_collection():
    global _collection
    if _collection is not None:
        return _collection
    try:
        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        _collection = client.get_or_create_collection("mirrorme_memories")
        return _collection
    except Exception:
        return None


# collection is None at import time — no blocking I/O on startup
collection = None
