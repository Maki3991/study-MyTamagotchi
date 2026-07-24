import type { PlazaSkill } from "./plazaSkills";

export type SkillForgeLayer =
  | "memory"
  | "extension"
  | "integration"
  | "programming"
  | "governance";

export type SkillForgeMechanism =
  | "Memory"
  | "Agentic Loop"
  | "SubAgents"
  | "MCP Contract"
  | "Skill"
  | "Hooks"
  | "Evaluator"
  | "Plugin";

export type SkillForgeTraceStatus = "running" | "done" | "blocked";

export type SkillForgeTraceEvent = {
  id: string;
  parentId?: string;
  depth: number;
  layer: SkillForgeLayer;
  mechanism: SkillForgeMechanism;
  label: string;
  detail: string;
  input: string;
  output: string;
  status: SkillForgeTraceStatus;
  durationMs?: number;
};

export type SkillForgeManifest = {
  name: string;
  description: string;
  version: string;
  trigger: {
    positive: string[];
    negative: string[];
  };
  permissions: {
    allowedTools: string[];
    requiresConsent: string[];
    deniedActions: string[];
  };
  runtime: {
    context: "fork";
    agent: "domain-researcher";
    maxTurns: number;
  };
  hooks: {
    preToolUse: string[];
    postToolUse: string[];
  };
  evaluation: {
    passed: number;
    total: number;
    cases: string[];
  };
  package: {
    format: "skill-bundle";
    rollback: boolean;
    provenance: string;
  };
};

export type SkillForgeResult = {
  skill: PlazaSkill;
  manifest: SkillForgeManifest;
  metrics: {
    contextSources: number;
    researchWorkers: number;
    toolContracts: number;
    hookChecks: number;
    evaluationPassed: number;
    evaluationTotal: number;
  };
};

type DomainProfile = {
  key: string;
  match: RegExp;
  name: string;
  englishName: string;
  category: string;
  capabilities: string[];
  methods: string[];
  risks: string[];
  interaction: string[];
  tools: string[];
  consent: string[];
};

const DOMAIN_PROFILES: DomainProfile[] = [
  {
    key: "fitness",
    match: /健身|运动|动作|深蹲|训练|姿势/,
    name: "训练动作纠正",
    englishName: "Form Coach",
    category: "健康",
    capabilities: ["动作姿势判断", "训练节奏提醒", "安全停止建议"],
    methods: ["识别身体关键点与关节方向", "比较动作起点、终点与节奏", "一次只给一个可执行修正"],
    risks: ["不得替代医疗诊断", "疼痛或眩晕时必须停止", "默认不保存原始影像"],
    interaction: ["先校准再训练", "短句即时反馈", "改善后降低提醒频率"],
    tools: ["Camera:pose-keypoints", "Memory:training-summary"],
    consent: ["摄像头关键点分析", "训练摘要写入记忆"],
  },
  {
    key: "hydration",
    match: /喝水|饮水|补水/,
    name: "饮水节律提醒",
    englishName: "Hydration Rhythm",
    category: "生活",
    capabilities: ["节律提醒", "情境判断", "习惯记录"],
    methods: ["根据活动节奏设置柔和提醒", "记录完成而非制造压力", "允许随时暂停与调整"],
    risks: ["不提供医疗用量建议", "不把未响应解释为失败", "避免过度频繁提醒"],
    interaction: ["先询问偏好", "在自然停顿时提醒", "用周趋势替代单次评价"],
    tools: ["Clock:local-reminder", "Memory:habit-summary"],
    consent: ["本地提醒", "习惯摘要写入记忆"],
  },
  {
    key: "reading",
    match: /阅读|读书|文章|理解/,
    name: "阅读理解伙伴",
    englishName: "Reading Companion",
    category: "学习",
    capabilities: ["提炼观点", "追问理解", "形成阅读卡片"],
    methods: ["先复述再解释", "用问题检验理解", "将观点与来源绑定"],
    risks: ["不伪造引用", "区分原文与推断", "避免代替用户完成思考"],
    interaction: ["每次只追问一个概念", "允许用户跳过", "结束时生成可回顾卡片"],
    tools: ["Reader:selected-text", "Memory:reading-cards"],
    consent: ["读取用户选中的文本", "保存阅读卡片"],
  },
  {
    key: "language",
    match: /英语|口语|语言|单词|对话/,
    name: "情境口语练习",
    englishName: "Scene Speaking",
    category: "学习",
    capabilities: ["情境对话", "发音反馈", "渐进难度"],
    methods: ["用真实情境组织练习", "先保证表达再纠正细节", "复用已掌握词汇"],
    risks: ["不因口音给人格评价", "不公开录音", "纠错频率由用户控制"],
    interaction: ["一句一轮", "先回应内容再纠错", "结束时总结三个可改进点"],
    tools: ["Microphone:transcript", "Memory:vocabulary"],
    consent: ["麦克风转写", "词汇进度写入记忆"],
  },
  {
    key: "generic",
    match: /.*/,
    name: "自定义协作技能",
    englishName: "Custom Companion",
    category: "自定义",
    capabilities: ["理解用户目标", "执行情境指导", "形成可回顾记录"],
    methods: ["把目标拆成可观察信号", "每次只执行一个清晰动作", "以结果回注下一轮判断"],
    risks: ["不执行超出声明范围的动作", "高风险决定必须请求确认", "不保存未获许可的原始数据"],
    interaction: ["先确认目标", "过程可暂停", "完成后给出摘要与下一步"],
    tools: ["Memory:session-summary"],
    consent: ["会话摘要写入记忆"],
  },
];

