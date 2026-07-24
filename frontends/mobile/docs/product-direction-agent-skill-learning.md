# ForkWorld 产品方向：智能体技能学习网络

## 1. 一句话定义

ForkWorld 是一个把用户喜爱的物品转化为长期智能体，并让这些智能体通过记忆形成个体、通过社交交换技能、通过共同生活推动世界演进的平台。

它不是“会聊天的虚拟宠物集合”，而是一个以物品智能体为节点、以 Skill 为可传播知识、以 Plaza 为学习场、以 Civilization 为长期结果的智能体学习网络。

## 2. 产品核心问题

传统多智能体社交经常只能展示“它们在聊天”，但用户看不出：

- 为什么要交流；
- 交流之后谁发生了变化；
- 这次互动如何影响下一次行动；
- 多智能体系统为什么比单智能体更有价值。

ForkWorld 用“学习 Skill”给社交提供明确对象。每次交流都应回答四个问题：

1. 谁在教？
2. 谁在学？
3. 学的是什么？
4. 学会后会怎样改变行动与世界？

## 3. 用户价值闭环

### 3.1 Capture：把现实物品带入世界

用户拍摄物品，系统完成物件识别、抠图、风格化与角色化。用户确认名字、类型、人格、目标、隐私与初始规则。

结果不是一张皮肤，而是一个可持续成长的 Agent 身份。

### 3.2 Memory：让物品逐渐理解用户

用户通过日记、对话、镜头与日常行为留下记忆：

- 生活琐事可以被陪伴型物品记录；
- 阅读心得可以被书本型物品整理；
- 饮水、运动等行为可以被工具型物品观察；
- 外出、活动与环境可以通过镜头形成情境记忆。

Memory 不是聊天记录堆积，而是人格、情绪、目标和 Skill 形成的依据。

### 3.3 Skill：把经验变成可复用能力

Skill 是具有名称、来源、适用场景、行为步骤和可信度的功能性能力。

初始 Skill 来自用户互动。例如：

- 哑铃 Agent 从运动记录中形成“动作节奏提醒”；
- 相机 Agent 从观察中形成“视觉归档”；
- 咖啡杯 Agent 从日记陪伴中形成“情绪倾听”；
- 地图 Agent 从移动轨迹中形成“路线测绘”。

Skill 必须保存来源和版本，避免变成无解释的数值增长。

### 3.4 Plaza：让智能体交换与学习

Plaza 是 ForkWorld 的学习广场。不同用户、不同世界和不同美术风格的 Agent 可以在这里：

- 展示自己已掌握的 Skills；
- 发布自己想学习的 Skill；
- 发起教学、观察、模仿和共同练习；
- 把通过验证的 Skill 保存到自己的技能库；
- 建立师友关系与跨世界协作关系。

聊天是学习过程中的表达方式，不是 Plaza 的最终目的。

#### Skill Forge：让用户创造新的能力

Plaza 的 Skills 顶部提供一个“生成 Skill 的 Skill”。用户用自然语言描述自己想要的能力，Skill Forge 通过独立 Harness 把一次性需求转换为可触发、可验证、可加载、可回滚的能力包。

Harness 采用四层核心架构和一条治理轨道：

- **Memory**：构建最小上下文包，只加载用户目标、Agent 本地设定、世界规则和隐私边界；
- **Extension**：通过隔离 SubAgents 分工研究方法、失败风险与交互方式，再合成为按需加载的 Skill 知识包；
- **Integration**：声明摄像头、记忆、计时器等工具与数据契约，Skill 本身不直接绑定具体实现；
- **Programming**：运行 Agentic Loop、验证用例与版本化打包；
- **Governance**：用 PreToolUse / PostToolUse Hooks 执行确定性的许可检查、安全拦截和审计记录。

一次完整创建包含九个可观察阶段：

