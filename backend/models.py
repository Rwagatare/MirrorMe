from datetime import datetime
from sqlalchemy import Integer, String, Text, DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    reminder_time: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # high | med | low
    priority: Mapped[str] = mapped_column(String(10), default="med", nullable=False)
    # todo | done
    status: Mapped[str] = mapped_column(String(10), default="todo", nullable=False)
    # morning | focus | growth | evening
    section: Mapped[str | None] = mapped_column(String(20), nullable=True)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # 0–3 stars
    stars: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    # 0–100 percent complete
    progress: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    color: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # self-referential: sub-goals point to a parent goal
    parent_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("goals.id"), nullable=True)
    children: Mapped[list["Goal"]] = relationship("Goal", back_populates="parent")
    parent: Mapped["Goal | None"] = relationship("Goal", back_populates="children", remote_side=[id])


class Habit(Base):
    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    emoji: Mapped[str | None] = mapped_column(String(10), nullable=True)
    # JSON list of ISO date strings, e.g. ["2025-05-01", "2025-05-02"]
    completions: Mapped[str] = mapped_column(Text, default="[]", nullable=False)
    streak_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class Note(Base):
    __tablename__ = "notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Comma-separated tags stored as plain text for simplicity
    tags: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
