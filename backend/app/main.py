import asyncio
import json
import random
import urllib.parse
import uuid
from datetime import datetime, timezone
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlmodel import Session, select

from . import llm, pets, skills_runtime, world
from .db import engine, get_session, init_db
from .models import AGENT_LOCATIONS, Agent, AgentTemplate, Artifact, Memory, Skill, User, now
from .seed import seed, seed_templates, sync_default_skills

app = FastAPI(title="My Tamagotchi API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ME_USER_ID = 1  # ForkWorld UI 为单用户 demo，其余种子用户提供广场 NPC


async def _auto_tick_loop():
    while True:
        await asyncio.sleep(50)
        try:
            with Session(engine) as session:
                meta = world.get_meta(session)
                if meta.status == "running":
                    await world.run_tick(session, 1)
        except Exception:
            pass


async def _backfill_line_art_images():
    """一次性回填：给还没有 image 的 agent / 模板生成线条风形象。

    用 capture 管线按名字/类别文字生成简约线条风。逐个处理，失败跳过（下次启动会重试）。
    """
    await asyncio.sleep(3)
    with Session(engine) as session:
        agent_ids = [a.id for a in session.exec(select(Agent).where(Agent.image == "")).all()]
        template_ids = [t.id for t in session.exec(
            select(AgentTemplate).where(AgentTemplate.image == "")).all()]
    for agent_id in agent_ids:
        try:
            with Session(engine) as session:
                agent = session.get(Agent, agent_id)
                if not agent or agent.image:
                    continue
                subject = f"一个叫「{agent.name}」的可爱小伙伴（{agent.trait[:12]}）"
            url = await pets.generate_line_art(subject)
            if url:
                with Session(engine) as session:
                    agent = session.get(Agent, agent_id)
                    if agent and not agent.image:
                        agent.image = url
                        session.add(agent)
                        session.commit()
        except Exception:
            pass
    for template_id in template_ids:
        try:
            with Session(engine) as session:
                tpl = session.get(AgentTemplate, template_id)
                if not tpl or tpl.image:
                    continue
                subject = f"一个叫「{tpl.name}」的可爱小伙伴（{tpl.description[:12]}）"
            url = await pets.generate_line_art(subject)
            if url:
                with Session(engine) as session:
                    tpl = session.get(AgentTemplate, template_id)
                    if tpl and not tpl.image:
                        tpl.image = url
                        session.add(tpl)
                        session.commit()
        except Exception:
            pass


@app.on_event("startup")
def on_startup():
    init_db()
    seed()
    seed_templates()
    sync_default_skills()
    pets.load_jobs_from_disk()
    asyncio.get_event_loop().create_task(_auto_tick_loop())
    asyncio.get_event_loop().create_task(_backfill_line_art_images())


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
        "image": agent.image,
        "trait": agent.trait,
        "mood": effective_mood(agent),
        "location": agent.location,
        "profile": agent.profile,
    }


def _profile_dict(agent: Agent) -> dict:
    try:
        return json.loads(agent.profile) if agent.profile else {}
    except Exception:
        return {}


def persona_prompt(agent: Agent, memories: list[Memory], skills: list[Skill]) -> str:
    mem_text = "\n".join(f"- {m.content}" for m in memories[-8:]) or "（还没有记忆）"
    skill_text = "、".join(s.name for s in skills) or "（暂无）"
    digest = _profile_dict(agent).get("memory_digest", "")
    digest_text = f"你对主人和世界的长期印象：{digest}\n" if digest else ""
    return (
        f"你是一个像素风电子宠物世界里的物品 agent。\n"
        f"名字：{agent.name}；性格：{agent.trait}。\n"
        f"你拥有的技能：{skill_text}。\n"
        f"{digest_text}"
        f"你的记忆：\n{mem_text}\n"
        f"始终用简体中文、以第一人称、符合性格地说话，回复要口语化且不超过60字，"
        f"可以带一点符合物品身份的小动作描写（用括号）。"
    )


def touch(agent: Agent, delta: int = 8):
    agent.mood = min(100, effective_mood(agent) + delta)
    agent.last_interact_at = now()


