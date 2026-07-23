from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def now() -> datetime:
    return datetime.now(timezone.utc)


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    avatar: str = "🙂"


class Agent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    owner_id: int = Field(foreign_key="user.id")
    name: str
    category: str
    emoji: str = "📦"
    trait: str = ""
    mood: int = 80  # 0-100
    location: str = "home"  # home | plaza
    created_at: datetime = Field(default_factory=now)
    last_interact_at: datetime = Field(default_factory=now)


class Memory(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agent.id")
    kind: str = "chat"  # diary | chat | camera | plaza | world
    content: str
    created_at: datetime = Field(default_factory=now)


class Skill(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    agent_id: int = Field(foreign_key="agent.id")
    name: str
    description: str = ""
    code: str = ""
    source: str = "user"  # user | learned | default
    kind: str = "demo"  # demo(装饰) | prompt | module
    def_id: str = ""  # 指向 backend/skills/{def_id}/ 的可执行定义；空=无
    manifest: str = ""  # skill.json 内容快照（inputs/output/cta），前端渲染表单用
    created_at: datetime = Field(default_factory=now)


class Artifact(SQLModel, table=True):
    id: Optional[str] = Field(default=None, primary_key=True)
    mime: str
    path: str
    size: int = 0
    created_at: datetime = Field(default_factory=now)
