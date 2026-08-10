from datetime import date as date_cls, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel

from database import get_db
from models import MemoryLog

# Mood is stored as whatever the UI sends. Historically that's been the emoji
# scale (see MemoryButton.jsx), but the schema comment documents word labels
# too — normalize both so aggregation/sentiment logic works regardless of
# which the entry was written with.
MOOD_SCORES = {
    "😔": 1, "terrible": 1,
    "😐": 2, "hard": 2,
    "🙂": 3, "okay": 3,
    "😊": 4, "good": 4,
    "🤩": 5, "great": 5,
}
MOOD_LABELS = {1: "terrible", 2: "hard", 3: "okay", 4: "good", 5: "great"}


def mood_score(mood: str | None) -> int | None:
    return MOOD_SCORES.get(mood) if mood else None


class MemoryCreate(BaseModel):
    content: str
    entry_type: Optional[str] = None    # journal | context | note
    mood: Optional[str] = None          # great | good | okay | hard | terrible
    energy: Optional[str] = None        # high | medium | low
    activity: Optional[str] = None
    resume_at: Optional[str] = None
    date: str                           # "2026-05-21"
    time_of_day: Optional[str] = None   # morning | afternoon | evening | night


class MemoryUpdate(BaseModel):
    content: Optional[str] = None
    entry_type: Optional[str] = None
    mood: Optional[str] = None
    energy: Optional[str] = None
    activity: Optional[str] = None
    resume_at: Optional[str] = None
    date: Optional[str] = None
    time_of_day: Optional[str] = None


router = APIRouter(prefix="/memory", tags=["memory"])


# ── /search must be before /{memory_id} so FastAPI doesn't coerce "search" to int
@router.get("/search")
def search_memories_route(q: str, db: Session = Depends(get_db)):
    """Semantic search over embedded memories. Returns [] if ChromaDB/Ollama unavailable."""
    try:
        from ai.embeddings import search_memories
        return search_memories(q, n_results=5)
    except Exception:
        return []


@router.get("/mood-summary")
def mood_summary(days: int = 7, db: Session = Depends(get_db)):
    """Aggregate mood over the last `days` days (default 7) for questions like
    'how was my mood this week'. Returns the average score, a label, and the
    underlying entries so the AI can cite specific days/content."""
    since = (date_cls.today() - timedelta(days=days - 1)).isoformat()
    entries = (
        db.query(MemoryLog)
        .filter(MemoryLog.date >= since)
        .order_by(MemoryLog.date.asc())
        .all()
    )

    scored = [(e, mood_score(e.mood)) for e in entries if mood_score(e.mood) is not None]
    avg = round(sum(s for _, s in scored) / len(scored), 2) if scored else None

    return {
        "since": since,
        "days": days,
        "entry_count": len(entries),
        "average_score": avg,
        "average_label": MOOD_LABELS.get(round(avg)) if avg else None,
        "entries": [
            {
                "date": e.date,
                "mood": e.mood,
                "mood_label": MOOD_LABELS.get(mood_score(e.mood)),
                "entry_type": e.entry_type,
                "content": e.content,
            }
            for e in entries
        ],
    }


@router.get("/")
def get_memories(since: Optional[str] = None, until: Optional[str] = None, db: Session = Depends(get_db)):
    """Return memory log entries, newest first. Optionally bounded by date
    (inclusive, 'YYYY-MM-DD') via ?since=&until=."""
    q = db.query(MemoryLog)
    if since:
        q = q.filter(MemoryLog.date >= since)
    if until:
        q = q.filter(MemoryLog.date <= until)
    return q.order_by(MemoryLog.created_at.desc()).all()


@router.get("/{memory_id}")
def get_memory(memory_id: int, db: Session = Depends(get_db)):
    """Return a single memory log entry by id."""
    entry = db.query(MemoryLog).filter(MemoryLog.id == memory_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Memory {memory_id} not found")
    return entry


@router.post("/")
def create_memory(data: MemoryCreate, db: Session = Depends(get_db)):
    """Create a new memory log entry and embed it into ChromaDB."""
    entry = MemoryLog(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)

    # Embed into ChromaDB — fail silently if Ollama is unreachable
    try:
        from ai.embeddings import embed_memory
        chroma_id = embed_memory(entry)
        if chroma_id:
            entry.chroma_id = chroma_id
            db.commit()
            db.refresh(entry)
    except Exception:
        pass

    return entry


@router.patch("/{memory_id}")
def update_memory(memory_id: int, updates: MemoryUpdate, db: Session = Depends(get_db)):
    """Update specific fields on an existing memory log entry."""
    entry = db.query(MemoryLog).filter(MemoryLog.id == memory_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Memory {memory_id} not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(entry, field, value)

    db.commit()
    db.refresh(entry)
    return entry


@router.delete("/{memory_id}")
def delete_memory(memory_id: int, db: Session = Depends(get_db)):
    """Permanently delete a memory log entry."""
    entry = db.query(MemoryLog).filter(MemoryLog.id == memory_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Memory {memory_id} not found")

    db.delete(entry)
    db.commit()
    return {"message": f"Memory {memory_id} deleted"}
