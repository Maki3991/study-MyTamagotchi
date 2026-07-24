# My Tamagotchi

拍下身边的物品 → 变成像素风 agent 住进「你的世界」：听你写日记、陪你聊天、去公共广场交朋友、互相学习技能。（AdventureX 2026）

## 技术栈

- **前端**：React + TypeScript + Vite + Tailwind CSS v4 + React Router + Motion + Lucide（手机画面 demo，像素风）
- **后端**：Python FastAPI + SQLModel + SQLite（单文件 `backend/tamagotchi.db`，启动自动建表并写入种子用户/物品）
- **LLM**：OpenRouter 免费模型（默认 `nvidia/nemotron-3-super-120b-a12b:free`，带多模型 fallback；API 失败时退回罐头回复，demo 不会挂）

## 启动

```bash
# 后端（先在 backend/.env 配好 OPENROUTER_API_KEY）
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8000

# 前端（另开终端；dev server 会把 /api 代理到 :8000）
cd frontends/mobile
npm install
npm run dev   # http://localhost:5173
```

## 功能地图

| 页面 | 功能 |
| --- | --- |
| 世界 | 自己的 agent 漫游；写日记 → LLM 路由给最相关的 agent 存为记忆并回应；「让他们聊聊」生成物品间关于主人的对话；相机按钮 → 扫描新物品（🚧 拍照识别为 placeholder，先手选类型生成人设） |
| 广场 | 世界地图街区：每个有 agent 在场的用户拥有一间小屋（屋顶颜色/门口配饰随屋主变化）+ 专属院子，沿中央大道鱼骨排列、可无限加户；agent 在自家院子休息、上街或去别家院子串门；点房子看住户介绍（自己的房子有「回家」按钮跳回世界页）；「促成一场交流」生成跨主人对话，有几率学会对方技能（✨ 标记） |
| 伙伴 | agent 列表：心情、位置、一键派出/召回；点击看详情（性格/记忆/技能代码/聊天） |
| 设置 | demo 假登入切换用户（种子用户：小May、阿健、书虫Lily） |

## 可执行技能系统

skill 分三种 `kind`：`demo`（装饰性代码片段）、`prompt`（LLM 提示词工作流）、`module`（Python 实现，可多阶段/多模态）。
可执行技能的定义放在 `backend/skills/{def_id}/`（`skill.json` 声明 inputs/output/cta，DB 只存 manifest 快照），前端按 manifest 自动渲染表单（text/select/date/time/image），图片经 `POST /api/artifacts` 上传后以 artifact id 传入 `POST /api/agents/{aid}/skills/{sid}/invoke`。广场技能交流会连同 `def_id`/manifest 一起复制，学来的可执行技能同样能用。

内置两个默认技能（移植自开源项目）：

| 技能 | kind | 来源 | 持有者 |
| --- | --- | --- | --- |
| 🧋 喜茶风海报（照片 → VL 分析 → 概念 → **真实出图**，生图走 `google/gemini-3.1-flash-lite-image`（付费，可用 `OPENROUTER_IMG_MODEL` 换）） | module | [heytea-style](https://github.com/Hchen1218/heytea-style) | 阿健的相机「小眼」 |
| 🔮 吠陀占星（出生资料 → KN Rao 风格解读，娱乐向） | prompt | [vedic-astro-skills](https://github.com/CNWU16/vedic-astro-skills) | 小May的书本「墨墨」 |

## 🚧 Placeholder

- 相机拍照识别物品（现为手选类型模拟扫描）
- 视频/镜头结合优化 skill（`POST /api/agents/{id}/camera` 返回开发中提示）
- 吠陀占星为近似排盘；接入原项目 vedic-calculator（pysweph 真实排盘）留作 module 升级
- 喜茶海报生图依赖 OpenRouter 付费模型（免费档无生图能力）；余额不足时自动退回「概念+prompt」文字输出
