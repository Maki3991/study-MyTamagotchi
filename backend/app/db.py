from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine

DB_PATH = Path(__file__).resolve().parent.parent / "tamagotchi.db"
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False, "timeout": 30},
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _migrate()


def _migrate() -> None:
    """SQLite 轻量迁移：给已有表补新列。"""
    from sqlalchemy import text

    new_cols = {
        "agent": [
            ("world", "TEXT DEFAULT 'everyday'"),
            ("sprite_url", "TEXT DEFAULT ''"),
            ("profile", "TEXT DEFAULT ''"),
            ("in_world", "BOOLEAN DEFAULT 0"),
        ],
    }
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))
        for table, cols in new_cols.items():
            existing = {r[1] for r in conn.execute(text(f"PRAGMA table_info({table})"))}
            for name, ddl in cols:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))
        conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
