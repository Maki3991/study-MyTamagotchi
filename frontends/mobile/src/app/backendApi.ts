// FastAPI 后端客户端：agents / plaza / skills / forge / learn
// ============================================================
// PART 1 / 第 1 部分：后端地址配置（当前第 3-10 行）
// 作用：规定本文件所有请求要发往哪个后端服务。
// ============================================================
const API_BASE = (import.meta.env.VITE_WORLD_API_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");
const API_ORIGIN = API_BASE.replace(/\/api$/, "");

/** 把后端返回的相对资源路径（如 /api/pets/xx/files/final）解析成可加载的 URL。 */
// ============================================================
// PART 2 / 第 2 部分：资源地址辅助工具（当前第 11-21 行）
// 作用：把后端返回的相对图片路径转换成浏览器可以访问的完整 URL。
// ============================================================
export function resolveApiAssetUrl(url: string): string {
  if (!url) return url;
  return url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")
    ? url
    : `${API_ORIGIN}${url}`;
}

// ============================================================
// PART 3 / 第 3 部分：共享常量与 TypeScript 数据类型（当前第 22-107 行）
// 作用：描述前后端之间交换的 JSON 数据长什么样，并提供共用常量。
// 注意：`export type` 只是编译时说明，不是浏览器运行时功能。
// ============================================================
export const ME_USER_ID = 1;

/** agent 唯一的位置：一定在自己的三个世界之一或广场。 */
export type AgentLocation = "vitality-gym-town" | "learning-commons" | "maker-harbor" | "plaza";

export const AGENT_LOCATION_LABEL: Record<AgentLocation, string> = {
  "vitality-gym-town": "活力健身世界",
  "learning-commons": "学习教育世界",
  "maker-harbor": "创造协作世界",
  "plaza": "广场",
};

export type BackendSkillRow = {
  id: number;
  agent_id: number;
  name: string;
  description: string;
  code: string;
  source: string;
  kind: string;
  def_id: string;
  manifest: string;
};

export type BackendMemory = {
  id: number;
  agent_id: number;
  kind: string;
  content: string;
  created_at: string;
};

export type BackendAgent = {
  id: number;
  owner_id: number;
  owner_name: string;
  name: string;
  image: string; // agent 外表：capture 管线生成的角色图 URL
  trait: string;
  mood: number;
  location: AgentLocation;
  profile: string; // JSON: identity 字段 + memory_digest（随互动更新）
};

export type BackendAgentDetail = BackendAgent & {
  memories: BackendMemory[];
  skills: BackendSkillRow[];
};

export type CatalogSkill = {
  id: number;
  def_id: string;
  name: string;
  emoji: string;
  category: string;
  summary: string;
  capabilities: string[];
  kind: string;
  source: string;
  runnable: boolean;
  manifest: string;
  holder: {
    id: number;
    name: string;
    image: string;
    owner_name: string;
    location: string;
  } | null;
};

export type DialogLine = { agent_id: number; name: string; image: string; text: string };

/** 图鉴模板：无主人、无记忆，复制时才在 DB 建 agent 档案。 */
export type AgentTemplateRow = {
  id: number;
  name: string;
  image: string;
  trait: string;
  description: string;
};

// ============================================================
// PART 4 / 第 4 部分：通用请求封装（当前第 108-124 行）
// 作用：统一处理 fetch、请求头、错误判断和 JSON 响应解析。
// 下面的 backendApi.* 函数都会间接调用这里。
// ============================================================
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as any)?.detail ?? `请求失败 (${res.status})`);
  }
  return res.json();
}

// ============================================================
// PART 5 / 第 5 部分：backendApi 业务函数目录（当前第 125-133 行）
// 作用：开始集中列出前端可以调用的后端业务函数。
// ============================================================
export const backendApi = {
  agents: (ownerId?: number) =>
    req<BackendAgent[]>(`/agents${ownerId != null ? `?owner_id=${ownerId}` : ""}`),
  agent: (id: number) => req<BackendAgentDetail>(`/agents/${id}`),

  // ============================================================
  // PART 6 / 第 6 部分：写入与业务动作 API（当前第 134-206 行）
  // 包括修改、聊天、派遣、日记、Plaza 学习、Skill Forge 和 Skill 执行。
  // 你要找的 backendApi.dispatch 就定义在这个对象的下面。
  // ============================================================
  patchAgent: (
    id: number,
    patch: Partial<{
      name: string;
      trait: string;
      location: AgentLocation;
      profile: Record<string, unknown>;
    }>,
  ) => req<BackendAgent>(`/agents/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  chat: (agentId: number, text: string) =>
    req<{ reply: string; mood: number }>(`/agents/${agentId}/chat`, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),
  dispatch: (agentId: number, location: AgentLocation | "home") =>
    req<BackendAgent>(`/agents/${agentId}/dispatch`, {
      method: "POST",
      body: JSON.stringify({ location }),
    }),
  plazaAgents: () => req<BackendAgent[]>("/plaza"),
  plazaConverse: () =>
    req<{ lines: DialogLine[]; learned: { learner: string; learner_id: number; teacher: string; skill: string } | null }>(
      "/plaza/converse",
      { method: "POST" },
    ),
  worldConverse: (location?: AgentLocation) =>
    req<{ lines: DialogLine[]; insights: { agent_id: number; name: string; text: string }[] }>("/world/converse", {
      method: "POST",
      body: JSON.stringify({ user_id: ME_USER_ID, location: location ?? null }),
    }),
  diary: (text: string, location?: AgentLocation) =>
    req<{ agent: BackendAgent; reply: string }>("/diary", {
      method: "POST",
      body: JSON.stringify({ user_id: ME_USER_ID, text, location: location ?? null }),
    }),
  templates: () => req<AgentTemplateRow[]>("/templates"),
  adoptTemplate: (templateId: number, name?: string) =>
    req<BackendAgent>(`/templates/${templateId}/adopt`, {
      method: "POST",
      body: JSON.stringify({ owner_id: ME_USER_ID, name: name ?? null }),
    }),
  plazaSkills: () => req<CatalogSkill[]>("/skills?location=plaza"),
  allSkills: () => req<CatalogSkill[]>("/skills"),
  learn: (skillId: number, learnerId?: number) =>
    req<{
      lines: DialogLine[];
      learner: BackendAgent;
      teacher: BackendAgent;
      skill: string;
      already_known: boolean;
    }>("/plaza/learn", {
      method: "POST",
      body: JSON.stringify({ skill_id: skillId, learner_id: learnerId ?? null }),
    }),
  forge: (prompt: string, agentId?: number) =>
    req<{
      output: string;
      skill: CatalogSkill;
      manifest: Record<string, unknown> & {
        name: string;
        emoji: string;
        def_id: string;
        category: string;
        description: string;
        capabilities: string[];
        inputs: { key: string; label: string; type: string; options?: string[] }[];
      };
      agent: BackendAgent;
    }>("/skills/forge", {
      method: "POST",
      body: JSON.stringify({ prompt, agent_id: agentId ?? null }),
    }),
  invokeSkill: (agentId: number, skillId: number, inputs: Record<string, string>) =>
    req<{ output: string; mood: number }>(`/agents/${agentId}/skills/${skillId}/invoke`, {
      method: "POST",
      body: JSON.stringify({ inputs }),
    }),
};
