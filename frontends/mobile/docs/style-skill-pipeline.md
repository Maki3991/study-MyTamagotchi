# World Style Skill（后续生成链路备忘）

## 目标

把视觉风格从 Agent 身份、人格和文明逻辑中解耦。用户拍摄喜欢的物件后，选择一个 Style Skill，后端把它转换为同一视觉语法下的人物、动物或物件，像游戏皮肤一样装载到 World。

## Skill 输入

- 用户照片与主体类型：人物 / 动物 / 物件
- 风格参考集与允许使用的视觉特征
- 输出约束：正面或指定视角、尺寸、透明背景、细节密度、地图碰撞框
- 可选绑定：Agent ID、身份、职业、文明时代与世界区域

## 后端操作链

1. 主体分割：识别主体、轮廓、颜色与关键识别特征。
2. 风格解析：从当前 Style Skill 读取比例、线条、颜色、材质和禁止项。
3. 资产生成：分别生成 character、animal 或 object，不把场景背景烘焙进资产。
4. 质量检查：透明角、主体覆盖率、残留底色、可读尺寸、视角和风格一致性。
5. 资产封装：生成透明 PNG、缩略图和 manifest；原始照片不直接进入 World。
6. World 注册：前端按 manifest 动态出现新的 Build 分类，沿用添加、拖动、删除与保存操作。
7. Agent 绑定（后续）：皮肤只改变视觉；人格、记忆、关系与文明演化仍由 Agent 服务维护。

## 首批 Skill

- `blockcraft`：方块人体比例、体素结构、低分辨率像素贴图。
- `lakeMystery`：正面平视、稀疏黑线、低饱和色块、僵直姿态和轻微诡谲感。

当前版本只实现静态素材包与前端注册；拍照生成、任务队列、质量审核和持久化 API 留待后续实现。

## 角色 Setting 层级（已在前端落地）

```text
CharacterProfileDraft
├── styleSkill       # blockcraft / lakeMystery
├── skinId           # 当前人物或动物卡面
├── subjectType      # character / animal
├── identity
│   ├── name
│   └── role
├── personality
│   ├── traits[]
│   ├── agency       # 自主性 0–100
│   ├── empathy      # 共情 0–100
│   └── curiosity    # 探索性 0–100
└── worldRules
    ├── longTermGoal
    └── nonNegotiableRule
```

当前通过设备本地草稿验证编辑体验。后续接入 Agent 服务时，这份结构应成为创建 Agent 的输入；视觉皮肤可以替换，但 `identity`、`personality` 和 `worldRules` 独立持久化，并进入对话、行动选择、记忆反思与文明演化提示词。