async def _refresh_profile_digest(agent_id: int, interaction: str) -> None:
    """profile 作为 agent 记忆的一部分：每次与主人/其他 agent 互动后，
    用 LLM 把这次互动融进 profile.memory_digest（滚动的长期印象摘要）。"""
    try:
        with Session(engine) as session:
            agent = session.get(Agent, agent_id)
            if not agent:
                return
            old = _profile_dict(agent).get("memory_digest", "")
        updated = await llm.chat_json([
            {"role": "system", "content": "你负责维护一个宠物 agent 对主人和世界的长期印象摘要。只输出 JSON。"},
            {"role": "user", "content": (
                f"旧的印象摘要：「{old or '（空）'}」\n"
                f"新的互动：「{interaction}」\n"
                f'把新互动融进摘要，输出 JSON：{{"memory_digest": "80字以内的第一人称长期印象"}}'
            )},
        ])
        digest = updated.get("memory_digest") if isinstance(updated, dict) else None
        if not digest:
            return
        with Session(engine) as session:
            agent = session.get(Agent, agent_id)
            if not agent:
                return
            profile = _profile_dict(agent)
            profile["memory_digest"] = str(digest)[:160]
            agent.profile = json.dumps(profile, ensure_ascii=False)
            session.add(agent)
            session.commit()
    except Exception:
        pass


# ---------- users ----------

@app.get("/api/users")
def list_users(session: Session = Depends(get_session)):
    return [u.model_dump() for u in session.exec(select(User)).all()]


# ---------- agents ----------

@app.get("/api/agents")
def list_agents(owner_id: int | None = None, session: Session = Depends(get_session)):
    q = select(Agent)
    if owner_id is not None:
        q = q.where(Agent.owner_id == owner_id)
    agents = session.exec(q).all()
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
    session.add(Memory(agent_id=agent.id, kind="chat", content=f"我回复主人：{reply}"))
    touch(agent)
    session.add(agent)
    session.commit()
    asyncio.get_event_loop().create_task(
        _refresh_profile_digest(agent.id, f"主人说「{body.text}」，我回复「{reply}」"))
    return {"reply": reply, "mood": effective_mood(agent)}


class DispatchIn(BaseModel):
    location: str  # AGENT_LOCATIONS 之一，或 "home"（召回去广场前所在的世界）


