import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen, ChevronRight, CirclePause, CirclePlay, Clock3, HeartHandshake,
  History, Leaf, RefreshCw, RotateCcw, Sparkles, Users, Wifi,
} from "lucide-react";
import { worldApi, type WorldAgent, type WorldState } from "./worldApi";

const INK = "#1C1911";
const PAPER = "#F5F0E8";
const CARD = "#FAF6EF";
const MUTED = "#7A7468";
const CORAL = "#E8634A";
const GREEN = "#6B9E7A";
const BLUE = "#4A7FA5";
const YELLOW = "#D4A800";

const EVOLUTION_PHASES = ["生存", "习俗", "制度", "多元", "传承"];
const STANCE_STYLE = {
  propose: { label: "提出", color: CORAL },
  question: { label: "质疑", color: YELLOW },
  support: { label: "扩展", color: BLUE },
  mediate: { label: "调停", color: GREEN },
} as const;
const AGENT_GOAL_ZH: Record<string, string> = {
  miko: "让咖啡馆成为每一段微小记忆都值得被保存的地方。",
  shutter: "建立一份记得原因、而不只记录结果的档案。",
  nana: "让城镇把休息也视为文明进步的一部分。",
  folio: "建立一份会随着城镇变化而持续更新的生活索引。",
  luma: "为每一个不确定的夜晚标出安全道路。",
  beat: "把街区彼此冲突的声音编成一段共同节奏。",
  sprig: "找出能让居民与花园共同生长的故事。",
  tock: "让日历回应集体需要，而不是服从僵硬时间。",
  keylo: "在不抹去边界的前提下，打开社区之间的通路。",
  orbit: "让殖民地里的每一件工具都能被任何人修理。",
  joypad: "把公共难题变成所有居民都能共同修改的游戏。",
  mizzle: "为那些慢到难以察觉的变化创造共同语言。",
};
const MOOD_ZH: Record<string, string> = {
  attentive: "专注",
  curious: "好奇",
  hopeful: "充满希望",
  restless: "不安",
  focused: "投入",
  tender: "温柔",
  playful: "活跃",
  reflective: "沉思",
};

function formatClock(minute: number) {
  const hours = Math.floor(minute / 60).toString().padStart(2, "0");
  const minutes = (minute % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function StatusBar() {
  return (
    <div className="flex items-center justify-between px-5 pt-3 pb-1" style={{ color: INK, fontSize: "var(--ui-font-label)" }}>
      <span>9:41</span>
      <div className="flex items-center gap-2"><Wifi size={13}/><span style={{ width: 22, height: 10, border: `1.5px solid ${INK}`, borderRadius: 7, padding: 1 }}><i style={{ display: "block", width: 13, height: 6, borderRadius: 4, background: INK }}/></span></div>
    </div>
  );
}

function PaperCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: CARD,
      border: "1.5px solid rgba(28,25,17,0.12)",
      borderRadius: 16,
      boxShadow: "0 2px 9px rgba(28,25,17,0.055)",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Metric({ name, value, color }: { name: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between" style={{ color: MUTED, fontSize: "var(--ui-font-caption)" }}>
        <span>{name}</span><span style={{ color }}>{value}</span>
      </div>
      <div style={{ height: 5, borderRadius: 4, background: "#E7E0D5", overflow: "hidden" }}>
        <div style={{ width: `${value}%`, height: "100%", borderRadius: 4, background: color, transition: "width .3s ease" }}/>
      </div>
    </div>
  );
}

function TinyAgent({ agent }: { agent: WorldAgent }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center justify-center" style={{
        width: 22, height: 22, borderRadius: 8, background: `${agent.color}18`,
        border: `1px solid ${agent.color}55`, color: agent.color, fontSize: "var(--ui-font-body)",
      }}>{agent.name.slice(0, 1)}</span>
      <span>{agent.name}</span>
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 text-center" style={{ color: MUTED }}>
      <div>
        <RefreshCw className="mx-auto mb-3 animate-spin" size={22} color={CORAL}/>
        <p style={{ fontSize: "var(--ui-font-body)", lineHeight: 1.8 }}>正在打开生活档案…</p>
      </div>
    </div>
  );
}

