# world_engine · ForkWorld 世界生成 / 互访引擎（待接线）

来自「世界互访」的后端逻辑，负责世界生成、互访游记、灵魂契合、使者行走轨迹。**目前是独立模块，尚未挂进共享后端的 FastAPI。**

| 文件 | 职责 |
|---|---|
| `world_generator.py` | 社交主页 → WorldJSON（世界元素） |
| `visit_generator.py` | 两人碰一碰 → 互访游记 + 灵魂契合 |
| `profile_researcher.py` | 主页抓取 / 画像 |
| `visit_to_master_movement.py` | 游记 → 使者行走轨迹（供大屏演出） |
| `deep_research.py` / `infra_check.py` | 辅助 |

## 待办：接成共享后端的路由

按 `contracts/` 挂成接口，供 `frontends/bigscreen` 与 `frontends/hardware` 消费：

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/profile` | 主页 → 世界（world.schema.json） |
| PATCH | `/world/{user_id}` | 世界编辑 |
| POST | `/bump` | NFC 碰一碰（bump_event.schema.json） |
| GET | `/visit/{visit_id}` | 互访游记 + 契合（visit_result.schema.json） |
| WS | `/ws/{user_id}` | 推送 world_ready / visit_ready |

> 共享后端 = 本仓库 `backend/`（MyTamagotchi FastAPI）。把上述路由加进 `backend/app/` 即可，三端共用同一后端。
