from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import MemoryLog


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


@router.get("/")
def get_memories(db: Session = Depends(get_db)):
    """Return all memory log entries, newest first."""
    return db.query(MemoryLog).order_by(MemoryLog.created_at.desc()).all()


@router.get("/{memory_id}")
def get_memory(memory_id: int, db: Session = Depends(get_db)):
    """Return a single memory log entry by id."""
    entry = db.query(MemoryLog).filter(MemoryLog.id == memory_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Memory {memory_id} not found")
    return entry


@router.post("/")
def create_memory(data: MemoryCreate, db: Session = Depends(get_db)):
    """Create a new memory log entry."""
    entry = MemoryLog(**data.model_dump())
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


@router.patch("/{memory_id}")
def update_memory(memory_id: int, updates: MemoryUpdate, db: Session = Depends(get_db)):
    """Update specific fields on an existing memory log entry. Unset fields are left unchanged."""
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
    """Permanently delete a memory log entry by id."""
    entry = db.query(MemoryLog).filter(MemoryLog.id == memory_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail=f"Memory {memory_id} not found")

    db.delete(entry)
    db.commit()
    return {"message": f"Memory {memory_id} deleted"}
