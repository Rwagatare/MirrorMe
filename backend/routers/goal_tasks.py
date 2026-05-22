from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models import Goal, GoalTask

router = APIRouter(tags=["goal_tasks"])


class GoalTaskCreate(BaseModel):
    title: str


@router.get("/goals/{goal_id}/tasks/")
def list_goal_tasks(goal_id: int, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail=f"Goal {goal_id} not found")
    return goal.tasks


@router.post("/goals/{goal_id}/tasks/")
def create_goal_task(goal_id: int, data: GoalTaskCreate, db: Session = Depends(get_db)):
    goal = db.query(Goal).filter(Goal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail=f"Goal {goal_id} not found")
    task = GoalTask(goal_id=goal_id, title=data.title.strip())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.patch("/goals/{goal_id}/tasks/{task_id}")
def toggle_goal_task(goal_id: int, task_id: int, db: Session = Depends(get_db)):
    task = db.query(GoalTask).filter(
        GoalTask.id == task_id, GoalTask.goal_id == goal_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"GoalTask {task_id} not found")
    task.is_done = not task.is_done
    db.commit()
    db.refresh(task)
    return task


@router.delete("/goals/{goal_id}/tasks/{task_id}")
def delete_goal_task(goal_id: int, task_id: int, db: Session = Depends(get_db)):
    task = db.query(GoalTask).filter(
        GoalTask.id == task_id, GoalTask.goal_id == goal_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail=f"GoalTask {task_id} not found")
    db.delete(task)
    db.commit()
    return {"message": f"GoalTask {task_id} deleted"}
