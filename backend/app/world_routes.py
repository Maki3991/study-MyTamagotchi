"""world_routes —— 「世界互访」接口，把 backend/world_engine 按 contracts/ 接成路由。

设计对齐本后端「demo 永不硬挂」信条：
world_engine 需要 ZHIPU_API_KEY(GLM)；缺 key / 依赖 / 网络时，端点仍返回符合
contracts schema 的兜底数据，绝不 500。所有 world_engine 导入都是**惰性**的
(放在 try/except 里)，因此即便 world_engine 整个坏了，app 仍能正常启动。

契约见 contracts/{world,visit_result,bump_event}.schema.json。
"""

from __future__ import annotations

import json
import time
import uuid
from pathlib import Path

from fastapi import APIRouter, HTTPException, WebSocket
from pydantic import BaseModel

router = APIRouter(prefix="/api", tags=["world"])

# 大屏种子数据：GET /api/worlds 默认返回它 —— 与前端离线回退加载的是同一个文件，
# 因此前端不管走后端还是回退，拿到的形状完全一致。
BIGSCREEN_WORLDS = (
    Path(__file__).resolve().parents[2] / "frontends" / "bigscreen" / "data" / "worlds.json"
)

# 内存存储(scaffold 级；正式版落 Redis/SQLite)
_worlds: dict[str, dict] = {}   # user_id -> WorldJSON
_visits: dict[str, dict] = {}   # visit_id -> VisitResult(+status)


def _load_seed_registry() -> dict:
    try:
        return json.loads(BIGSCREEN_WORLDS.read_text(encoding="utf-8"))
    except Exception:
        return {"worlds": [], "visits": []}


# ---------- world_engine 惰性调用 + 兜底 ----------

FALLBACK_WORLD = {
    "world_name": "未命名小城",
    "climate": "多云转晴，风很轻",
    "temperament": "安静，随时欢迎串门",
    "landmarks": [
        {"type": "cafe", "name": "永远续杯的咖啡角", "from": "兜底", "slot": 0},
        {"type": "library", "name": "不用还的书墙", "from": "兜底", "slot": 1},
        {"type": "garden", "name": "四季开花的小院", "from": "兜底", "slot": 2},
    ],
    "residents": [{"name": "看门的橘猫", "personality": "谁来都懒得抬头"}],
}


def _try_generate_world(profile: dict) -> dict | None:
    """惰性调 world_engine.generate_world；缺 key/依赖/网络时返回 None。"""
    try:
        from world_engine.world_generator import generate_world  # noqa: PLC0415
        return generate_world(profile)
    except Exception:
        return None


def _try_generate_visit(pa, wa, pb, wb) -> dict | None:
    try:
        from world_engine.visit_generator import generate_visit  # noqa: PLC0415
        return generate_visit(pa, wa, pb, wb)
    except Exception:
        return None


def _fallback_visit() -> dict:
    def tg(who: str) -> dict:
        return {
            "bubbles": [
                {"slot": 0, "text": "这个地方有意思"},
                {"slot": 1, "text": "有点像我"},
                {"slot": 2, "text": "想多待一会"},
            ],
            "travelogue": f"{who}的使者走了一圈，最喜欢那面书墙和小院，"
                          f"感觉这里的人和我住在同一种安静里。",
        }
    return {
        "travelogue_a": tg("A"),
        "travelogue_b": tg("B"),
        "resonance": {
            "score": 66,
            "line": "你们都把安静放在最显眼的位置",
            "opener": "聊聊各自最近在读的一本书",
            "hardware_feedback": {
                "led_rgb": "#E0A75D", "pattern": "breath", "epoch_ms": int(time.time() * 1000),
            },
        },
    }


# ---------- 请求体 ----------

class ProfileIn(BaseModel):
    url: str | None = None
    nickname: str | None = None
    profile: dict | None = None   # 也可直接传已有画像


class WorldPatch(BaseModel):
    world_name: str | None = None
    landmark_swap: dict | None = None   # {"slot": int, "type"?: str, "name"?: str}


class BumpIn(BaseModel):
    uid_a: str
    uid_b: str
    device_id: str | None = None


# ---------- 端点(沿用 /api 前缀，与既有后端一致) ----------

@router.get("/worlds")
def list_worlds():
    """大屏消费。返回与 frontends/bigscreen/data/worlds.json 同构的注册表。

    注：运行时经 /api/profile 生成的世界结构是 WorldJSON，缺大地图布点字段
    (region/slot_tiles)，直接注入会破坏大屏渲染，故此处只返回种子注册表；
    「生成世界 → 大地图布点」的转换留作后续(见 world_engine/README)。
    """
    return _load_seed_registry()


@router.post("/profile")
def create_world(body: ProfileIn):
    """主页/画像 → WorldJSON(world.schema.json)。缺 key 时回退兜底世界。"""
    profile = body.profile
    if profile is None and body.url:
        try:
            from world_engine.profile_researcher import research  # noqa: PLC0415
            profile = research(body.url)
        except Exception:
            profile = None
    if profile is None:
        profile = {"name": body.nickname or "路人", "one_liner": body.nickname or ""}

    world = _try_generate_world(profile) or dict(FALLBACK_WORLD)
    user_id = uuid.uuid4().hex[:8]
    _worlds[user_id] = world
    return {"user_id": user_id, "world": world}


@router.patch("/world/{user_id}")
def edit_world(user_id: str, patch: WorldPatch):
    world = _worlds.get(user_id)
    if not world:
        raise HTTPException(404, "world not found")
    if patch.world_name:
        world["world_name"] = patch.world_name[:8]
    if patch.landmark_swap:
        slot = patch.landmark_swap.get("slot")
        for lm in world.get("landmarks", []):
            if lm.get("slot") == slot:
                for k in ("type", "name"):
                    if k in patch.landmark_swap:
                        lm[k] = patch.landmark_swap[k]
    return world


@router.post("/bump")
def bump(body: BumpIn):
    """NFC 碰一碰(bump_event.schema.json) → 发起互访，立即返回 visit_id。

    正式版：立即返回后后台并发生成，用 20~30s 演出做延迟掩护。
    scaffold：同步生成(缺 key 走兜底)，结果直接可取。
    """
    visit_id = uuid.uuid4().hex[:12]
    wa = _worlds.get(body.uid_a) or dict(FALLBACK_WORLD)
    wb = _worlds.get(body.uid_b) or dict(FALLBACK_WORLD)
    result = _try_generate_visit({}, wa, {}, wb) or _fallback_visit()
    result.setdefault("resonance", {}).setdefault("hardware_feedback", {})["epoch_ms"] = int(time.time() * 1000)
    _visits[visit_id] = {"status": "ready", **result}
    return {"visit_id": visit_id}


@router.get("/visit/{visit_id}")
def get_visit(visit_id: str):
    """互访结果(visit_result.schema.json)。"""
    v = _visits.get(visit_id)
    if not v:
        raise HTTPException(404, "visit not found")
    return v


@router.websocket("/ws/{user_id}")
async def ws(websocket: WebSocket, user_id: str):
    """推送 world_ready / visit_ready 的最小可用 stub(回声)。正式版接事件总线。"""
    await websocket.accept()
    await websocket.send_json({"type": "hello", "user_id": user_id})
    try:
        while True:
            msg = await websocket.receive_text()
            await websocket.send_json({"type": "echo", "data": msg})
    except Exception:
        pass