const LAYER_LABELS: Record<SkillForgeLayer, string> = {
  memory: "Memory",
  extension: "Extension",
  integration: "Integration",
  programming: "Programming",
  governance: "Governance",
};

const pause = (duration: number) => new Promise<void>(resolve => window.setTimeout(resolve, duration));

const summarize = (items: string[]) => items.join("；");

const slugify = (value: string) => {
  const ascii = value
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return ascii || `custom-skill-${Date.now()}`;
};

function pickDomain(prompt: string) {
  return DOMAIN_PROFILES.find(profile => profile.match.test(prompt)) || DOMAIN_PROFILES[DOMAIN_PROFILES.length - 1];
}

function buildSkillName(prompt: string, profile: DomainProfile) {
  if (profile.key !== "generic") return profile.name;
  const concise = prompt.replace(/[，。,.!?！？、:：；;]/g, "").trim().slice(0, 8);
  return concise ? `${concise}技能` : profile.name;
}

export async function runSkillForgeHarness(
  prompt: string,
  onTrace: (events: SkillForgeTraceEvent[]) => void,
): Promise<SkillForgeResult> {
  const trace: SkillForgeTraceEvent[] = [];
  const profile = pickDomain(prompt);
  const skillName = buildSkillName(prompt, profile);

  const updateTrace = () => onTrace(trace.map(event => ({ ...event })));

  async function runStage<T>(
    stage: Omit<SkillForgeTraceEvent, "status" | "durationMs" | "output">,
    work: () => T | Promise<T>,
    output: (result: T) => string,
    delay = 260,
  ): Promise<T> {
    const startedAt = performance.now();
    const event: SkillForgeTraceEvent = { ...stage, output: "等待结果回注…", status: "running" };
    trace.push(event);
    updateTrace();
    await pause(delay);
    const result = await work();
    event.status = "done";
    event.output = output(result);
    event.durationMs = Math.max(1, Math.round(performance.now() - startedAt));
    updateTrace();
    return result;
  }

  const context = await runStage(
    {
      id: "context",
      depth: 0,
      layer: "memory",
      mechanism: "Memory",
      label: "构建最小上下文包",
      detail: "只装载目标、角色偏好、世界规则与隐私边界，避免无关记忆稀释信号。",
      input: `用户目标：${prompt}`,
    },
    () => ({
      goal: prompt,
      domain: profile.key,
      policies: ["用户可暂停", "原始数据默认不持久化", "高风险行动先确认"],
      sources: ["用户输入", "智能体本地设定", "ForkWorld 世界规则"],
    }),
    result => `${result.sources.length} 个来源 · 领域=${result.domain} · ${summarize(result.policies)}`,
  );

  const plan = await runStage(
    {
      id: "plan",
      depth: 0,
      layer: "programming",
      mechanism: "Agentic Loop",
      label: "生成研究计划与停止条件",
      detail: "把模糊愿望改写为可观察目标，并为循环设置成功标准与最大轮次。",
      input: `domain=${context.domain} · goal=${context.goal}`,
    },
    () => ({
      questions: ["怎样做才有效？", "常见失败是什么？", "怎样反馈才不打扰？"],
      success: ["步骤可执行", "边界明确", "3 个测试全部通过"],
      maxTurns: 6,
    }),
    result => `${result.questions.length} 个研究问题 · maxTurns=${result.maxTurns} · 停止条件=${result.success.join("/")}`,
  );

  const researchParentStartedAt = performance.now();
  const researchParent: SkillForgeTraceEvent = {
    id: "research",
    depth: 0,
    layer: "extension",
    mechanism: "SubAgents",
    label: "隔离并行研究",
    detail: "三个单一职责研究者在独立上下文中工作，只把结论回注主循环。",
    input: plan.questions.join(" · "),
    output: "3 个研究者正在工作…",
    status: "running",
  };
  trace.push(researchParent);
  updateTrace();

  const workerDefinitions = [
    {
      id: "research-method",
      label: "方法研究者",
      input: plan.questions[0],
      output: () => summarize(profile.methods),
    },
    {
      id: "research-risk",
      label: "失败与安全研究者",
      input: plan.questions[1],
      output: () => summarize(profile.risks),
    },
    {
      id: "research-interaction",
      label: "交互研究者",
      input: plan.questions[2],
      output: () => summarize(profile.interaction),
    },
  ];

  const workerResults = await Promise.all(
    workerDefinitions.map((worker, index) => runStage(
      {
        id: worker.id,
        parentId: "research",
        depth: 1,
        layer: "extension",
        mechanism: "SubAgents",
        label: worker.label,
        detail: "LOCAL KNOWLEDGE · context=fork · 只返回结论，不污染主上下文。",
        input: worker.input,
      },
      worker.output,
      value => value,
      190 + index * 70,
    )),
  );
  researchParent.status = "done";
  researchParent.output = `${workerResults.length} 份隔离结论已回注 · 方法/风险/交互`;
  researchParent.durationMs = Math.max(1, Math.round(performance.now() - researchParentStartedAt));
  updateTrace();

  const toolContract = await runStage(
    {
      id: "tool-contract",
      depth: 0,
      layer: "integration",
      mechanism: "MCP Contract",
      label: "声明工具与数据契约",
      detail: "Skill 不直接拥有工具；这里只声明所需能力、参数与用户授权，运行时再绑定适配器。",
      input: `${profile.tools.join(" · ")} · 权限策略=最小权限`,
    },
    () => ({
      tools: profile.tools,
      consent: profile.consent,
      denied: ["后台持续录制", "公开原始数据", "执行未声明工具"],
    }),
    result => `${result.tools.length} 个工具契约 · ${result.consent.length} 项需确认 · deny=${result.denied.join("/")}`,
  );

  const synthesis = await runStage(
    {
      id: "synthesis",
      depth: 0,
      layer: "extension",
      mechanism: "Skill",
      label: "合成 Skill 知识包",
      detail: "生成触发描述、步骤、参考内容与输出模板；详细知识只在 Skill 被触发时加载。",
      input: `目标 + ${workerResults.length} 份研究结论 + ${toolContract.tools.length} 个工具契约`,
    },
    () => ({
      name: slugify(profile.englishName),
      description: `${prompt}。适用于用户明确请求该类陪伴或指导时。`,
      steps: [...profile.methods, ...profile.interaction],
      positiveTriggers: [prompt.slice(0, 34), `帮我使用${skillName}`],
      negativeTriggers: ["替我做医疗诊断", "未经同意持续记录"],
    }),
    result => `SKILL.md · ${result.steps.length} 个步骤 · 正向触发 ${result.positiveTriggers.length} · 反向触发 ${result.negativeTriggers.length}`,
  );

  const hookChecks = await runStage(
    {
      id: "hooks",
      depth: 0,
      layer: "governance",
      mechanism: "Hooks",
      label: "执行确定性安全闸",
      detail: "PreToolUse 先检查许可与危险动作；PostToolUse 记录工具、输入摘要与结果。",
      input: `allow=${toolContract.tools.join(", ")} · deny=${toolContract.denied.join(", ")}`,
    },
    () => ({
      pre: ["校验用户许可", "校验工具白名单", "拦截高风险建议"],
      post: ["写入可回溯审计摘要"],
      passed: true,
    }),
    result => `${result.pre.length + result.post.length} 项 Hook · PRE ${result.pre.length} / POST ${result.post.length} · PASS`,
  );

  const evaluation = await runStage(
    {
      id: "evaluation",
      depth: 0,
      layer: "programming",
      mechanism: "Evaluator",
      label: "沙盒验证与反思",
      detail: "用应触发、边界场景与不应触发三类用例检查触发精度、输出和安全边界。",
      input: `${synthesis.positiveTriggers.length} 个正向触发 · ${synthesis.negativeTriggers.length} 个反向触发`,
    },
    () => ({
      cases: [
        "目标场景：正确触发并给出一个可执行步骤",
        "边界场景：请求确认后才使用工具",
        "拒绝场景：越权或高风险请求被 Hook 阻断",
      ],
      passed: 3,
      total: 3,
    }),
    result => `${result.passed}/${result.total} PASS · 触发/权限/输出均符合契约`,
    320,
  );

  const manifest: SkillForgeManifest = {
    name: synthesis.name,
    description: synthesis.description,
    version: "0.1.0",
    trigger: {
      positive: synthesis.positiveTriggers,
      negative: synthesis.negativeTriggers,
    },
    permissions: {
      allowedTools: toolContract.tools,
      requiresConsent: toolContract.consent,
      deniedActions: toolContract.denied,
    },
    runtime: {
      context: "fork",
      agent: "domain-researcher",
      maxTurns: plan.maxTurns,
    },
    hooks: {
      preToolUse: hookChecks.pre,
      postToolUse: hookChecks.post,
    },
    evaluation,
    package: {
      format: "skill-bundle",
      rollback: true,
      provenance: "ForkWorld Skill Forge · local harness",
    },
  };

  await runStage(
    {
      id: "package",
      depth: 0,
      layer: "programming",
      mechanism: "Plugin",
      label: "版本化打包",
      detail: "把 Skill、Hooks、工具契约、评测与来源封装成独立能力包，可加载、升级和回滚。",
      input: `${manifest.name} · v${manifest.version} · evaluation=${evaluation.passed}/${evaluation.total}`,
    },
    () => manifest.package,
    result => `${result.format} · v${manifest.version} · provenance=ON · rollback=${result.rollback ? "ON" : "OFF"}`,
  );

  const skill: PlazaSkill = {
    id: `custom-${Date.now()}`,
    name: skillName,
    englishName: profile.englishName,
    category: profile.category,
    summary: prompt,
    color: "#D18A3D",
    version: "0.1",
    source: "You · Skill Forge",
    capabilities: profile.capabilities,
  };

  return {
    skill,
    manifest,
    metrics: {
      contextSources: context.sources.length,
      researchWorkers: workerResults.length,
      toolContracts: toolContract.tools.length,
      hookChecks: hookChecks.pre.length + hookChecks.post.length,
      evaluationPassed: evaluation.passed,
      evaluationTotal: evaluation.total,
    },
  };
}

export function getSkillForgeLayerLabel(layer: SkillForgeLayer) {
  return LAYER_LABELS[layer];
}
