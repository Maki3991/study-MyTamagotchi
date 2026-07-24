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


ALLOWED_INPUT_TYPES = {"text", "select", "date", "time", "image"}


async def forge_skill(prompt: str) -> tuple[str, dict | None]:
    """技能锻造核心：LLM 设计 → 写入 backend/skills/custom-*/ → 立即可用。
    返回 (markdown 报告, 新技能定义 dict 或 None)。"""
    design = await llm.chat_json([
        {"role": "system", "content": (
            "你是技能架构师，把用户想要的能力设计成一个可执行的 LLM 技能。只输出 JSON。\n"
            "输入控件类型只能用：text / select / date / time / image。inputs 数量 1-4 个，key 用英文蛇形命名。"
        )},
        {"role": "user", "content": (
            f"用户需求：「{prompt}」\n输出 JSON：{{\n"
            '"slug": "英文短横线小写标识",\n'
            '"name": "4-6字中文技能名",\n'
            '"emoji": "一个最贴切的emoji",\n'
            '"category": "分类（如 健康/学习/生活/创作）",\n'
            '"description": "30字内技能简介",\n'
            '"inputs": [{"key": "英文key", "label": "中文标签", "type": "text|select|date|time|image", '
            '"required": true, "options": ["仅select需要"], "placeholder": "提示"}],\n'
            '"cta": "4字动作按钮文案",\n'
            '"workflow": "给执行 LLM 的中文系统提示词：角色设定 + 工作步骤 + 输出的 markdown 格式要求（含2-3个##小节），200字左右",\n'
            '"capabilities": ["三条", "能力", "要点"]\n'
            "}}"
        )},
    ], max_tokens=1200)
    if not isinstance(design, dict) or not design.get("name"):
        return "⚠️ 锻造失败：设计蓝图没有生成，请换个说法再试一次。", None

    slug = "".join(c for c in str(design.get("slug", "skill")).lower() if c.isalnum() or c == "-") or "skill"
    def_id = f"custom-{slug}"
    n = 2
    while (SKILLS_DIR / def_id).exists():
        def_id = f"custom-{slug}-{n}"
        n += 1

    inputs = []
    for spec in (design.get("inputs") or [])[:4]:
        if not isinstance(spec, dict) or not spec.get("key"):
            continue
        itype = spec.get("type") if spec.get("type") in ALLOWED_INPUT_TYPES else "text"
        item = {"key": str(spec["key"]), "label": str(spec.get("label", spec["key"])),
                "type": itype, "required": bool(spec.get("required"))}
        if itype == "select" and spec.get("options"):
            item["options"] = [str(o) for o in spec["options"]][:6]
        if spec.get("placeholder"):
            item["placeholder"] = str(spec["placeholder"])
        inputs.append(item)
    if not inputs:
        inputs = [{"key": "request", "label": "你的需求", "type": "text", "required": True}]

    sdef = {
        "def_id": def_id,
        "name": str(design["name"])[:12],
        "emoji": str(design.get("emoji", "✨"))[:4],
        "category": str(design.get("category", "生活")),
        "description": str(design.get("description", ""))[:60],
        "kind": "prompt",
        "source_repo": "forged-in-app",
        "inputs": inputs,
        "output": {"type": "markdown"},
        "cta": str(design.get("cta", "使用技能"))[:8],
        "capabilities": [str(c) for c in (design.get("capabilities") or [])][:3],
    }
    d = SKILLS_DIR / def_id
    d.mkdir(parents=True, exist_ok=True)
    (d / "skill.json").write_text(json.dumps(sdef, ensure_ascii=False, indent=2), encoding="utf-8")
    prompt_md = (
        f"{design.get('workflow', '你是一个贴心的助手，认真完成用户的请求。')}\n\n## 用户输入\n"
        + "\n".join(f"- {i['label']}：{{{i['key']}}}" for i in inputs)
        + "\n\n始终用简体中文输出 markdown，语气温暖、内容具体可执行。"
    )
    (d / "prompt.md").write_text(prompt_md, encoding="utf-8")

    md = "\n".join([
        f"## {sdef['emoji']} 锻造完成：{sdef['name']}",
        sdef["description"],
        "",
        "**能力要点**",
        *[f"- {c}" for c in sdef["capabilities"]],
        "",
        "**输入表单**",
        *[f"- {i['label']}（{i['type']}）" for i in inputs],
        "",
        f"技能已发布为 `{def_id}`，现在就可以使用，也能在广场被其他 agent 学走。",
    ])
    return md, sdef


async def _run_skill_forge(sdef: dict, inputs: dict, artifacts: dict, save_artifact=None) -> str:
    md, _ = await forge_skill(str(inputs.get("prompt", "")))
    return md


IMPL = {"heytea-poster": _run_heytea, "skill-forge": _run_skill_forge}


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
