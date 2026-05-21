from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel

from database import get_db
from models import Habit


class HabitCreate(BaseModel):
    title: str
    emoji: Optional[str] = None
    completions: str = "[]"   # JSON list of ISO date strings, e.g. ["2026-05-21"]
    streak_count: int = 0


class HabitUpdate(BaseModel):
    title: Optional[str] = None
    emoji: Optional[str] = None
    completions: Optional[str] = None
    streak_count: Optional[int] = None


router = APIRouter(prefix="/habits", tags=["habits"])


@router.get("/")
def get_habits(db: Session = Depends(get_db)):
    """Return all habits."""
    return db.query(Habit).all()


@router.get("/{habit_id}")
def get_habit(habit_id: int, db: Session = Depends(get_db)):
    """Return a single habit by id."""
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail=f"Habit {habit_id} not found")
    return habit


@router.post("/")
def create_habit(data: HabitCreate, db: Session = Depends(get_db)):
    """Create a new habit."""
    habit = Habit(**data.model_dump())
    db.add(habit)
    db.commit()
    db.refresh(habit)
    return habit


@router.patch("/{habit_id}")
def update_habit(habit_id: int, updates: HabitUpdate, db: Session = Depends(get_db)):
    """Update specific fields on an existing habit. Unset fields are left unchanged."""
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail=f"Habit {habit_id} not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(habit, field, value)

    db.commit()
    db.refresh(habit)
    return habit


@router.delete("/{habit_id}")
def delete_habit(habit_id: int, db: Session = Depends(get_db)):
    """Permanently delete a habit by id."""
    habit = db.query(Habit).filter(Habit.id == habit_id).first()
    if not habit:
        raise HTTPException(status_code=404, detail=f"Habit {habit_id} not found")

    db.delete(habit)
    db.commit()
    return {"message": f"Habit {habit_id} deleted"}
