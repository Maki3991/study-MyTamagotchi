# My Tamagotchi · Monorepo

> AdventureX 2026 · **三个前端 + 一个共享后端**的单仓库

本仓库把三个前端与一个共享后端收在一起（monorepo 方案 A）。三端通过 `contracts/` 里的接口契约，与**同一个后端**（`backend/`）对接。

## 目录结构

```
MyTamagotchi/
├── backend/                 ★ 唯一共享后端（FastAPI + SQLModel + SQLite）
│   ├── app/                    业务接口 · 技能运行时 · 世界演化引擎(world.py) · 宠物流水线(pets.py) · LLM 编排
│   └── skills/                 可执行技能定义（heytea-poster / vedic-astro / skill-forge / custom-*）
├── contracts/               ★ 三端与后端的共享接口契约（JSON Schema）
│   ├── world.schema.json
│   ├── visit_result.schema.json
│   └── bump_event.schema.json
├── frontends/
│   ├── mobile/              📱 手机端（ForkWorld UI：世界/广场/技能锻造/拍照捕获，接真后端）
│   ├── bigscreen/           🖥️ 大屏端（ForkWorld 世界地图，纯静态 Phaser，投屏 ?bg=1）
│   └── hardware/            🎛️ 硬件端（Tuya T5AI-Board · LVGL 原生固件）
├── docs/                    技术架构 + 产品方案
└── third_party/             上游依赖说明（generative_agents / TuyaOpen，不入库）
```

## 三个前端 · 各自启动

### 📱 mobile — 手机端
React + TypeScript + Vite + Tailwind v4。dev server 把 `/api` 代理到后端 `:8000`。详见 [frontends/mobile/README.md](frontends/mobile/README.md)。
```bash
cd frontends/mobile
npm install
npm run dev        # http://localhost:5173
```

### 🖥️ bigscreen — 大屏端
纯静态 Phaser 世界地图（「每个世界，都是一个人」），零构建。投屏加 `?bg=1`。
```bash
cd frontends/bigscreen
python3 -m http.server 8200
# 打开 http://localhost:8200/global.html?bg=1
```

### 🎛️ hardware — 硬件端
Tuya T5AI-Board（3.5″ LCD）· LVGL 原生固件。源码在 `ville_native/`（放进 TuyaOpen 编译），或直接烧预编译固件。详见 [frontends/hardware/README.md](frontends/hardware/README.md)（`.bin` 走 Release/LFS，不入库）。

## 共享后端

三端共用这一个后端。
```bash
cd backend
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8000
```
后端的世界演化引擎在 `backend/app/world.py`（`/api/world`、`/api/world/tick`，启动后每 45s 自动 tick）。`contracts/` 保留为大屏/硬件端「世界互访」的接口契约（设计参考）。

## 说明

- 上游依赖 `generative_agents`、`TuyaOpen` 与参考件 `web_frontend` 未入库，见 [third_party/README.md](third_party/README.md)。
- 大屏/硬件端「世界互访」的完整架构见 [docs/技术架构与四人分工.md](docs/技术架构与四人分工.md)。