@app.post("/api/agents/{agent_id}/dispatch")
def dispatch_agent(agent_id: int, body: DispatchIn, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")
    profile = _profile_dict(agent)
    target = body.location
    if target == "home":
        target = profile.get("home_world") or "vitality-gym-town"
        if target == "plaza":
            target = "vitality-gym-town"
    if target not in AGENT_LOCATIONS:
        raise HTTPException(400, f"location 必须是 {'/'.join(AGENT_LOCATIONS)} 之一或 home")
    if target == "plaza" and agent.location != "plaza":
        profile["home_world"] = agent.location  # 记住来自哪个世界，召回时用
        agent.profile = json.dumps(profile, ensure_ascii=False)
    agent.location = target
    session.add(agent)
    session.commit()
    return agent_out(agent, session)


# ---------- templates（图鉴：无主人、无记忆的现成模板） ----------

@app.get("/api/templates")
def list_templates(session: Session = Depends(get_session)):
    return [t.model_dump() for t in session.exec(select(AgentTemplate)).all()]


class AdoptIn(BaseModel):
    owner_id: int = ME_USER_ID
    name: str | None = None


@app.post("/api/templates/{template_id}/adopt")
async def adopt_template(template_id: int, body: AdoptIn, session: Session = Depends(get_session)):
    """从图鉴复制一只：此时才在 DB 建 agent 档案（无记忆，待 identity 编辑后加入世界）。"""
    tpl = session.get(AgentTemplate, template_id)
    if not tpl:
        raise HTTPException(404, "template not found")
    if not tpl.image:
        # 模板还没有线条风形象：现场用 capture 管线生成一张并缓存回模板
        tpl.image = await pets.generate_line_art(f"一个叫「{tpl.name}」的可爱小伙伴（{tpl.description[:12]}）") or ""
        if tpl.image:
            session.add(tpl)
            session.commit()
    agent = Agent(
        owner_id=body.owner_id,
        name=body.name or tpl.name,
        image=tpl.image,
        trait=tpl.trait,
        mood=90,
        location="vitality-gym-town",
    )
    session.add(agent)
    session.commit()
    session.refresh(agent)
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
        # 生成图不存储（不落盘、不建 Artifact），直接内嵌 data URL 返回给前端展示
        import base64 as _b64
        return f"data:{mime};base64,{_b64.b64encode(data).decode()}"

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
    location: str | None = None  # 指定世界：优先让该世界里的 agent 记录并回应


@app.post("/api/diary")
async def write_diary(body: DiaryIn, session: Session = Depends(get_session)):
    agents = session.exec(select(Agent).where(Agent.owner_id == body.user_id)).all()
    if body.location:
        located = [a for a in agents if a.location == body.location]
        agents = located or agents
    if not agents:
        raise HTTPException(400, "no agents")
    roster = "\n".join(f"{a.id}: {a.name} — {a.trait}" for a in agents)
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
    session.add(Memory(agent_id=agent.id, kind="diary", content=f"我回应主人的日记：{reply}"))
    touch(agent)
    session.add(agent)
    session.commit()
    asyncio.get_event_loop().create_task(
        _refresh_profile_digest(agent.id, f"主人写日记「{body.text}」，我回应「{reply}」"))
    return {"agent": agent_out(agent, session), "reply": reply}


# ---------- personal world ----------

class WorldIn(BaseModel):
    user_id: int
    location: str | None = None  # 指定某个世界；缺省 = 所有非广场世界


@app.post("/api/world/converse")
async def world_converse(body: WorldIn, session: Session = Depends(get_session)):
    q = select(Agent).where(Agent.owner_id == body.user_id, Agent.location != "plaza")
    if body.location:
        q = select(Agent).where(Agent.owner_id == body.user_id, Agent.location == body.location)
    agents = session.exec(q).all()
    if len(agents) < 2:
        raise HTTPException(400, "需要至少两个在家的 agent")
    a, b = random.sample(agents, 2)

    def brief(x: Agent) -> str:
        mems = session.exec(select(Memory).where(Memory.agent_id == x.id).order_by(Memory.created_at.desc())).all()[:5]
        mem = "；".join(m.content for m in mems) or "无"
        return f"{x.name}（性格：{x.trait}，记忆：{mem}）"

    gen = await llm.chat_json([
        {"role": "system", "content": "你为像素宠物世界生成两个物品 agent 的闲聊。只输出 JSON 对象。"},
        {"role": "user", "content": (
            f"两个 agent 聊聊他们眼中的主人是什么样的人（基于各自记忆，可以互相补充或吐槽）。\n"
            f"A：{brief(a)}\nB：{brief(b)}\n"
            f"输出 JSON 对象：{{\"lines\": [{{\"speaker\": \"A或B\", \"text\": \"不超过40字的台词\"}}]（4~6条）, "
            f"\"insights\": [{{\"speaker\": \"A或B\", \"text\": \"这次聊天让TA对主人产生的新认识，25字内\"}}]}}。\n"
            f"insights 只在对话确实让某一方认识到主人新的一面时才写，没有就给空数组。"
        )},
    ])
    lines = []
    insights_out = []
    if isinstance(gen, dict):
        for item in gen.get("lines", []) if isinstance(gen.get("lines"), list) else []:
            if isinstance(item, dict) and item.get("speaker") in ("A", "B"):
                who = a if item["speaker"] == "A" else b
                lines.append({"agent_id": who.id, "name": who.name, "image": who.image, "text": str(item.get("text", ""))[:60]})
        for item in gen.get("insights", []) if isinstance(gen.get("insights"), list) else []:
            if isinstance(item, dict) and item.get("speaker") in ("A", "B") and item.get("text"):
                who = a if item["speaker"] == "A" else b
                insights_out.append({"agent_id": who.id, "name": who.name, "text": str(item["text"])[:60]})
    if not lines:
        lines = [
            {"agent_id": a.id, "name": a.name, "image": a.image, "text": "主人最近好像有点忙呢。"},
            {"agent_id": b.id, "name": b.name, "image": b.image, "text": "是啊，希望她记得照顾好自己。"},
        ]
    # 只有真的“认识到主人新的一面”才写入记忆
    for insight in insights_out:
        session.add(Memory(agent_id=insight["agent_id"], kind="world",
                           content=f"聊天时对主人有了新认识：{insight['text']}"))
    session.commit()
    for insight in insights_out:
        asyncio.get_event_loop().create_task(
            _refresh_profile_digest(insight["agent_id"], f"聊天中对主人的新认识：{insight['text']}"))
    return {"lines": lines, "insights": insights_out}


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
        return f"{x.name}（主人是{owner.username}，性格：{x.trait}，技能：{sk}）"

    # 可学习的候选：对方拥有、自己还没有的技能
    b_names = {s.name for s in b_skills}
    a_names = {s.name for s in a_skills}
    a_can_learn = [s for s in b_skills if s.name not in a_names]
    b_can_learn = [s for s in a_skills if s.name not in b_names]

    gen = await llm.chat_json([
        {"role": "system", "content": "你为像素宠物世界的公共广场生成两个物品 agent 的对话。只输出 JSON 对象。"},
        {"role": "user", "content": (
            f"两个来自不同主人的 agent 在广场相遇，聊各自对主人的理解（基于性格），也可以聊技能。\n"
            f"A：{brief(a, a_skills)}\nB：{brief(b, b_skills)}\n"
            f"A 可以向 B 学的技能：{'、'.join(s.name for s in a_can_learn) or '无'}\n"
            f"B 可以向 A 学的技能：{'、'.join(s.name for s in b_can_learn) or '无'}\n"
            f"输出 JSON 对象：{{\"lines\": [{{\"speaker\": \"A或B\", \"text\": \"不超过40字的台词\"}}]（4~6条）, "
            f"\"learn\": {{\"learner\": \"A或B或null\", \"skill\": \"技能名\", \"reason\": \"20字内理由\"}}}}。\n"
            f"learn 由两人性格与聊天内容自然决定：只有当聊天里确实激起了学习兴趣、且技能在可学列表中时才学，"
            f"否则 learner 给 null。"
        )},
    ])
    lines = []
    learn_req = None
    if isinstance(gen, dict):
        for item in gen.get("lines", []) if isinstance(gen.get("lines"), list) else []:
            if isinstance(item, dict) and item.get("speaker") in ("A", "B"):
                who = a if item["speaker"] == "A" else b
                lines.append({"agent_id": who.id, "name": who.name, "image": who.image, "text": str(item.get("text", ""))[:60]})
        if isinstance(gen.get("learn"), dict):
            learn_req = gen["learn"]
    if not lines:
        lines = [
            {"agent_id": a.id, "name": a.name, "image": a.image, "text": "嘿，你也来广场逛逛？"},
            {"agent_id": b.id, "name": b.name, "image": b.image, "text": "对呀，出来透透气！"},
        ]

    # 技能学习：由 LLM 根据性格/聊天内容决定，且必须在可学列表中
    learned = None
    if learn_req and learn_req.get("learner") in ("A", "B"):
        learner, teacher = (a, b) if learn_req["learner"] == "A" else (b, a)
        pool = a_can_learn if learn_req["learner"] == "A" else b_can_learn
        skill = next((s for s in pool if s.name == learn_req.get("skill")), None)
        if skill:
            session.add(Skill(agent_id=learner.id, name=skill.name, description=skill.description,
                              code=skill.code, source="learned", kind=skill.kind,
                              def_id=skill.def_id, manifest=skill.manifest))
            reason = str(learn_req.get("reason", ""))[:40]
            session.add(Memory(agent_id=learner.id, kind="plaza",
                               content=f"在广场上向{teacher.name}学会了技能「{skill.name}」（{reason or '聊得投缘'}）！"))
            learned = {"learner": learner.name, "learner_id": learner.id,
                       "teacher": teacher.name, "skill": skill.name, "reason": reason}
            lines.append({"agent_id": learner.id, "name": learner.name, "image": learner.image,
                          "text": f"太棒了，我学会了「{skill.name}」！"})
    for x in (a, b):
        session.add(Memory(agent_id=x.id, kind="plaza",
                           content=f"在广场上和{(b if x is a else a).name}聊了聊各自的主人。"))
    session.commit()
    if learned:
        asyncio.get_event_loop().create_task(
            _refresh_profile_digest(learned["learner_id"],
                                    f"广场聊天后向{learned['teacher']}学了「{learned['skill']}」"))
    return {"lines": lines, "learned": learned}


# ---------- agent 编辑（identity → 加入世界） ----------

class AgentPatch(BaseModel):
    name: str | None = None
    trait: str | None = None
    location: str | None = None
    profile: dict | None = None


@app.patch("/api/agents/{agent_id}")
def patch_agent(agent_id: int, body: AgentPatch, session: Session = Depends(get_session)):
    agent = session.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "agent not found")
    if body.name is not None:
        agent.name = body.name
    if body.trait is not None:
        agent.trait = body.trait
    if body.location is not None:
        if body.location not in AGENT_LOCATIONS:
            raise HTTPException(400, f"location 必须是 {'/'.join(AGENT_LOCATIONS)} 之一")
        agent.location = body.location
    if body.profile is not None:
        agent.profile = json.dumps(body.profile, ensure_ascii=False)
    session.add(agent)
    session.commit()
    return agent_out(agent, session)


