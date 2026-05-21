from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

from database import get_db
from models import Goal


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    progress: float = 0.0
    color: Optional[str] = None
    parent_id: Optional[int] = None


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    deadline: Optional[datetime] = None
    progress: Optional[float] = None
    color: Optional[str] = None
    parent_id: Optional[int] = None


router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("/")
def get_goals(db: Session = Depends(get_db)):
    """Return all goals."""
    return db.query(Goal).all()


@router.get("/{goal_id}")
def get_goal(goal_id: int, db: Session = Depends(get_db)):
    """Return a single goal by id."""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail=f"Goal {goal_id} not found")
    return goal


@router.post("/")
def create_goal(data: GoalCreate, db: Session = Depends(get_db)):
    """Create a new goal."""
    goal = Goal(**data.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.patch("/{goal_id}")
def update_goal(goal_id: int, updates: GoalUpdate, db: Session = Depends(get_db)):
    """Update specific fields on an existing goal. Unset fields are left unchanged."""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail=f"Goal {goal_id} not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)

    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}")
def delete_goal(goal_id: int, db: Session = Depends(get_db)):
    """Permanently delete a goal by id."""
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail=f"Goal {goal_id} not found")

    db.delete(goal)
    db.commit()
    return {"message": f"Goal {goal_id} deleted"}