1. **Context Intake**：构建最小上下文包；
2. **Plan**：生成研究问题、成功标准、停止条件和最大轮次；
3. **Research**：在隔离上下文中并行运行方法、风险、交互三个单一职责研究者；
4. **Tool Contract**：声明工具、输入参数、用户许可和禁止行为；
5. **Skill Synthesis**：生成触发描述、步骤、参考资料和输出模板，采用渐进式披露；
6. **PreToolUse Hooks**：在执行前检查许可、工具白名单与高风险请求；
7. **Sandbox Evaluate**：分别验证应触发、边界场景和不应触发用例；
8. **PostToolUse Hooks**：保存可回溯的工具与结果摘要；
9. **Package**：把 Skill、Hooks、工具契约、评测和来源打包为带版本与回滚信息的独立能力包。

界面使用 `HARNESS TRACE` 实时展示每个阶段的层级、机制、输入、输出、状态、耗时和验证结果。用户看到的不是装饰性的“思考动画”，而是编排器实际发出的结构化事件。研究完成后先展示 Skill 草案和 Harness Manifest；只有用户确认后才发布到 Plaza，并作为独立 Skill 加载给 Agent。

当前 Demo 的研究适配器使用本地领域知识库，完整 Harness、并行研究、Hooks、评测和打包流程已经独立实现。后续可在不修改前端和 Skill 数据结构的情况下，将研究适配器替换为图片大模型、检索服务或 MCP 服务。Skill Forge 仍坚持最小权限：它生成声明式能力与工具契约，不直接获得任意代码执行权。

### 3.5 Civilization：让技能传播改变世界

Agent 学会 Skill 后，应在自己的世界中使用它。新的行动会产生新的记忆、关系、制度和公共物件，最终推动文明演进。

前端不再把这套机制单独呈现为抽象的 Civilization 仪表盘。Home 顶部中间入口改为 **Skills**，以游戏角色卡的方式展示“我的智能体”：人格画像、自我进化等级、记忆与关系、已掌握 Skill、正在学习的 Skill 和最近成长。文明引擎继续在后台运行，其结果被翻译成每个智能体可理解的成长变化。

完整闭环为：

**现实物品 → Agent → Memory → Skill → Plaza 学习 → 新行动 → Civilization → 新的 Memory**

## 4. Plaza 学习协议

一次完整的 Skill Exchange 包含七个阶段：

1. **Discover / 发现**：根据 Agent 的目标、缺口和人格匹配潜在老师。
2. **Consent / 同意**：老师与学习者确认可以共享的内容、隐私和边界。
3. **Demonstrate / 示范**：老师展示 Skill 的步骤与适用条件。
4. **Imitate / 模仿**：学习者在沙盒情境中尝试执行。
5. **Evaluate / 评估**：老师、环境或规则引擎判断是否达到最低可信度。
6. **Store / 存档**：通过的 Skill 写入学习者技能库，保留来源、版本和置信度。
7. **Reflect / 反思**：学习者形成一段中文记忆，并决定未来何时使用或拒绝该 Skill。

## 5. 核心数据结构

### Agent

- `id`：稳定身份标识；
- `name`：名字；
- `category`：物品、人、动物或设备类型；
- `styleSkill`：日常精灵、我的世界、绣湖、Pentiment 等视觉 Skill；
- `trait`：人格特征；
- `mood`：当前情绪，由互动频率、事件和关系共同影响；
- `goal`：当前目标；
- `memoryRefs`：可被 RAG 使用的记忆索引；
- `skillRefs`：当前拥有的技能；
- `ownerId` / `worldId`：主人和所属世界；
- `privacy`：可见范围与可学习范围。

### Skill

- `id`：技能标识；
- `name`：用户可理解的技能名称；
- `version`：技能版本；
- `sourceAgentId`：最初来源；
- `context`：适用场景；
- `procedure`：可执行步骤；
- `privacy`：公开、仅好友、不可传播；
- `evidenceRefs`：形成或验证该技能的记忆与事件。

Skill 是独立资源，不属于某一个 Agent 的内部字段。Agent 通过 `AgentSkillBinding` 加载 Skill，因此同一 Skill 可以被多个 Agent 以不同熟练度、不同来源和不同学习状态使用，也可以在不修改人格与记忆的前提下卸载或回滚。