export function CivilizationChronicle({ sceneControl }: { sceneControl: React.ReactNode }) {
  const [world, setWorld] = useState<WorldState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (quiet = false) => {
    try {
      const next = await worldApi.getWorld();
      setWorld(next);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "世界演化引擎暂时离线");
      if (!quiet) setWorld(null);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), 4000);
    return () => window.clearInterval(timer);
  }, [load]);

  const act = useCallback(async (operation: () => Promise<WorldState>) => {
    if (busy) return;
    setBusy(true);
    try {
      setWorld(await operation());
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "操作暂时失败");
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const latestEvent = world?.events.at(-1);
  const agentsById = useMemo(() => new Map(world?.agents.map(agent => [agent.id, agent]) || []), [world]);
  const latestReflection = useMemo(() => {
    if (!world) return null;
    return world.agents
      .flatMap(agent => agent.reflections.map(reflection => ({ agent, reflection })))
      .sort((left, right) => right.reflection.tick - left.reflection.tick)[0] || null;
  }, [world]);
  const phaseComplexity = latestEvent?.phase?.complexity || world?.meta.eraNumber || 1;

  return (
    <div className="flex h-full flex-col overflow-y-auto" style={{ background: PAPER, color: INK }}>
      <StatusBar/>
      <div className="flex justify-end px-5 pt-1">{sceneControl}</div>

      <div className="px-5 pb-4 pt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2" style={{ color: CORAL, fontSize: "var(--ui-font-caption)", letterSpacing: 1.4 }}>
              <History size={13}/> WORLD CHRONICLE
            </div>
            <h1 style={{ fontSize: "var(--ui-font-page-title)", lineHeight: 1.3, fontWeight: 700 }}>文明正在生长</h1>
            <p style={{ color: MUTED, fontSize: "var(--ui-font-caption)", lineHeight: 1.7, marginTop: 5 }}>每一次选择都会成为记忆，每一段记忆都会改变下一次选择。</p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1" style={{
            background: error ? "#E8634A12" : "#6B9E7A16",
            border: `1px solid ${error ? CORAL : GREEN}44`,
            color: error ? CORAL : GREEN,
            fontSize: "var(--ui-font-caption)",
          }}>
            <span className={world?.meta.status === "running" && !error ? "animate-pulse" : ""} style={{ width: 6, height: 6, borderRadius: 6, background: "currentColor" }}/>
            {error ? "离线" : world?.meta.status === "running" ? "演化中" : "已暂停"}
          </div>
        </div>
      </div>

      {!world ? (
        error ? (
          <div className="px-5">
            <PaperCard style={{ padding: 18, textAlign: "center" }}>
              <p style={{ color: CORAL, fontSize: "var(--ui-font-body)", lineHeight: 1.6 }}>世界演化引擎正在休眠。</p>
              <p style={{ color: MUTED, fontSize: "var(--ui-font-caption)", lineHeight: 1.7, marginTop: 7 }}>请确认本地演化服务已启动，然后重新连接。</p>
              <button onClick={() => load()} className="mt-3 rounded-xl px-4 py-2" style={{ background: INK, color: CARD, fontSize: "var(--ui-font-caption)" }}>重新连接</button>
            </PaperCard>
          </div>
        ) : <LoadingState/>
      ) : (
        <div className="flex flex-col gap-3 px-5 pb-6">
          <PaperCard style={{ padding: 14 }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p style={{ color: MUTED, fontSize: "var(--ui-font-caption)", letterSpacing: 1.2 }}>CURRENT ERA</p>
                <p style={{ fontSize: "var(--ui-font-section)", lineHeight: 1.45, marginTop: 5 }}>{world.meta.era}</p>
                <p style={{ color: GREEN, fontSize: "var(--ui-font-caption)", marginTop: 4 }}>第 {world.meta.day} 天 · {formatClock(world.meta.minute)} · 第 {world.meta.tick} 回合</p>
              </div>
              <span className="rounded-lg px-2 py-1" style={{ background: `${BLUE}12`, color: BLUE, fontSize: "var(--ui-font-caption)" }}>
                {world.meta.narrativeMode === "llm" ? "LLM 心智" : "本地心智"}
              </span>
            </div>
            <p style={{ color: MUTED, fontSize: "var(--ui-font-caption)", lineHeight: 1.7, marginTop: 10 }}>
              {world.civilization.credo === "Small objects remember; shared choices become history."
                ? "小小物件会记得；共同选择会成为历史。"
                : world.civilization.credo}
            </p>

            <div className="mt-3 rounded-xl px-2.5 py-2.5" style={{ background: "#F0EBE2" }}>
              <div className="mb-2 flex items-center justify-between" style={{ fontSize: "var(--ui-font-caption)" }}>
                <span style={{ color: CORAL }}>自我进化 · {phaseComplexity}/5</span>
                <span style={{ color: MUTED }}>{latestEvent?.phase?.focus || "生存、照料与简单共享"}</span>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {EVOLUTION_PHASES.map((phase, index) => {
                  const reached = index < phaseComplexity;
                  const current = index + 1 === phaseComplexity;
                  return (
                    <div key={phase} className="text-center">
                      <div style={{ height: 4, borderRadius: 4, background: reached ? (current ? CORAL : GREEN) : "#DCD5C9" }}/>
                      <p style={{ color: current ? CORAL : reached ? GREEN : MUTED, fontSize: "var(--ui-font-micro)", marginTop: 5 }}>{phase}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <Metric name="COHESION" value={world.civilization.metrics.cohesion} color={CORAL}/>
              <Metric name="KNOWLEDGE" value={world.civilization.metrics.knowledge} color={BLUE}/>
              <Metric name="CREATIVITY" value={world.civilization.metrics.creativity} color={YELLOW}/>
              <Metric name="CARE" value={world.civilization.metrics.stewardship} color={GREEN}/>
            </div>
          </PaperCard>

          <div className="grid grid-cols-3 gap-2">
            <button disabled={busy} onClick={() => act(world.meta.status === "running" ? worldApi.pause : worldApi.run)}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5" style={{ background: INK, color: CARD, fontSize: "var(--ui-font-caption)", opacity: busy ? 0.55 : 1 }}>
              {world.meta.status === "running" ? <CirclePause size={13}/> : <CirclePlay size={13}/>} {world.meta.status === "running" ? "暂停" : "运行"}
            </button>
            <button disabled={busy} onClick={() => act(() => worldApi.tick(1))}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5" style={{ background: `${CORAL}16`, border: `1px solid ${CORAL}50`, color: CORAL, fontSize: "var(--ui-font-caption)", opacity: busy ? 0.55 : 1 }}>
              <ChevronRight size={13}/> 下一回合
            </button>
            <button disabled={busy} onClick={() => window.confirm("确认重置全部 ForkWorld 历史与人格吗？") && act(worldApi.reset)}
              className="flex items-center justify-center gap-1.5 rounded-xl py-2.5" style={{ background: "#EAE5DA", border: "1px solid rgba(28,25,17,.1)", color: MUTED, fontSize: "var(--ui-font-caption)", opacity: busy ? 0.55 : 1 }}>
              <RotateCcw size={12}/> 重置
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p style={{ color: MUTED, fontSize: "var(--ui-font-caption)", letterSpacing: 1.1 }}>LATEST TURN</p>
            <div className="flex items-center gap-1" style={{ color: MUTED, fontSize: "var(--ui-font-caption)" }}><Clock3 size={11}/>{latestEvent ? latestEvent.location : "等待第一段历史"}</div>
          </div>

          {latestEvent ? (
            <PaperCard style={{ overflow: "hidden" }}>
              <div style={{ height: 5, background: `linear-gradient(90deg, ${CORAL}, ${YELLOW}, ${GREEN}, ${BLUE})` }}/>
              <div style={{ padding: 14 }}>
                <div className="flex items-center justify-between gap-2">
                  <span className="rounded-full px-2 py-1" style={{ background: `${CORAL}12`, color: CORAL, fontSize: "var(--ui-font-caption)" }}>{latestEvent.type.toUpperCase()}</span>
                  <span style={{ color: MUTED, fontSize: "var(--ui-font-caption)" }}>第 {latestEvent.day} 天 / 第 {latestEvent.tick} 回合</span>
                </div>
                <h2 style={{ fontSize: "var(--ui-font-section)", lineHeight: 1.45, marginTop: 9 }}>{latestEvent.title}</h2>
                <p style={{ color: MUTED, fontSize: "var(--ui-font-caption)", lineHeight: 1.75, marginTop: 7 }}>{latestEvent.summary}</p>

                <div className="mt-3 flex items-center justify-between gap-1" style={{ fontSize: "var(--ui-font-micro)" }}>
                  {["人格目标", "观点碰撞", "共同记忆", "文明规则"].map((label, index) => (
                    <div key={label} className="contents">
                      <span className="rounded-lg px-1.5 py-1" style={{ background: index === 1 ? `${CORAL}15` : "#F0EBE2", color: index === 1 ? CORAL : MUTED }}>{label}</span>
                      {index < 3 && <ChevronRight size={9} color="#B5AEA2"/>}
                    </div>
                  ))}
                </div>

                {latestEvent.action && (
                  <div className="mt-3 rounded-xl p-2.5" style={{ background: `${BLUE}0D`, border: `1px solid ${BLUE}30` }}>
                    <div className="flex items-center justify-between gap-2">
                      <span style={{ color: BLUE, fontSize: "var(--ui-font-caption)" }}>集体行动 · {latestEvent.action.type.toUpperCase()}</span>
                      <span style={{ color: MUTED, fontSize: "var(--ui-font-micro)" }}>{latestEvent.action.target}</span>
                    </div>
                    <p style={{ color: INK, fontSize: "var(--ui-font-caption)", lineHeight: 1.6, marginTop: 5 }}>{latestEvent.action.label}</p>
                  </div>
                )}

                {!!latestEvent.stances?.length && (
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {latestEvent.stances.map(stance => {
                      const agent = agentsById.get(stance.agentId);
                      const style = STANCE_STYLE[stance.kind];
                      if (!agent) return null;
                      return (
                        <div key={`${latestEvent.id}-${stance.agentId}-stance`} className="rounded-lg px-2 py-1.5" style={{ background: `${style.color}0D`, border: `1px solid ${style.color}28` }}>
                          <div className="flex items-center justify-between" style={{ fontSize: "var(--ui-font-caption)" }}>
                            <span style={{ color: agent.color }}>{agent.name}</span>
                            <span style={{ color: style.color }}>{style.label}</span>
                          </div>
                          <p className="line-clamp-2" style={{ color: MUTED, fontSize: "var(--ui-font-micro)", lineHeight: 1.5, marginTop: 3 }}>{stance.summary}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="mt-3 flex flex-col gap-2">
                  {latestEvent.dialogue.map(line => {
                    const agent = agentsById.get(line.agentId);
                    const stance = latestEvent.stances?.find(item => item.agentId === line.agentId);
                    if (!agent) return null;
                    return (
                      <div key={`${latestEvent.id}-${line.agentId}`} className="flex gap-2.5 rounded-xl p-2.5" style={{ background: `${agent.color}0C`, borderLeft: `3px solid ${agent.color}` }}>
                        <div className="shrink-0" style={{ color: agent.color, fontSize: "var(--ui-font-caption)" }}>
                          <TinyAgent agent={agent}/>
                          {stance && <p style={{ color: STANCE_STYLE[stance.kind].color, fontSize: "var(--ui-font-micro)", marginTop: 4 }}>{STANCE_STYLE[stance.kind].label}</p>}
                        </div>
                        <p style={{ color: INK, fontSize: "var(--ui-font-caption)", lineHeight: 1.65, flex: 1 }}>{line.text}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex gap-2 rounded-xl p-2.5" style={{ background: "#F0EBE2" }}>
                  <Leaf size={14} color={GREEN} className="mt-0.5 shrink-0"/>
                  <div>
                    <p style={{ color: MUTED, fontSize: "var(--ui-font-caption)", lineHeight: 1.65 }}><span style={{ color: GREEN }}>文明记录 · </span>{latestEvent.consequence}</p>
                    <p style={{ color: GREEN, fontSize: "var(--ui-font-micro)", lineHeight: 1.5, marginTop: 4 }}>写入 {latestEvent.participants.length} 个体记忆，并改变彼此的信任与下一轮选择</p>
                  </div>
                </div>
              </div>
            </PaperCard>
          ) : (
            <PaperCard style={{ padding: 18, textAlign: "center", color: MUTED, fontSize: "var(--ui-font-caption)" }}>点击“下一回合”，开始记录这个文明的历史。</PaperCard>
          )}

          <div className="grid grid-cols-2 gap-3">
            <PaperCard style={{ padding: 12 }}>
              <div className="flex items-center gap-1.5" style={{ color: CORAL, fontSize: "var(--ui-font-caption)" }}><Sparkles size={12}/> PERSONALITY DRIFT</div>
              {latestReflection ? (
                <div className="mt-2.5">
                  <p style={{ fontSize: "var(--ui-font-body)" }}><TinyAgent agent={latestReflection.agent}/></p>
                  <p style={{ color: MUTED, fontSize: "var(--ui-font-caption)", lineHeight: 1.65, marginTop: 7 }}>{latestReflection.reflection.text}</p>
                  <p style={{ color: CORAL, fontSize: "var(--ui-font-caption)", marginTop: 7 }}>人格 v{latestReflection.agent.personalityVersion}</p>
                </div>
              ) : <p style={{ color: MUTED, fontSize: "var(--ui-font-caption)", lineHeight: 1.7, marginTop: 9 }}>共同经历四个回合后，智能体会开始反思并改变人格。</p>}
            </PaperCard>

            <PaperCard style={{ padding: 12 }}>
              <div className="flex items-center gap-1.5" style={{ color: BLUE, fontSize: "var(--ui-font-caption)" }}><HeartHandshake size={12}/> CIVIC MEMORY</div>
              <div className="mt-2.5 flex flex-col gap-2">
                {world.civilization.institutions.slice(-3).map(institution => (
                  <div key={institution.id}>
                    <p style={{ fontSize: "var(--ui-font-caption)", lineHeight: 1.4 }}>{institution.name}</p>
                    <p style={{ color: MUTED, fontSize: "var(--ui-font-micro)", lineHeight: 1.55, marginTop: 3 }}>建立于第 {institution.foundedAt} 回合</p>
                  </div>
                ))}
              </div>
            </PaperCard>
          </div>

          <PaperCard style={{ padding: 12 }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5" style={{ color: GREEN, fontSize: "var(--ui-font-caption)" }}><Users size={12}/> LIVING RESIDENTS</div>
              <span style={{ color: MUTED, fontSize: "var(--ui-font-caption)" }}>{world.agents.length} 个独立心智</span>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {[...world.agents].sort((a, b) => b.lastActiveTick - a.lastActiveTick).map(agent => (
                <div key={agent.id} className="shrink-0 rounded-xl p-2" style={{ width: 92, background: `${agent.color}0D`, border: `1px solid ${agent.color}35` }}>
                  <div style={{ color: agent.color, fontSize: "var(--ui-font-caption)" }}><TinyAgent agent={agent}/></div>
                  <p className="truncate" style={{ color: MUTED, fontSize: "var(--ui-font-micro)", marginTop: 6 }}>{MOOD_ZH[agent.mood] || agent.mood} · 精力 {agent.energy}%</p>
                  <p className="line-clamp-2" style={{ color: INK, fontSize: "var(--ui-font-micro)", lineHeight: 1.5, marginTop: 5 }}>{AGENT_GOAL_ZH[agent.id] || agent.goal}</p>
                </div>
              ))}
            </div>
          </PaperCard>

          <div className="flex items-center justify-center gap-2 pb-2" style={{ color: MUTED, fontSize: "var(--ui-font-micro)" }}>
            <BookOpen size={10}/> 记忆保存在本地 · 前端与演化模拟保持解耦
          </div>
        </div>
      )}
    </div>
  );
}
