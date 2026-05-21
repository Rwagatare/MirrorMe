from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from config import DATABASE_URL

# Engine — connects SQLAlchemy to the local SQLite file
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # required for SQLite with FastAPI
)

# SessionLocal — factory that produces individual DB sessions per request
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """All ORM models inherit from this to share the same metadata registry."""
    pass


def get_db():
    """FastAPI dependency: yields a DB session and guarantees it closes after the request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
