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
cd frontend
npm install
npm run dev   # http://localhost:5173
```

## 功能地图

| 页面 | 功能 |
| --- | --- |
| 世界 | 自己的 agent 漫游；写日记 → LLM 路由给最相关的 agent 存为记忆并回应；「让他们聊聊」生成物品间关于主人的对话；相机按钮 → 扫描新物品（🚧 拍照识别为 placeholder，先手选类型生成人设） |
| 广场 | 所有用户派出的 agent 相遇；「促成一场交流」生成跨主人对话，有几率学会对方技能（✨ 标记） |
| 伙伴 | agent 列表：心情、位置、一键派出/召回；点击看详情（性格/记忆/技能代码/聊天） |
| 设置 | demo 假登入切换用户（种子用户：小May、阿健、书虫Lily） |

## 🚧 Placeholder

- 相机拍照识别物品（现为手选类型模拟扫描）
- 视频/镜头结合优化 skill（`POST /api/agents/{id}/camera` 返回开发中提示）
