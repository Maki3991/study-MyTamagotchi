# 上游依赖 / 参考件（不随本仓库入库）

以下外部代码库体积大且各自带独立 git，**不 vendored 进本仓库**，需单独获取（建议 `git submodule`）：

| 名称 | 用途 | 获取方式 |
|---|---|---|
| **generative_agents** | 斯坦福 Generative Agents（AI 小镇引擎）——大屏/硬件端的世界与角色源头 | git submodule / 官方仓库 |
| **TuyaOpen** | Tuya T5AI 固件 SDK——编译 `frontends/hardware/ville_native` 用 | git submodule / 官方仓库 |
| **web_frontend**（Reverie 回放） | Django + Phaser 官方回放 demo，仅作引擎可视化**参考**，非产品前端 | 桌面 AdventureX 打包件 |

> 本次「大屏 web 前端」选用 `frontends/bigscreen`（ForkWorld 世界地图）。
> `web_frontend` 未采用，仅留作底层引擎的可视化参考。

## 建议接法（submodule）

```bash
git submodule add <generative_agents 仓库地址> third_party/generative_agents
git submodule add <TuyaOpen 仓库地址>          third_party/TuyaOpen
```
