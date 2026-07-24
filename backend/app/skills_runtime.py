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


async def _run_heytea(sdef: dict, inputs: dict, artifacts: dict, save_artifact=None) -> str:
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

    template_choice = inputs.get("template", "两套都出（推荐）")
    concepts = await llm.chat_json([
        {"role": "system", "content": (sdef["_dir"] / "prompt_generate.md").read_text(encoding="utf-8")
            .replace("{photo_analysis}", analysis)
            .replace("{template}", template_choice)
            .replace("{title}", inputs.get("title") or "（未提供，由你创作）")},
        {"role": "user", "content": (
            '只输出 JSON 数组，每个模板一项（最多2项）：'
            '[{"template":"带字版或无字版","concept":"80字内的构图概念","title":"主标题（无字版填空字符串）",'
            '"image_prompt":"给图像模型的完整英文prompt，包含 vertical 3:4 poster, off-white background, '
            'photoreal object anchor from the reference photo, primitive black line doodle micro workers；'
            '带字版需描述在留白区加歪扭儿童手写风中文标题（写明具体标题文字）"}]'
        )},
    ], max_tokens=1400)

    if not isinstance(concepts, list) or not concepts:
        concepts = [{"template": "无字版", "concept": "以照片中的主物品为锚点，黑线小人环绕劳作。",
                     "title": "", "image_prompt": (
                         "Vertical 3:4 minimalist poster, off-white background, the real object from the "
                         "reference photo as photoreal anchor, tiny primitive black-line doodle workers "
                         "climbing and playing on it, large negative space, healing mood")}]

    parts = ["## 🧋 海报成品"]
    for c in concepts[:2]:
        img = await llm.generate_image(str(c.get("image_prompt", "")), image_url)
        name = c.get("template", "海报")
        if img and save_artifact and img.startswith("data:"):
            header, b64 = img.split(",", 1)
            mime = header.split(":")[1].split(";")[0]
            url = save_artifact(base64.b64decode(b64), mime)
            parts.append(f"**{name}**{'：' + str(c.get('title')) if c.get('title') else ''}")
            parts.append(f"![{name}]({url})")
        else:
            parts.append(f"**{name}**：图片生成失败，附上概念与 prompt 供手动生成 🙏")
        parts.append(str(c.get("concept", "")))
    parts.append("## 🎨 生成 Prompt")
    for c in concepts[:2]:
        parts.append(f"- **{c.get('template', '')}**：{c.get('image_prompt', '')}")
    return "\n".join(parts)


IMPL = {"heytea-poster": _run_heytea}


async def invoke(def_id: str, inputs: dict, artifacts: dict, save_artifact=None) -> str:
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
        return await fn(sdef, inputs, artifacts, save_artifact)

    template = (sdef["_dir"] / "prompt.md").read_text(encoding="utf-8")
    prompt = _fill(template, inputs)
    return await llm.chat(
        [{"role": "system", "content": prompt},
         {"role": "user", "content": "请按输出格式完成任务。"}],
        max_tokens=1600, temperature=0.8,
    )