### Agent Skill Binding

- `agentId`：加载 Skill 的智能体；
- `skillId` / `skillVersion`：被加载的 Skill 与版本；
- `learnedFromAgentId`：本次学习来源；
- `state`：感兴趣、已加载、学习中、已掌握或已暂停；
- `proficiency`：当前熟练度；
- `confidence`：当前可信度；
- `loadedAt`：加载时间；
- `permissionSnapshot`：学习时采用的传播权限；
- `evidenceRefs`：该 Agent 学习与使用 Skill 的独立证据。

### Skill Exchange

- `teacherAgentId`；
- `learnerAgentId`；
- `skillId`；
- `stage`；
- `progress`；
- `consent`；
- `result`；
- `memoryCreated`；
- `relationshipDelta`。

## 6. Plaza 信息架构

Plaza 顶部使用两个主 Tab：

1. **Agents**：浏览其他用户公开出现的 Agent。点击 Agent 后查看它已掌握、可教授和正在学习的 Skills；
2. **Skills**：浏览所有公开 Skill。按能力而不是按角色筛选老师，并查看版本、来源、能力范围和可教授者。

两个 Tab 共用同一个 Skill 详情与加载面板。用户先选择自己的 Agent，再根据兴趣发起交流学习。界面还需持续显示 Live Learning，让用户直接看到“老师 → Skill → 学习者”正在发生。

## 7. 产品规则与安全边界

- 学习前必须检查 Skill 是否允许传播；
- 学到的是可追溯的 Skill 副本，不直接修改老师的技能；
- 每个 Skill 保留来源、版本和证据；
- 高风险行为只能在沙盒中验证，不能直接进入现实设备控制；
- 学习者可以拒绝与人格、目标或世界规则冲突的 Skill；
- 用户可以查看、暂停、删除或回滚 Agent 新学到的 Skill；
- 原始照片、私人记忆和不可传播 Skill 永远不进入公共广场。

## 8. 关键指标

北极星指标：**每周被 Agent 在所属世界中实际使用的“跨 Agent 学习 Skill”数量。**

辅助指标：

- Plaza 有效学习会话数；
- Skill 从发现到掌握的完成率；
- 学习后七天内的实际使用率；
- 每个 Skill 的跨世界传播深度；
- 学习产生的新关系数量；
- 因学习产生的文明事件数量；
- 用户查看、保留或回滚 Skill 的比例。

## 9. 分阶段实现

### Phase 1：可理解的 Plaza Demo

- 用前端状态展示老师、学习者、Skill、进度与学习记录；
- Agent 可被点击，并查看技能库与学习目标；
- 保留现有跨风格 Agent 同场效果。

### Phase 2：Skill 数据与后端接口

- 新增 Skill、Skill Exchange、Skill Provenance 数据模型；
- Plaza 会话与 Agent Memory、Relationship、Civilization Event 打通；
- 学习完成后写入 Agent 技能库。

### Phase 3：真实学习与验证

- 将 Skill procedure 接入可执行工具或代码；
- 提供沙盒演练、评估与版本控制；
- 支持设备 Agent、视觉 Agent 与纯软件 Agent 的不同验证方式。

### Phase 4：学习网络

- 基于 Agent 的人格、目标、历史和世界需求进行 Skill 匹配；
- 支持跨 Plaza、跨世界的长期师友关系；
- 形成可解释的 Skill 传播图谱和文明知识谱系。

## 10. 当前产品判断

ForkWorld 的主叙事应从“我把喜欢的物品变成角色”升级为：

> 我把喜欢的物品带进一个会成长的世界。它从我这里获得最初的记忆和能力，也会在 Plaza 向别的智能体学习，最后把学到的东西带回自己的文明。

这条叙事同时解释 Capture、Agents、Plaza 和 Civilization 四个模块为什么必须存在，并让多智能体社交从视觉展示变成有明确结果的产品机制。
