from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, date as date_type
from typing import Optional
import json

from database import get_db
from models import Task


class TaskCreate(BaseModel):
    title: str
    notes: Optional[str] = None
    due_date: Optional[datetime] = None
    reminder_time: Optional[datetime] = None
    priority: str = "low"
    status: str = "todo"
    section: str = "morning"
    duration_minutes: int = 25
    stars_average: Optional[float] = None
    recurrence: str = "once"
    recurrence_days: Optional[str] = None   # JSON string e.g. "[0,2,4]"
    start_date: Optional[str] = None
    end_date: Optional[str] = None


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    stars_average: Optional[float] = None
    priority: Optional[str] = None
    section: Optional[str] = None
    duration_minutes: Optional[int] = None
    due_date: Optional[datetime] = None
    recurrence: Optional[str] = None
    recurrence_days: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None


router = APIRouter(prefix="/tasks", tags=["tasks"])


# ── /today must be declared BEFORE /{task_id} so FastAPI doesn't coerce
#    the string "today" to an int and 422.
@router.get("/today")
def get_today_tasks(db: Session = Depends(get_db)):
    """Return tasks relevant to today based on recurrence rules.
    Recurring tasks whose last completion was not today are reset to 'todo'.
    """
    today   = date_type.today()
    weekday = today.weekday()       # 0=Mon … 6=Sun
    today_str = today.isoformat()

    all_tasks = db.query(Task).all()
    needs_commit = False
    result = []

    for task in all_tasks:
        r = task.recurrence or "once"
        include = False

        if r == "once":
            if task.due_date is None:
                include = True
            else:
                due = task.due_date.date() if hasattr(task.due_date, "date") else task.due_date
                include = (due == today)

        elif r == "daily":
            include = True

        elif r == "weekdays":
            include = (weekday < 5)   # Mon–Fri

        elif r == "weekly":
            if task.due_date:
                due = task.due_date.date() if hasattr(task.due_date, "date") else task.due_date
                include = (due.weekday() == weekday)

        elif r == "custom":
            if task.recurrence_days:
                try:
                    include = weekday in json.loads(task.recurrence_days)
                except (json.JSONDecodeError, TypeError):
                    pass

        if include:
            # Reset recurring tasks that were completed on a previous day
            if r != "once" and task.status == "done" and task.last_completed_date != today_str:
                task.status = "todo"
                needs_commit = True
            result.append(task)

    if needs_commit:
        db.commit()

    return result


@router.get("/")
def get_tasks(db: Session = Depends(get_db)):
    """Return all tasks."""
    return db.query(Task).all()


@router.get("/{task_id}")
def get_task(task_id: int, db: Session = Depends(get_db)):
    """Return a single task by id."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
    return task


@router.post("/")
def create_task(data: TaskCreate, db: Session = Depends(get_db)):
    """Create a new task."""
    task = Task(**data.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}")
def update_task(task_id: int, updates: TaskUpdate, db: Session = Depends(get_db)):
    """Update specific fields on an existing task. Unset fields are left unchanged."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"Task {task_id} not found")

    patch = updates.model_dump(exclude_unset=True)
    for field, value in patch.items():
        setattr(task, field, value)

    # Record today as the completion date so /today can reset correctly tomorrow
    if patch.get("status") == "done":
        task.last_completed_date = date_type.today().isoformat()

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