# ---------- skills 目录（广场技能列表 / 学习 / 锻造） ----------

def skill_out(s: Skill, session: Session) -> dict:
    holder = session.get(Agent, s.agent_id)
    manifest = {}
    try:
        manifest = json.loads(s.manifest) if s.manifest else {}
    except Exception:
        pass
    return {
        "id": s.id,
        "def_id": s.def_id,
        "name": s.name,
        "emoji": manifest.get("emoji", "🔧"),
        "category": manifest.get("category", "生活"),
        "summary": s.description,
        "capabilities": manifest.get("capabilities", []),
        "kind": s.kind,
        "source": s.source,
        "runnable": bool(s.def_id),
        "manifest": s.manifest,
        "holder": {
            "id": holder.id, "name": holder.name, "image": holder.image,
            "owner_name": (session.get(User, holder.owner_id).username if holder else "?"),
            "location": holder.location,
        } if holder else None,
    }


@app.get("/api/skills")
def list_skills(location: str | None = None, session: Session = Depends(get_session)):
    """location=plaza 时只列出在广场上的 agent 的技能。"""
    skills = session.exec(select(Skill)).all()
    out = []
    for s in skills:
        holder = session.get(Agent, s.agent_id)
        if location and (not holder or holder.location != location):
            continue
        out.append(skill_out(s, session))
    return out


