import requests
from config import OLLAMA_URL, OLLAMA_EMBED_MODEL
from ai.chroma_client import get_collection


def _get_embedding(text: str):
    """Call Ollama to embed text. Returns None if Ollama is unreachable."""
    try:
        res = requests.post(
            f"{OLLAMA_URL}/api/embeddings",
            json={"model": OLLAMA_EMBED_MODEL, "prompt": text},
            timeout=10,
        )
        res.raise_for_status()
        return res.json().get("embedding")
    except Exception:
        return None


def embed_memory(memory_log):
    """Embed a MemoryLog entry and store it in ChromaDB.
    Returns the chroma_id on success, None on failure.
    """
    col = get_collection()
    if col is None:
        return None
    try:
        embedding = _get_embedding(memory_log.content)
        if embedding is None:
            return None

        chroma_id = f"mem_{memory_log.id}"
        col.upsert(
            ids=[chroma_id],
            embeddings=[embedding],
            documents=[memory_log.content],
            metadatas=[{
                "entry_type":  memory_log.entry_type  or "context",
                "mood":        memory_log.mood         or "",
                "date":        memory_log.date         or "",
                "time_of_day": memory_log.time_of_day  or "",
                "memory_id":   memory_log.id,
            }],
        )
        return chroma_id
    except Exception as e:
        print(f"[ChromaDB] embed_memory failed: {e}")
        return None


def search_memories(query: str, n_results: int = 5) -> list:
    """Embed query and return the most similar memories from ChromaDB.
    Returns [] if ChromaDB is empty or Ollama is unreachable.
    """
    col = get_collection()
    if col is None:
        return []
    try:
        count = col.count()
        if count == 0:
            return []

        embedding = _get_embedding(query)
        if embedding is None:
            return []

        results = col.query(
            query_embeddings=[embedding],
            n_results=min(n_results, count),
        )

        memories = []
        docs      = results.get("documents",  [[]])[0]
        metas     = results.get("metadatas",  [[]])[0]
        distances = results.get("distances",  [[]])[0]

        for doc, meta, dist in zip(docs, metas, distances):
            memories.append({
                "content":    doc,
                "date":       meta.get("date", ""),
                "entry_type": meta.get("entry_type", ""),
                "mood":       meta.get("mood", ""),
                "distance":   round(dist, 4),
            })
        return memories

    except Exception as e:
        print(f"[ChromaDB] search_memories failed: {e}")
        return []
