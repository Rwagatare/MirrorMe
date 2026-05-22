from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional, Any
from datetime import datetime
from pydantic import BaseModel, computed_field

from database import get_db
from models import Goal, GoalTask


def _with_computed_progress(goal: Goal) -> dict:
    """Return goal as a dict, replacing stored progress with sub-task computation."""
    tasks = goal.tasks or []
    total = len(tasks)
    if total == 0:
        computed = goal.progress  # fall back to stored value when no sub-tasks
    else:
        done = sum(1 for t in tasks if t.is_done)
        computed = round(done / total * 100, 1)
    return {
        "id": goal.id,
        "title": goal.title,
        "description": goal.description,
        "deadline": goal.deadline,
        "progress": computed,
        "color": goal.color,
        "parent_id": goal.parent_id,
        "tasks": [
            {"id": t.id, "goal_id": t.goal_id, "title": t.title,
             "is_done": t.is_done, "created_at": t.created_at}
            for t in tasks
        ],
    }


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
    """Return all goals with computed progress."""
    goals = db.query(Goal).options(joinedload(Goal.tasks)).all()
    return [_with_computed_progress(g) for g in goals]


@router.get("/{goal_id}")
def get_goal(goal_id: int, db: Session = Depends(get_db)):
    """Return a single goal with sub-tasks and computed progress."""
    goal = db.query(Goal).options(joinedload(Goal.tasks)).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail=f"Goal {goal_id} not found")
    return _with_computed_progress(goal)


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