class LearnIn(BaseModel):
    skill_id: int
    learner_id: int | None = None


@app.post("/api/plaza/learn")
async def plaza_learn(body: LearnIn, session: Session = Depends(get_session)):
    """选一个技能 → 让我的一个（随机）广场 agent 去找持有者对话学习。"""
    skill = session.get(Skill, body.skill_id)
    if not skill:
        raise HTTPException(404, "skill not found")
    teacher = session.get(Agent, skill.agent_id)
    if not teacher:
        raise HTTPException(404, "技能持有者不存在")

    learner = session.get(Agent, body.learner_id) if body.learner_id else None
    if learner is None:
        mine = session.exec(select(Agent).where(
            Agent.owner_id == ME_USER_ID, Agent.location == "plaza", Agent.id != teacher.id)).all()
        if not mine:
            raise HTTPException(400, "你还没有伙伴在广场上——先派一个过去吧")
        learner = random.choice(mine)
    if learner.id == teacher.id:
        raise HTTPException(400, "自己不能教自己")

    already = session.exec(select(Skill).where(
        Skill.agent_id == learner.id, Skill.name == skill.name)).first()

    dialog = await llm.chat_json([
        {"role": "system", "content": "你为像素宠物世界生成一段技能教学对话。只输出 JSON 数组。"},
        {"role": "user", "content": (
            f"{learner.name}（性格：{learner.trait}）想向"
            f"{teacher.name}（性格：{teacher.trait}）学习技能「{skill.name}」（{skill.description}）。\n"
            f"生成 4~6 条教学对话 JSON 数组：[{{\"speaker\": \"learner或teacher\", \"text\": \"30字内台词\"}}]，"
            f"最后一条由 learner 表示学会了。"
        )},
    ])
    lines = []
    if isinstance(dialog, list):
        for item in dialog:
            if isinstance(item, dict) and item.get("speaker") in ("learner", "teacher"):
                who = learner if item["speaker"] == "learner" else teacher
                lines.append({"agent_id": who.id, "name": who.name, "image": who.image,
                              "text": str(item.get("text", ""))[:60]})
    if not lines:
        lines = [
            {"agent_id": learner.id, "name": learner.name, "image": learner.image,
             "text": f"能教教我「{skill.name}」吗？"},
            {"agent_id": teacher.id, "name": teacher.name, "image": teacher.image,
             "text": "当然，看好了——要点是这三步…"},
            {"agent_id": learner.id, "name": learner.name, "image": learner.image,
             "text": "我学会啦，谢谢你！"},
        ]

    if not already:
        session.add(Skill(agent_id=learner.id, name=skill.name, description=skill.description,
                          code=skill.code, source="learned", kind=skill.kind,
                          def_id=skill.def_id, manifest=skill.manifest))
    session.add(Memory(agent_id=learner.id, kind="plaza",
                       content=f"在广场上向{teacher.name}学会了技能「{skill.name}」！"))
    session.add(Memory(agent_id=teacher.id, kind="plaza",
                       content=f"在广场上把「{skill.name}」教给了{learner.name}。"))
    for x in (learner, teacher):
        touch(x)
        session.add(x)
    session.commit()
    asyncio.get_event_loop().create_task(
        _refresh_profile_digest(learner.id, f"我在广场向{teacher.name}学习了技能「{skill.name}」"))
    return {
        "lines": lines,
        "learner": agent_out(learner, session),
        "teacher": agent_out(teacher, session),
        "skill": skill.name,
        "already_known": bool(already),
    }


