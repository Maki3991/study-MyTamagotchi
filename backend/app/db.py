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
            ("profile", "TEXT DEFAULT ''"),
            ("image", "TEXT DEFAULT ''"),
        ],
        "agenttemplate": [
            ("image", "TEXT DEFAULT ''"),
        ],
    }
    dropped_cols = {
        # emoji → image；world+in_world+sprite_url 合并进 location/image（见下方数据迁移）
        "agent": ["emoji", "world", "in_world", "sprite_url", "category"],
        "agenttemplate": ["emoji", "category"],
    }
    with engine.connect() as conn:
        conn.execute(text("PRAGMA journal_mode=WAL"))
        for table, cols in new_cols.items():
            existing = {r[1] for r in conn.execute(text(f"PRAGMA table_info({table})"))}
            if not existing:
                continue
            for name, ddl in cols:
                if name not in existing:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {name} {ddl}"))

        # 数据迁移：world+location → 单一 location（四个固定值）；sprite_url → image
        agent_cols = {r[1] for r in conn.execute(text("PRAGMA table_info(agent)"))}
        if "world" in agent_cols:
            conn.execute(text(
                "UPDATE agent SET location = CASE"
                " WHEN location = 'plaza' THEN 'plaza'"
                " WHEN world = 'stardom' THEN 'learning-commons'"
                " WHEN world = 'future' THEN 'maker-harbor'"
                " ELSE 'vitality-gym-town' END"
            ))
        else:
            conn.execute(text(
                "UPDATE agent SET location = 'vitality-gym-town'"
                " WHERE location NOT IN ('vitality-gym-town','learning-commons','maker-harbor','plaza')"
            ))
        if "sprite_url" in agent_cols:
            conn.execute(text(
                "UPDATE agent SET image = sprite_url WHERE (image IS NULL OR image = '') AND sprite_url <> ''"
            ))

        for table, cols in dropped_cols.items():
            existing = {r[1] for r in conn.execute(text(f"PRAGMA table_info({table})"))}
            for name in cols:
                if name in existing:
                    try:
                        conn.execute(text(f"ALTER TABLE {table} DROP COLUMN {name}"))
                    except Exception:
                        pass  # 老版本 SQLite 不支持 DROP COLUMN，残留列不影响使用
        conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
