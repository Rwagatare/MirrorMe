from fastapi import APIRouter, Depends, HTTPException 
from sqlalchemy.orm import Session 
from typing import List
from database import get_db
from models import Task
from pydantic import BaseModel 
from datetime import datetime
from typing import Optional

# What a task looks like when arrives at the API
class TaskCreate(BaseModel): 
    title: str
    notes: Optional[str] = None 
    due_date: Optional[str] = None 
    reminder_time: Optional[str] = None
    priority: str = "low"
    section: str = "morning"
    duration_minutes: int = 25

class TaskUpdate(BaseModel): 
    title: Optional[str] = None 
    status: Optional[str] = None 
    stars: Optional[int] = None 
    priority: Optional[str] = None 
    section: Optional[str] = None
    duration_minutes: Optional[int] = None

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.patch("/{task_id}")
def update_task(task_id: int, updates: TaskUpdate, db: Session = Depends(get_db)):
    """Update specific fields on an existing task. Unset fields are left unchanged."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    # exclude_unset=True means only fields the caller sent are applied
    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    """Permanently delete a task by id."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    db.delete(task)
    db.commit()
    return {"message": f"Task {task_id} deleted"}