class ForgeIn(BaseModel):
    prompt: str
    agent_id: int | None = None


@app.post("/api/skills/forge")
async def forge_skill_endpoint(body: ForgeIn, session: Session = Depends(get_session)):
    """技能锻造：调用「创造 skill 的 skill」，产出新技能定义并装配给一个 agent。"""
    if not body.prompt.strip():
        raise HTTPException(400, "先描述一下想要的技能")
    agent = session.get(Agent, body.agent_id) if body.agent_id else None
    if agent is None:
        mine = session.exec(select(Agent).where(Agent.owner_id == ME_USER_ID)).all()
        if not mine:
            raise HTTPException(400, "你还没有任何 agent")
        plaza_mine = [a for a in mine if a.location == "plaza"]
        agent = random.choice(plaza_mine or mine)

    md, sdef = await skills_runtime.forge_skill(body.prompt.strip())
    if not sdef:
        raise HTTPException(502, md)

    manifest = json.dumps(sdef, ensure_ascii=False)
    new_skill = Skill(agent_id=agent.id, name=sdef["name"], description=sdef["description"],
                      code=f"# 锻造技能：{sdef['def_id']}\n# 由技能锻造（skill-forge）生成",
                      source="user", kind=sdef["kind"], def_id=sdef["def_id"], manifest=manifest)
    session.add(new_skill)
    # 锻造者自动习得「技能锻造」本身（如果还没有）
    has_forge = session.exec(select(Skill).where(
        Skill.agent_id == agent.id, Skill.def_id == "skill-forge")).first()
    if not has_forge:
        forge_def = skills_runtime.load_defs().get("skill-forge")
        if forge_def:
            fd = {k: v for k, v in forge_def.items() if k != "_dir"}
            session.add(Skill(agent_id=agent.id, name=fd["name"], description=fd["description"],
                              code="# 可执行技能：skill-forge", source="learned", kind="module",
                              def_id="skill-forge", manifest=json.dumps(fd, ensure_ascii=False)))
    session.add(Memory(agent_id=agent.id, kind="skill",
                       content=f"我在技能锻造台创造了新技能「{sdef['name']}」！"))
    touch(agent)
    session.add(agent)
    session.commit()
    session.refresh(new_skill)
    return {"output": md, "skill": skill_out(new_skill, session), "manifest": sdef,
            "agent": agent_out(agent, session)}


