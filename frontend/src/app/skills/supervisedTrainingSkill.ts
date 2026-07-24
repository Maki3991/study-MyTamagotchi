import type { PlazaSkill } from "../plazaSkills";

export type SupervisedTrainingExercise =
  | "squats"
  | "lunges"
  | "pushups"
  | "dumbbell_shoulder_press"
  | "dumbbell_rows"
  | "bicep_curls"
  | "situps"
  | "tricep_extensions"
  | "lateral_shoulder_raises"
  | "jumping_jacks";

export type SupervisedTrainingFrame = {
  sessionId: string;
  exercise: SupervisedTrainingExercise;
  imageData: string;
};

export type SupervisedTrainingFeedback = {
  phase: string;
  repCount: number;
  statusColor: "idle" | "good" | "warn" | "alert";
  primaryCue: string;
  secondaryCue?: string;
  speakText?: string;
  errors: { code: string; cue: string; severity: number }[];
};

export type SupervisedTrainingSummary = {
  exercise: SupervisedTrainingExercise;
  repCount: number;
  durationSeconds: number;
  topMistakes: { code: string; label: string; count: number }[];
  nextFocus: string;
};

export interface SupervisedTrainingProvider {
  start(exercise: SupervisedTrainingExercise): Promise<{ sessionId: string }>;
  analyze(frame: SupervisedTrainingFrame): Promise<SupervisedTrainingFeedback>;
  stop(sessionId: string): Promise<SupervisedTrainingSummary>;
}

export const SUPERVISED_TRAINING_CONTRACT = {
  source: "lianlema-portable",
  mode: "local-first",
  stages: ["选择动作", "提取姿态关键点", "判断阶段与次数", "限频纠错", "生成训练总结"],
  supportedExercises: [
    "深蹲",
    "弓步蹲",
    "俯卧撑",
    "哑铃肩推",
    "哑铃划船",
    "二头弯举",
    "仰卧起坐",
    "肱三头屈伸",
    "侧平举",
    "开合跳",
  ],
  guarantees: [
    "动作分、次数与阶段由确定性规则或姿态模型产生",
    "同一错误连续出现后才播报，并遵守提示冷却时间",
    "原始视频默认不进入 Agent 记忆",
  ],
} as const;

export const SUPERVISED_TRAINING_SKILL: PlazaSkill = {
  id: "supervised-training",
  name: "监督训练",
  englishName: "Supervised Training",
  category: "训练",
  summary: "把本地姿态识别、动作计数、限频纠错与训练总结封装成可独立加载的监督训练能力。",
  color: "#B67C42",
  version: "1.0",
  source: "Dotti · 练了吗",
  capabilities: ["实时姿态监督", "动作次数与阶段追踪", "限频语音纠错", "训练总结"],
  featured: true,
  manual: {
    overview: "监督训练 Skill 从“练了吗”的实时教练中抽取，只保留稳定的训练会话契约。Dotti 会根据用户选择的动作读取本地姿态关键点，持续判断阶段、次数与最需要修正的问题；摄像头界面、模型实现和文字教练都可以独立替换。",
    setup: [
      "选择训练动作，把设备放在能够完整看到身体与活动范围的位置。",
      "先以无负重或低强度完成一次校准，确认光线、站位与关键关节可见。",
      "开始会话后按固定频率分析画面；结束时仅保存次数、错误摘要与下一次重点。",
    ],
    checks: [
      { title: "阶段与次数", detail: "持续判断 ready、lowering、bottom、rising 等动作阶段，只在完整动作闭环后累计次数。" },
      { title: "姿态偏差", detail: "根据当前动作检查身体排列、关节方向、动作幅度与稳定性，并按严重度排序。" },
      { title: "提示节流", detail: "同一错误连续出现后才触发语音，播报后进入冷却，避免训练中被重复打断。" },
      { title: "组末总结", detail: "结束时汇总动作次数、训练时长、最常见问题与下一组优先改进项。" },
    ],
    feedback: [
      "每次只指出当前最重要的一个问题，再给出一句可以立即执行的修正。",
      "动作改善后降低提示频率，继续安静记录阶段、次数与稳定度。",
      "无法识别完整人体时先提示调整机位，不对动作质量作武断判断。",
    ],
    safety: [
      "出现疼痛、眩晕、呼吸困难或失去平衡时立即停止训练。",
      "Skill 只提供动作观察与训练陪伴，不替代医生、康复师或真人教练诊断。",
      "负重、康复期或高风险动作应由专业人士确认后再进行。",
    ],
    privacy: "默认只在本地使用画面提取姿态关键点，不保存原始视频；进入 Agent 记忆的只有动作摘要、次数和用户主动确认的训练记录。",
  },
};
