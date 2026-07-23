"""可执行技能运行时：从 backend/skills/{def_id}/ 加载定义并执行。

kind = "prompt"：skill 目录下的 prompt.md 填入 inputs 后交给 LLM。
kind = "module"：在 IMPL 注册表里找对应的 Python 实现（可做多阶段/多模态）。
"""

import base64
import json
from pathlib import Path

from . import llm

SKILLS_DIR = Path(__file__).resolve().parent.parent / "skills"
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"


def load_defs() -> dict[str, dict]:
    defs = {}
    for f in SKILLS_DIR.glob("*/skill.json"):
        d = json.loads(f.read_text(encoding="utf-8"))
        d["_dir"] = f.parent
        defs[d["def_id"]] = d
    return defs


def _fill(template: str, inputs: dict, extra: dict | None = None) -> str:
    values = {**inputs, **(extra or {})}
    out = template
    for k, v in values.items():
        out = out.replace("{" + k + "}", str(v) if v not in (None, "") else "（未提供）")
    return out


def _read_artifact_b64(artifact_path: str, mime: str) -> str:
    data = Path(artifact_path).read_bytes()
    return f"data:{mime};base64,{base64.b64encode(data).decode()}"


async def _run_heytea(sdef: dict, inputs: dict, artifacts: dict) -> str:
    photo = artifacts.get(inputs.get("photo", ""))
    if not photo:
        return "⚠️ 没拿到照片，请重新上传一张生活照片。"
    image_url = _read_artifact_b64(photo["path"], photo["mime"])
    analysis = await llm.chat(
        [{
            "role": "user",
            "content": [
                {"type": "text", "text": (
                    "分析这张生活照片，用中文回答：1) 画面里最适合做海报主角的一个真实物品及其质感颜色；"
                    "2) 整体氛围情绪；3) 这个物品能引发的一个俏皮联想或小故事。150字以内。"
                )},
                {"type": "image_url", "image_url": {"url": image_url}},
            ],
        }],
        max_tokens=1200,
        model=llm.VL_MODEL,
    )
    template = (sdef["_dir"] / "prompt_generate.md").read_text(encoding="utf-8")
    prompt = _fill(template, inputs, {"photo_analysis": analysis})
    return await llm.chat(
        [{"role": "system", "content": prompt},
         {"role": "user", "content": "请按输出格式给出海报概念。"}],
        max_tokens=1600, temperature=0.8,
    )


IMPL = {"heytea-poster": _run_heytea}


async def invoke(def_id: str, inputs: dict, artifacts: dict) -> str:
    """artifacts: {artifact_id: {"path":..., "mime":...}} 供多模态输入取用。"""
    defs = load_defs()
    sdef = defs.get(def_id)
    if not sdef:
        return f"⚠️ 技能定义 {def_id} 不存在。"
    # select 类输入落默认值
    for spec in sdef.get("inputs", []):
        if not inputs.get(spec["key"]) and spec.get("default"):
            inputs[spec["key"]] = spec["default"]

    if sdef["kind"] == "module":
        fn = IMPL.get(def_id)
        if not fn:
            return f"⚠️ 技能 {def_id} 的实现未注册。"
        return await fn(sdef, inputs, artifacts)

    template = (sdef["_dir"] / "prompt.md").read_text(encoding="utf-8")
    prompt = _fill(template, inputs)
    return await llm.chat(
        [{"role": "system", "content": prompt},
         {"role": "user", "content": "请按输出格式完成任务。"}],
        max_tokens=1600, temperature=0.8,
    )
