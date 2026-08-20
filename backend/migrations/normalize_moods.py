"""One-time backfill: rewrite legacy string mood labels ("great", "good", ...)
stored in memory_logs.mood to their emoji form, so all rows use the same
format the live UI writes going forward (see routers/memory.py normalize_mood()).

Safe to re-run — rows already in emoji form are left untouched.

Usage (from backend/, with the venv active):
    python migrations/normalize_moods.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import SessionLocal
from models import MemoryLog
from routers.memory import MOOD_LABEL_TO_EMOJI


def main():
    db = SessionLocal()
    try:
        rows = db.query(MemoryLog).filter(MemoryLog.mood.in_(MOOD_LABEL_TO_EMOJI.keys())).all()
        if not rows:
            print("Nothing to normalize — no legacy string mood values found.")
            return

        for row in rows:
            old = row.mood
            row.mood = MOOD_LABEL_TO_EMOJI[old]
            print(f"  memory_logs.id={row.id}: {old!r} -> {row.mood!r}")

        db.commit()
        print(f"Normalized {len(rows)} row(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
