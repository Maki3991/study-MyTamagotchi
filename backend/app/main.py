import random
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from . import llm, skills_runtime
from . import world_routes
from .db import get_session, init_db
from .models import Agent, Artifact, Memory, Skill, User, now
from .seed import seed, sync_default_skills

app = FastAPI(title="My Tamagotchi API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# 「世界互访」接口（大屏/硬件端消费）：/api/worlds /api/profile /api/bump /api/visit /api/ws
app.include_router(world_routes.router)


@app.on_event("startup")
def on_startup():
    init_db()
    seed()
    sync_default_skills()


CATEGORY_EMOJI = {
    "狗": "🐶", "猫": "🐱", "书本": "📚", "水瓶": "🫙", "哑铃": "🏋️",
    "相机": "📷", "钢笔": "🖊️", "植物": "🪴", "耳机": "🎧", "杯子": "☕",
    "键盘": "⌨️", "鞋子": "👟", "枕头": "🛏️", "吉他": "🎸",
}


def effective_mood(agent: Agent) -> int:
    last = agent.last_interact_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    hours = (datetime.now(timezone.utc) - last).total_seconds() / 3600
    return max(20, min(100, agent.mood - int(hours * 2)))


def agent_out(agent: Agent, session: Session) -> dict:
    owner = session.get(User, agent.owner_id)
    return {
        "id": agent.id,
        "owner_id": agent.owner_id,
        "owner_name": owner.username if owner else "?",
        "name": agent.name,
        "category": agent.category,
        "emoji": agent.emoji,
        "trait": agent.trait,
        "mood": effective_mood(agent),
        "location": agent.location,
    }


def persona_prompt(agent: Agent, memories: list[Memory], skills: list[Skill]) -> str:
    mem_text = "\n".join(f"- {m.content}" for m in memories[-8:]) or "（还没有记忆）"
    skill_text = "、".join(s.name for s in skills) or "（暂无）"
    return (
        f"你是一个像素风电子宠物世界里的物品 agent。\n"
        f"名字：{agent.name}；类型：{agent.category}；性格：{agent.trait}。\n"
        f"你拥有的技能：{skill_text}。\n"
        f"你的记忆：\n{mem_text}\n"
        f"始终用简体中文、以第一人称、符合性格地说话，回复要口语化且不超过60字，"
        f"可以带一点符合物品身份的小动作描写（用括号）。"
    )


def touch(agent: Agent, delta: int = 8):
    agent.mood = min(100, effective_mood(agent) + delta)
    agent.last_interact_at = now()


# ---------- users ----------

@app.get("/api/users")
def list_users(session: Session = Depends(get_session)):
    return [u.model_dump() for u in session.exec(select(User)).all()]


# ---------- agents ----------

@app.get("/api/agents")
def list_agents(owner_id: int, session: Session = Depends(get_session)):
    agents = session.exec(select(Agent).where(Agent.owner_id == owner_id)).all()
    return [agent_out(a, session) for a in agents]


@app.get("/api/agents/{agent_id}")
def get_agent(agent_id: int, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")
    memories = session.exec(select(Memory).where(Memory.agent_id == agent_id).order_by(Memory.created_at.desc())).all()
    skills = session.exec(select(Skill).where(Skill.agent_id == agent_id)).all()
    out = agent_out(agent, session)
    out["memories"] = [m.model_dump() for m in memories]
    out["skills"] = [s.model_dump() for s in skills]
    return out


class ScanIn(BaseModel):
    owner_id: int
    category: str
    name: str | None = None


@app.post("/api/agents/scan")
async def scan_agent(body: ScanIn, session: Session = Depends(get_session)):
    """相机扫描的 placeholder：直接根据类型生成一个新 agent。"""
    emoji = CATEGORY_EMOJI.get(body.category, "📦")
    gen = await llm.chat_json([
        {"role": "system", "content": "你负责为像素风电子宠物世界的新物品生成人设。只输出 JSON。"},
        {"role": "user", "content": (
            f"物品类型：{body.category}。生成 JSON：{{\"name\": \"两个字的可爱中文名字\", "
            f"\"trait\": \"20字以内的性格描述\", \"greeting\": \"30字以内的初次见面台词\"}}"
        )},
    ])
    if not isinstance(gen, dict):
        gen = {"name": body.category + "仔", "trait": "刚被扫描进来的新伙伴，还在熟悉环境", "greeting": "你好呀，我是新来的！"}
    agent = Agent(
        owner_id=body.owner_id,
        name=body.name or gen.get("name", body.category + "仔"),
        category=body.category,
        emoji=emoji,
        trait=gen.get("trait", ""),
        mood=90,
    )
    session.add(agent)
    session.commit()
    session.refresh(agent)
    session.add(Memory(agent_id=agent.id, kind="chat", content=f"我被主人扫描进了这个世界，成为了一只{body.category}。"))
    session.commit()
    out = agent_out(agent, session)
    out["greeting"] = gen.get("greeting", "你好呀！")
    return out


class ChatIn(BaseModel):
    text: str


@app.post("/api/agents/{agent_id}/chat")
async def chat_with_agent(agent_id: int, body: ChatIn, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")
    memories = session.exec(select(Memory).where(Memory.agent_id == agent_id).order_by(Memory.created_at)).all()
    skills = session.exec(select(Skill).where(Skill.agent_id == agent_id)).all()
    reply = await llm.chat([
        {"role": "system", "content": persona_prompt(agent, memories, skills)},
        {"role": "user", "content": body.text},
    ])
    session.add(Memory(agent_id=agent.id, kind="chat", content=f"主人对我说：{body.text}"))
    touch(agent)
    session.add(agent)
    session.commit()
    return {"reply": reply, "mood": effective_mood(agent)}


class DispatchIn(BaseModel):
    location: str  # home | plaza


@app.post("/api/agents/{agent_id}/dispatch")
def dispatch_agent(agent_id: int, body: DispatchIn, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")
    if body.location not in ("home", "plaza"):
        raise HTTPException(400, "location must be home or plaza")
    agent.location = body.location
    session.add(agent)
    session.commit()
    return agent_out(agent, session)


# ---------- artifacts (多模态文件) ----------

MAX_UPLOAD = 10 * 1024 * 1024


@app.post("/api/artifacts")
async def upload_artifact(file: UploadFile, session: Session = Depends(get_session)):
    data = await file.read()
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "文件太大（上限 10MB）")
    aid = uuid.uuid4().hex[:12]
    ext = Path(file.filename or "bin").suffix or ".bin"
    path = skills_runtime.UPLOADS_DIR / f"{aid}{ext}"
    path.parent.mkdir(exist_ok=True)
    path.write_bytes(data)
    art = Artifact(id=aid, mime=file.content_type or "application/octet-stream",
                   path=str(path), size=len(data))
    session.add(art)
    session.commit()
    return {"id": aid, "url": f"/api/artifacts/{aid}", "mime": art.mime, "size": art.size}


@app.get("/api/artifacts/{artifact_id}")
def get_artifact(artifact_id: str, session: Session = Depends(get_session)):
    art = session.get(Artifact, artifact_id)
    if not art or not Path(art.path).exists():
        raise HTTPException(404, "artifact not found")
    return FileResponse(art.path, media_type=art.mime)


# ---------- skill invoke ----------

class InvokeIn(BaseModel):
    inputs: dict


@app.post("/api/agents/{agent_id}/skills/{skill_id}/invoke")
async def invoke_skill(agent_id: int, skill_id: int, body: InvokeIn,
                       session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    skill = session.get(Skill, skill_id)
    if not agent or not skill or skill.agent_id != agent_id:
        raise HTTPException(404, "skill not found")
    if not skill.def_id:
        raise HTTPException(400, "这个技能还没有可执行实现")

    artifacts = {}
    for v in body.inputs.values():
        if isinstance(v, str):
            art = session.get(Artifact, v)
            if art:
                artifacts[v] = {"path": art.path, "mime": art.mime}

    def save_artifact(data: bytes, mime: str) -> str:
        aid = uuid.uuid4().hex[:12]
        ext = {"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}.get(mime, ".bin")
        path = skills_runtime.UPLOADS_DIR / f"{aid}{ext}"
        path.parent.mkdir(exist_ok=True)
        path.write_bytes(data)
        session.add(Artifact(id=aid, mime=mime, path=str(path), size=len(data)))
        session.commit()
        return f"/api/artifacts/{aid}"

    output = await skills_runtime.invoke(skill.def_id, dict(body.inputs), artifacts, save_artifact)

    brief = "、".join(f"{k}={str(v)[:20]}" for k, v in body.inputs.items() if v and k not in artifacts)
    session.add(Memory(agent_id=agent.id, kind="skill",
                       content=f"我使用技能「{skill.name}」完成了一次任务（{brief}）。"))
    touch(agent)
    session.add(agent)
    session.commit()
    return {"output": output, "mood": effective_mood(agent)}


@app.post("/api/agents/{agent_id}/camera")
def camera_placeholder(agent_id: int):
    """镜头/视频汇入功能占位。"""
    return {
        "status": "not_implemented",
        "message": "相机/视频功能开发中：未来会把镜头画面交给 agent 解析并优化 skill。",
    }


# ---------- diary ----------

class DiaryIn(BaseModel):
    user_id: int
    text: str


@app.post("/api/diary")
async def write_diary(body: DiaryIn, session: Session = Depends(get_session)):
    agents = session.exec(select(Agent).where(Agent.owner_id == body.user_id)).all()
    if not agents:
        raise HTTPException(400, "no agents")
    roster = "\n".join(f"{a.id}: {a.name}（{a.category}）— {a.trait}" for a in agents)
    routed = await llm.chat_json([
        {"role": "system", "content": "你是路由器，负责把主人的日记分配给最相关的物品 agent。只输出 JSON。"},
        {"role": "user", "content": (
            f"主人的日记：「{body.text}」\n候选 agent：\n{roster}\n"
            f"输出 JSON：{{\"agent_id\": 最合适的id(数字)}}"
        )},
    ])
    agent = None
    if isinstance(routed, dict):
        agent = next((a for a in agents if a.id == routed.get("agent_id")), None)
    if agent is None:
        agent = random.choice(agents)

    memories = session.exec(select(Memory).where(Memory.agent_id == agent.id).order_by(Memory.created_at)).all()
    skills = session.exec(select(Skill).where(Skill.agent_id == agent.id)).all()
    reply = await llm.chat([
        {"role": "system", "content": persona_prompt(agent, memories, skills)},
        {"role": "user", "content": f"主人写了一篇日记给你听：「{body.text}」。请回应主人。"},
    ])
    session.add(Memory(agent_id=agent.id, kind="diary", content=f"主人的日记：{body.text}"))
    touch(agent)
    session.add(agent)
    session.commit()
    return {"agent": agent_out(agent, session), "reply": reply}


# ---------- personal world ----------

class WorldIn(BaseModel):
    user_id: int


@app.post("/api/world/converse")
async def world_converse(body: WorldIn, session: Session = Depends(get_session)):
    agents = session.exec(
        select(Agent).where(Agent.owner_id == body.user_id, Agent.location == "home")
    ).all()
    if len(agents) < 2:
        raise HTTPException(400, "需要至少两个在家的 agent")
    a, b = random.sample(agents, 2)

    def brief(x: Agent) -> str:
        mems = session.exec(select(Memory).where(Memory.agent_id == x.id).order_by(Memory.created_at.desc())).all()[:5]
        mem = "；".join(m.content for m in mems) or "无"
        return f"{x.name}（{x.category}，性格：{x.trait}，记忆：{mem}）"

    dialog = await llm.chat_json([
        {"role": "system", "content": "你为像素宠物世界生成两个物品 agent 的闲聊。只输出 JSON 数组。"},
        {"role": "user", "content": (
            f"两个 agent 聊聊他们眼中的主人是什么样的人（基于各自记忆，可以互相补充或吐槽）。\n"
            f"A：{brief(a)}\nB：{brief(b)}\n"
            f"输出 4~6 条 JSON 数组：[{{\"speaker\": \"A或B\", \"text\": \"不超过40字的台词\"}}]"
        )},
    ])
    lines = []
    if isinstance(dialog, list):
        for item in dialog:
            if isinstance(item, dict) and item.get("speaker") in ("A", "B"):
                who = a if item["speaker"] == "A" else b
                lines.append({"agent_id": who.id, "name": who.name, "emoji": who.emoji, "text": str(item.get("text", ""))[:60]})
    if not lines:
        lines = [
            {"agent_id": a.id, "name": a.name, "emoji": a.emoji, "text": "主人最近好像有点忙呢。"},
            {"agent_id": b.id, "name": b.name, "emoji": b.emoji, "text": "是啊，希望她记得照顾好自己。"},
        ]
    summary = "、".join({l["text"] for l in lines[:2]})
    for x in (a, b):
        session.add(Memory(agent_id=x.id, kind="world", content=f"我和{(b if x is a else a).name}聊了聊主人：{summary}"))
    session.commit()
    return {"lines": lines}


# ---------- plaza ----------

@app.get("/api/plaza")
def plaza_agents(session: Session = Depends(get_session)):
    agents = session.exec(select(Agent).where(Agent.location == "plaza")).all()
    return [agent_out(a, session) for a in agents]


@app.post("/api/plaza/converse")
async def plaza_converse(session: Session = Depends(get_session)):
    agents = session.exec(select(Agent).where(Agent.location == "plaza")).all()
    if len(agents) < 2:
        raise HTTPException(400, "广场上的 agent 不足两个")
    a, b = random.sample(agents, 2)
    a_skills = session.exec(select(Skill).where(Skill.agent_id == a.id)).all()
    b_skills = session.exec(select(Skill).where(Skill.agent_id == b.id)).all()

    def brief(x: Agent, skills: list[Skill]) -> str:
        owner = session.get(User, x.owner_id)
        sk = "、".join(s.name for s in skills) or "无"
        return f"{x.name}（{x.category}，主人是{owner.username}，性格：{x.trait}，技能：{sk}）"

    dialog = await llm.chat_json([
        {"role": "system", "content": "你为像素宠物世界的公共广场生成两个物品 agent 的对话。只输出 JSON 数组。"},
        {"role": "user", "content": (
            f"两个来自不同主人的 agent 在广场相遇闲聊，可以聊各自主人、也可以炫耀/交流技能。\n"
            f"A：{brief(a, a_skills)}\nB：{brief(b, b_skills)}\n"
            f"输出 4~6 条 JSON 数组：[{{\"speaker\": \"A或B\", \"text\": \"不超过40字的台词\"}}]"
        )},
    ])
    lines = []
    if isinstance(dialog, list):
        for item in dialog:
            if isinstance(item, dict) and item.get("speaker") in ("A", "B"):
                who = a if item["speaker"] == "A" else b
                lines.append({"agent_id": who.id, "name": who.name, "emoji": who.emoji, "text": str(item.get("text", ""))[:60]})
    if not lines:
        lines = [
            {"agent_id": a.id, "name": a.name, "emoji": a.emoji, "text": "嘿，你也来广场逛逛？"},
            {"agent_id": b.id, "name": b.name, "emoji": b.emoji, "text": "对呀，出来透透气！"},
        ]

    # 技能交流：一方有对方没有的技能时，50% 概率学会
    learned = None
    b_names = {s.name for s in b_skills}
    a_names = {s.name for s in a_skills}
    candidates = [(a, b, s) for s in a_skills if s.name not in b_names] + \
                 [(b, a, s) for s in b_skills if s.name not in a_names]
    if candidates and random.random() < 0.5:
        teacher, learner, skill = random.choice(candidates)
        session.add(Skill(agent_id=learner.id, name=skill.name, description=skill.description,
                          code=skill.code, source="learned", kind=skill.kind,
                          def_id=skill.def_id, manifest=skill.manifest))
        session.add(Memory(agent_id=learner.id, kind="plaza",
                           content=f"在广场上向{teacher.name}学会了技能「{skill.name}」！"))
        learned = {"learner": learner.name, "learner_id": learner.id,
                   "teacher": teacher.name, "skill": skill.name}
        lines.append({"agent_id": learner.id, "name": learner.name, "emoji": learner.emoji,
                      "text": f"太棒了，我学会了「{skill.name}」！"})
    for x in (a, b):
        session.add(Memory(agent_id=x.id, kind="plaza",
                           content=f"在广场上和{(b if x is a else a).name}聊了会天。"))
    session.commit()
    return {"lines": lines, "learned": learned}