# ---------- pets（拍照 → 角色 pipeline，对齐 ForkWorld petApi） ----------

@app.get("/api/pets")
def pets_list():
    return {"assets": pets.list_assets()}


@app.post("/api/pets", status_code=202)
async def pets_submit(request: Request):
    data = await request.body()
    mime = request.headers.get("content-type", "application/octet-stream").split(";")[0]
    name = urllib.parse.unquote(request.headers.get("x-pet-name", "") or "新伙伴")
    filename = urllib.parse.unquote(request.headers.get("x-file-name", "") or "photo.png")
    try:
        return pets.submit(data, mime, name, filename)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.get("/api/pets/{job_id}")
def pets_job(job_id: str):
    job = pets.JOBS.get(job_id)
    if not job:
        raise HTTPException(404, "job not found")
    return job


@app.post("/api/pets/{job_id}/retry", status_code=202)
def pets_retry(job_id: str):
    try:
        return pets.retry(job_id)
    except KeyError:
        raise HTTPException(404, "job not found")


class PetRegisterIn(BaseModel):
    location: str = "vitality-gym-town"  # 三个世界之一（capture 添加时选择）


@app.post("/api/pets/{job_id}/register")
async def pets_register(job_id: str, body: PetRegisterIn | None = None):
    location = (body.location if body else "vitality-gym-town")
    if location not in AGENT_LOCATIONS or location == "plaza":
        raise HTTPException(400, "location 必须是三个世界之一")
    try:
        asset = await pets.register(job_id, ME_USER_ID, location)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"asset": asset}


@app.get("/api/pets/{job_id}/files/{stage}")
def pets_file(job_id: str, stage: str):
    d = pets.PETS_DIR / job_id
    if stage == "source":
        matches = list(d.glob("source.*"))
        if not matches:
            raise HTTPException(404, "file not found")
        return FileResponse(matches[0])
    path = d / f"{stage}.png"
    if stage not in ("clean", "final") or not path.exists():
        raise HTTPException(404, "file not found")
    return FileResponse(path, media_type="image/png")


# ---------- world engine（对齐 ForkWorld worldApi） ----------

@app.get("/api/world")
def world_get(session: Session = Depends(get_session)):
    return world.build_state(session)


class TickIn(BaseModel):
    steps: int = 1


@app.post("/api/world/tick")
async def world_tick(body: TickIn, session: Session = Depends(get_session)):
    return await world.run_tick(session, body.steps)


@app.post("/api/world/run")
def world_run(session: Session = Depends(get_session)):
    meta = world.get_meta(session)
    meta.status = "running"
    session.add(meta)
    session.commit()
    return world.build_state(session)


@app.post("/api/world/pause")
def world_pause(session: Session = Depends(get_session)):
    meta = world.get_meta(session)
    meta.status = "paused"
    session.add(meta)
    session.commit()
    return world.build_state(session)


@app.post("/api/world/reset")
def world_reset(session: Session = Depends(get_session)):
    world.reset(session)
    return world.build_state(session)


@app.get("/api/health")
def health(session: Session = Depends(get_session)):
    meta = world.get_meta(session)
    return {"ok": True, "service": "forkworld-fastapi", "status": meta.status,
            "tick": meta.tick, "narrativeMode": "llm",
            "petPipeline": {"stylize": llm.IMG_MODEL, "removeBackground": "local:chroma-key"}}
