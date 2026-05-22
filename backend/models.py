from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


# ─────────────────────────────────────────────
# TASK
# A single unit of work that lives on the Path.
# Created in the Planner, appears as a node on
# the Path, timed with the timer, rated with stars.
# ─────────────────────────────────────────────
class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reminder_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    priority: Mapped[str] = mapped_column(String(10), default="low", nullable=False)      # high | med | low
    status: Mapped[str] = mapped_column(String(10), default="todo", nullable=False)       # todo | done
    section: Mapped[str | None] = mapped_column(String(20), nullable=True)                # morning | focus | growth | evening
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)          # pre-populates the timer
    stars_average: Mapped[float | None] = mapped_column(Float, nullable=True)  # avg task stars that day (0-5)
    recurrence: Mapped[str] = mapped_column(String(20), default="once", nullable=False)          # once | daily | weekdays | weekly | custom
    recurrence_days: Mapped[str | None] = mapped_column(Text, nullable=True)                     # JSON list of weekday ints [0-6] for custom
    start_date: Mapped[str | None] = mapped_column(String(20), nullable=True)                    # "2026-05-21"
    end_date: Mapped[str | None] = mapped_column(String(20), nullable=True)                      # "2026-08-01"
    last_completed_date: Mapped[str | None] = mapped_column(String(20), nullable=True)           # tracks same-day completion for reset logic
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# ─────────────────────────────────────────────
# GOAL
# A long-term objective shown as a branch on the
# Goals Tree. Progress (0-100) grows the branch.
# Goals can have sub-goals via parent_id.
# ─────────────────────────────────────────────
class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)           # 0-100 percent
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)                  # branch color on the tree
    parent_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("goals.id"), nullable=True)  # for sub-goals
    children: Mapped[list["Goal"]] = relationship("Goal", back_populates="parent")
    parent: Mapped["Goal | None"] = relationship("Goal", back_populates="children", remote_side=[id])
    tasks: Mapped[list["GoalTask"]] = relationship("GoalTask", back_populates="goal", cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# GOAL TASK
# A sub-task / checklist item belonging to a Goal.
# Progress on the Goal is computed from these.
# ─────────────────────────────────────────────
class GoalTask(Base):
    __tablename__ = "goal_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    goal_id: Mapped[int] = mapped_column(Integer, ForeignKey("goals.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    is_done: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    goal: Mapped["Goal"] = relationship("Goal", back_populates="tasks")


# ─────────────────────────────────────────────
# HABIT
# A recurring daily action tracked on the Habits
# view. Completions are stored as a JSON list of
# dates. Streak counts how many consecutive days.
# ─────────────────────────────────────────────
class Habit(Base):
    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    emoji: Mapped[str | None] = mapped_column(String(10), nullable=True)
    completions: Mapped[str] = mapped_column(Text, default="[]", nullable=False)          # JSON list of ISO date strings
    streak_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


# ─────────────────────────────────────────────
# NOTE
# A freeform text note. Indexed into ChromaDB
# so the AI can retrieve it during conversations.
# ─────────────────────────────────────────────
class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)                         # comma-separated tags
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


# ─────────────────────────────────────────────
# MEMORY LOG
# The personal memory and journal system.
# Captures both quick context logs ("I was writing
# an email, brb") and end-of-day journal entries
# ("my day was incredible..."). All entries are
# embedded into ChromaDB so the AI can answer
# "what was I doing?" or "what was June 3rd like?"
# entry_type distinguishes between journal, context, and note.
# ─────────────────────────────────────────────
class MemoryLog(Base):
    __tablename__ = "memory_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    entry_type: Mapped[str | None] = mapped_column(String(20), nullable=True)             # journal | context | note
    mood: Mapped[str | None] = mapped_column(String(20), nullable=True)                   # great | good | okay | hard | terrible
    energy: Mapped[str | None] = mapped_column(String(20), nullable=True)                 # high | medium | low
    activity: Mapped[str | None] = mapped_column(String(255), nullable=True)              # e.g. "writing email to Yusuf"
    resume_at: Mapped[str | None] = mapped_column(Text, nullable=True)                    # what to return to
    date: Mapped[str] = mapped_column(String(20), nullable=False)                         # "2026-05-21"
    time_of_day: Mapped[str | None] = mapped_column(String(20), nullable=True)            # morning | afternoon | evening | night
    tasks_completed: Mapped[int] = mapped_column(Integer, default=0, nullable=False)      # pulled from that day's tasks
    stars_average: Mapped[float | None] = mapped_column(Float, nullable=True)             # avg task stars that day
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    chroma_id: Mapped[str | None] = mapped_column(String(255), nullable=True)             # ChromaDB vector reference