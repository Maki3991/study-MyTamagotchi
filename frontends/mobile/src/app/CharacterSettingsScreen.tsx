import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, PawPrint, Save, ShieldCheck, SlidersHorizontal, Sparkles, UserRound } from "lucide-react";
import {
  WORLD_STYLE_SKILLS,
  WORLD_STYLE_SKILL_ASSETS,
  type WorldStyleSkillAssetType,
  type WorldStyleSkillCategory,
} from "./worldStyleSkills";

type CharacterDraft = {
  name: string;
  role: string;
  traits: string[];
  goal: string;
  rule: string;
  agency: number;
  empathy: number;
  curiosity: number;
};

export type CharacterStyleCategory = "dailySpirits" | WorldStyleSkillCategory;

export type DailySpiritCard = {
  id: string;
  name: string;
  role: string;
  color: string;
  art: ReactNode;
};

export type StyleAgentIdentitySeed = {
  name: string;
  role: string;
  goal: string;
};

type CharacterSettingsScreenProps = {
  dailySpirits?: DailySpiritCard[];
  initialCategory?: CharacterStyleCategory;
  initialType?: WorldStyleSkillAssetType;
  identityDrafts?: Record<string, StyleAgentIdentitySeed>;
  onEditDailySpirit?: (agentId: string) => void;
  onContinueStyleAgent?: (assetType: WorldStyleSkillAssetType, seed: StyleAgentIdentitySeed) => void;
};

const DAILY_SPIRIT_STYLE = {
  id: "dailySpirits" as const,
  label: "日常精灵",
  accent: "#E8634A",
  note: "由日常物件醒来的线条精灵",
};

const STORAGE_KEY = "forkworld-character-card-drafts-v1";
const CARDS_PER_PAGE = 4;
const TRAIT_OPTIONS = ["好奇", "谨慎", "温柔", "固执", "合群", "独立", "勇敢", "多疑"];

function defaultDrafts() {
  return Object.fromEntries(WORLD_STYLE_SKILL_ASSETS.map(asset => [asset.type, {
    name: asset.defaultName,
    role: asset.label,
    traits: asset.defaultTraits,
    goal: asset.defaultGoal,
    rule: asset.defaultRule,
    agency: asset.kind === "character" ? 72 : 58,
    empathy: asset.category === "blockcraft" ? 76 : 52,
    curiosity: asset.category === "lakeMystery" ? 88 : 70,
  }])) as Record<WorldStyleSkillAssetType, CharacterDraft>;
}

const fieldStyle: CSSProperties = {
  width: "100%", border: "1.5px solid rgba(28,25,17,.14)", borderRadius: 10,
  background: "#FCF9F3", color: "#1C1911", padding: "8px 9px",
  fontFamily: "'Fusion Pixel 10px Monospaced SC',sans-serif", fontSize: "var(--ui-font-body)", outline: "none",
};

export function CharacterSettingsScreen({
  dailySpirits = [],
  initialCategory = "dailySpirits",
  initialType,
  identityDrafts = {},
  onEditDailySpirit,
  onContinueStyleAgent,
}: CharacterSettingsScreenProps) {
  const initialAsset = WORLD_STYLE_SKILL_ASSETS.find(asset => asset.category === initialCategory);
  const [category, setCategory] = useState<CharacterStyleCategory>(initialCategory);
  const [selectedType, setSelectedType] = useState<WorldStyleSkillAssetType>(
    initialType || initialAsset?.type || "blockCartographer",
  );
  const [drafts, setDrafts] = useState(defaultDrafts);
  const [saved, setSaved] = useState(false);
  const [cardPage, setCardPage] = useState(0);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Partial<Record<WorldStyleSkillAssetType, CharacterDraft>>;
        setDrafts(current => Object.fromEntries(
          WORLD_STYLE_SKILL_ASSETS.map(asset => {
            const legacy = parsed[asset.type];
            return [asset.type, {
              ...current[asset.type],
              ...legacy,
              role: legacy?.role === asset.defaultRole ? asset.label : legacy?.role || current[asset.type].role,
            }];
          }),
        ) as Record<WorldStyleSkillAssetType, CharacterDraft>);
      }
    } catch {
      // The editor still works when device storage is unavailable.
    }
  }, []);

  useEffect(() => {
    setDrafts(current => Object.fromEntries(
      Object.entries(current).map(([type, cardDraft]) => {
        const identityDraft = identityDrafts[type];
        return [type, identityDraft ? {
          ...cardDraft,
          name: identityDraft.name,
          role: identityDraft.role,
          goal: identityDraft.goal,
        } : cardDraft];
      }),
    ) as Record<WorldStyleSkillAssetType, CharacterDraft>);
  }, [identityDrafts]);

  const assets = useMemo(
    () => WORLD_STYLE_SKILL_ASSETS.filter(asset => asset.category === category),
    [category],
  );
  const selectedAsset = WORLD_STYLE_SKILL_ASSETS.find(asset => asset.type === selectedType)
    || assets[0]
    || WORLD_STYLE_SKILL_ASSETS[0];
  const draft = drafts[selectedAsset.type];
  const skill = category === "dailySpirits"
    ? DAILY_SPIRIT_STYLE
    : WORLD_STYLE_SKILLS.find(item => item.id === category) || WORLD_STYLE_SKILLS[0];
  const accent = skill.accent;
  const cardPageCount = Math.max(1, Math.ceil(assets.length / CARDS_PER_PAGE));
  const visibleAssets = assets.slice(cardPage * CARDS_PER_PAGE, (cardPage + 1) * CARDS_PER_PAGE);

  const chooseCategory = (next: CharacterStyleCategory) => {
    const first = WORLD_STYLE_SKILL_ASSETS.find(asset => asset.category === next);
    setCategory(next);
    if (first) setSelectedType(first.type);
    setCardPage(0);
    setSaved(false);
  };

  const updateDraft = (patch: Partial<CharacterDraft>) => {
    setDrafts(current => ({
      ...current,
      [selectedAsset.type]: { ...current[selectedAsset.type], ...patch },
    }));
    setSaved(false);
  };

  const toggleTrait = (trait: string) => {
    const next = draft.traits.includes(trait)
      ? draft.traits.filter(item => item !== trait)
      : [...draft.traits.slice(-3), trait];
    updateDraft({ traits: next });
  };

  const saveDraft = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // Keep the in-memory draft when device storage is unavailable.
    }
    setSaved(true);
  };

  const continueToIdentity = () => {
    saveDraft();
    onContinueStyleAgent?.(selectedAsset.type, {
      name: draft.name,
      role: draft.role,
      goal: draft.goal,
    });
  };

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: "#F5F0E8", color: "#1C1911", fontFamily: "'Fusion Pixel 10px Monospaced SC',sans-serif" }}>
      <div style={{ padding: "4px 16px 26px" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p style={{ color: accent, fontSize: "var(--ui-font-caption)", letterSpacing: 1.4 }}>CHARACTER SETTING · 本地草稿</p>
            <h1 style={{ fontFamily: "Caveat,cursive", fontSize: "var(--ui-font-page-title)", lineHeight: 1.2, fontWeight: 700, marginTop: 5 }}>定义进入世界的人</h1>
            <p style={{ color: "#7A7468", fontSize: "var(--ui-font-caption)", lineHeight: 1.6, marginTop: 4 }}>皮肤决定外观；人格、目标与规则决定它如何参与文明。</p>
          </div>
          {category === "dailySpirits" ? (
            <div style={{ width: 34, height: 34, borderRadius: 11, background: `${accent}16`, border: `1px solid ${accent}38`, display: "grid", placeItems: "center", color: accent }}>
              <SlidersHorizontal size={15}/>
            </div>
          ) : (
            <button
              type="button"
              onClick={continueToIdentity}
              style={{ color: accent, fontFamily: "'Fusion Pixel 10px Monospaced SC',sans-serif", fontSize: "var(--ui-font-body)", fontWeight: 700, paddingTop: 3, whiteSpace: "nowrap" }}
            >
              下一步 →
            </button>
          )}
        </div>

        <div style={{ marginTop: 12 }}>
          <label htmlFor="character-style-select" style={{ display: "block", color: "#7A7468", fontSize: "var(--ui-font-micro)", letterSpacing: .8, marginBottom: 5 }}>STYLE SKILL</label>
          <div className="relative">
            <select
              id="character-style-select"
              aria-label="选择角色风格"
              value={category}
              onChange={event => chooseCategory(event.target.value as CharacterStyleCategory)}
              style={{
                appearance: "none", WebkitAppearance: "none", width: "100%",
                borderRadius: 12, padding: "9px 38px 9px 11px", cursor: "pointer",
                background: `${accent}12`, border: `1.8px solid ${accent}`,
                color: accent, outline: "none",
                fontFamily: "'Fusion Pixel 10px Monospaced SC',sans-serif", fontSize: "var(--ui-font-label)", fontWeight: 700,
              }}
            >
              <option value={DAILY_SPIRIT_STYLE.id}>{DAILY_SPIRIT_STYLE.label}</option>
              {WORLD_STYLE_SKILLS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <ChevronDown aria-hidden="true" size={16} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: accent, pointerEvents: "none" }}/>
          </div>
        </div>

        {category === "dailySpirits" ? (
          <section style={{ marginTop: 12 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <div>
                <p style={{ color: accent, fontSize: "var(--ui-font-caption)", letterSpacing: .9 }}>DAILY SPIRITS · {dailySpirits.length} 位智能体</p>
                <p style={{ color: "#7A7468", fontFamily: "'Fusion Pixel 10px Monospaced SC',sans-serif", fontSize: "var(--ui-font-caption)", marginTop: 3 }}>{DAILY_SPIRIT_STYLE.note}</p>
              </div>
              <span style={{ borderRadius: 99, padding: "4px 7px", background: `${accent}14`, color: accent, fontSize: "var(--ui-font-micro)" }}>默认</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {dailySpirits.map(spirit => (
                <button
                  key={spirit.id}
                  type="button"
                  onClick={() => onEditDailySpirit?.(spirit.id)}
                  aria-label={`Edit ${spirit.name} identity`}
                  className="overflow-hidden text-left"
                  style={{
                    borderRadius: 14,
                    background: "#FAF6EF",
                    border: "1.5px solid rgba(28,25,17,.1)",
                    boxShadow: "0 2px 7px rgba(28,25,17,.05)",
                    cursor: onEditDailySpirit ? "pointer" : "default",
                  }}
                >
                  <div style={{ height: 86, background: `${spirit.color}12`, display: "grid", placeItems: "center" }}>
                    {spirit.art}
                  </div>
                  <div style={{ padding: "8px 10px 10px" }}>
                    <p className="truncate" style={{ fontFamily: "Caveat,cursive", fontSize: "var(--ui-font-heading)", fontWeight: 700 }}>{spirit.name}</p>
                    <p className="truncate" style={{ color: spirit.color, fontFamily: "'Fusion Pixel 10px Monospaced SC',sans-serif", fontSize: "var(--ui-font-body)" }}>{spirit.role}</p>
                    <p style={{ color: "#7A7468", fontSize: "var(--ui-font-micro)", marginTop: 5 }}>点击修改 IDENTITY</p>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <>
        <div style={{ display: "grid", gridTemplateColumns: "43% 1fr", gap: 10, marginTop: 12, alignItems: "start" }}>
          <div>
            <div style={{ borderRadius: 17, padding: 8, background: category === "blockcraft" ? "#E8D5A4" : category === "pentiment" ? "#DCC9A4" : "#D2CCBC", border: `2px solid ${accent}`, boxShadow: "0 5px 16px rgba(28,25,17,.1)" }}>
              <div className="flex items-center justify-between" style={{ color: accent, fontSize: "var(--ui-font-micro)", letterSpacing: .7 }}>
                <span>{selectedAsset.kind === "character" ? "居民" : "动物"}</span><span>本地</span>
              </div>
              <div style={{ height: 156, marginTop: 7, borderRadius: 11, background: "rgba(250,246,239,.72)", border: "1px solid rgba(28,25,17,.1)", display: "grid", placeItems: "center", overflow: "hidden" }}>
                <img src={selectedAsset.src} alt={selectedAsset.alt} draggable={false} style={{ width: "94%", height: "94%", objectFit: "contain" }}/>
              </div>
              <p className="truncate" style={{ fontFamily: "Caveat,cursive", fontSize: "var(--ui-font-page-title)", fontWeight: 700, marginTop: 7 }}>{draft.name}</p>
              <p className="truncate" style={{ color: accent, fontSize: "var(--ui-font-caption)", marginTop: 2 }}>{draft.role}</p>
              <div className="grid grid-cols-3 gap-1" style={{ marginTop: 8 }}>
                {[draft.agency, draft.empathy, draft.curiosity].map((value, index) => (
                  <div key={index} style={{ borderRadius: 7, background: "rgba(250,246,239,.7)", padding: "4px 1px", textAlign: "center" }}>
                    <p style={{ color: accent, fontSize: "var(--ui-font-caption)" }}>{value}</p>
                    <p style={{ color: "#7A7468", fontSize: "var(--ui-font-micro)", marginTop: 2 }}>{["意志", "关怀", "心智"][index]}</p>
                  </div>
                ))}
              </div>
            </div>

            <label style={{ display: "block", color: "#7A7468", fontSize: "var(--ui-font-micro)", marginTop: 10 }}>名称</label>
            <input aria-label="Character name" value={draft.name} onChange={event => updateDraft({ name: event.target.value })} style={{ ...fieldStyle, marginTop: 4 }}/>
            <label style={{ display: "block", color: "#7A7468", fontSize: "var(--ui-font-micro)", marginTop: 7 }}>角色</label>
            <input aria-label="Character role" value={draft.role} onChange={event => updateDraft({ role: event.target.value })} style={{ ...fieldStyle, marginTop: 4 }}/>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p style={{ color: "#7A7468", fontSize: "var(--ui-font-caption)", letterSpacing: .8 }}>YOUR CARDS</p>
              <div className="flex items-center" style={{ gap: 4 }}>
                <button
                  type="button"
                  aria-label="上一组角色"
                  disabled={cardPageCount === 1}
                  onClick={() => setCardPage(page => (page - 1 + cardPageCount) % cardPageCount)}
                  style={{
                    width: 22, height: 22, borderRadius: 8, display: "grid", placeItems: "center",
                    border: `1px solid ${accent}55`, background: `${accent}10`, color: accent,
                    cursor: cardPageCount === 1 ? "default" : "pointer", opacity: cardPageCount === 1 ? .35 : 1,
                  }}
                >
                  <ChevronLeft size={13}/>
                </button>
                <span style={{ minWidth: 20, textAlign: "center", color: accent, fontSize: "var(--ui-font-micro)" }}>{cardPage + 1}/{cardPageCount}</span>
                <button
                  type="button"
                  aria-label="下一组角色"
                  disabled={cardPageCount === 1}
                  onClick={() => setCardPage(page => (page + 1) % cardPageCount)}
                  style={{
                    width: 22, height: 22, borderRadius: 8, display: "grid", placeItems: "center",
                    border: `1px solid ${accent}55`, background: `${accent}10`, color: accent,
                    cursor: cardPageCount === 1 ? "default" : "pointer", opacity: cardPageCount === 1 ? .35 : 1,
                  }}
                >
                  <ChevronRight size={13}/>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-7px" style={{ gap: 7, marginTop: 7 }}>
              {visibleAssets.map(asset => {
                const active = asset.type === selectedAsset.type;
                const itemDraft = drafts[asset.type];
                return (
                  <button key={asset.type} onClick={() => { setSelectedType(asset.type); setSaved(false); }} aria-label={`Edit ${asset.label}`} style={{
                    minWidth: 0, padding: 5, borderRadius: 11, cursor: "pointer", textAlign: "left",
                    background: active ? `${accent}18` : "#FAF6EF",
                    border: active ? `1.8px solid ${accent}` : "1.5px solid rgba(28,25,17,.1)",
                  }}>
                    <div style={{ height: 72, borderRadius: 8, background: "#F0EBE2", display: "grid", placeItems: "center", overflow: "hidden" }}>
                      <img src={asset.src} alt={asset.alt} draggable={false} style={{ width: "94%", height: "94%", objectFit: "contain" }}/>
                    </div>
                    <p className="truncate" style={{ fontFamily: "Caveat,cursive", color: "#1C1911", fontSize: "var(--ui-font-section)", fontWeight: 700, marginTop: 5 }}>{itemDraft.name}</p>
                    <p className="truncate" style={{ color: "#7A7468", fontSize: "var(--ui-font-micro)", marginTop: 2 }}>{asset.label}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <section style={{ marginTop: 14, borderRadius: 15, background: "#FAF6EF", border: "1.5px solid rgba(28,25,17,.1)", padding: 12 }}>
          <div className="flex items-center gap-2" style={{ color: accent }}><Sparkles size={13}/><span style={{ fontSize: "var(--ui-font-caption)", letterSpacing: .9 }}>02 · 人格</span></div>
          <div className="flex flex-wrap gap-1.5" style={{ marginTop: 10 }}>
            {TRAIT_OPTIONS.map(trait => {
              const active = draft.traits.includes(trait);
              return <button key={trait} onClick={() => toggleTrait(trait)} style={{ padding: "5px 8px", borderRadius: 99, cursor: "pointer", background: active ? `${accent}18` : "#EAE5DA", border: `1px solid ${active ? accent : "rgba(28,25,17,.08)"}`, color: active ? accent : "#7A7468", fontSize: "var(--ui-font-caption)" }}>{trait}</button>;
            })}
          </div>
          <div className="grid grid-cols-3 gap-3" style={{ marginTop: 12 }}>
            {([
              ["自主", "agency"], ["共情", "empathy"], ["探索", "curiosity"],
            ] as const).map(([label, key]) => (
              <label key={key} style={{ color: "#7A7468", fontSize: "var(--ui-font-micro)" }}>
                <span className="flex justify-between"><span>{label}</span><span style={{ color: accent }}>{draft[key]}</span></span>
                <input aria-label={label} type="range" min="0" max="100" value={draft[key]} onChange={event => updateDraft({ [key]: Number(event.target.value) })} style={{ width: "100%", accentColor: accent, marginTop: 6 }}/>
              </label>
            ))}
          </div>
        </section>

        <section style={{ marginTop: 10, borderRadius: 15, background: "#FAF6EF", border: "1.5px solid rgba(28,25,17,.1)", padding: 12 }}>
          <div className="flex items-center gap-2" style={{ color: accent }}><ShieldCheck size={13}/><span style={{ fontSize: "var(--ui-font-caption)", letterSpacing: .9 }}>03 · 世界规则</span></div>
          <label style={{ display: "block", color: "#7A7468", fontSize: "var(--ui-font-micro)", marginTop: 10 }}>长期目标</label>
          <textarea aria-label="Long-term goal" value={draft.goal} onChange={event => updateDraft({ goal: event.target.value })} rows={2} style={{ ...fieldStyle, resize: "none", marginTop: 5, lineHeight: 1.4 }}/>
          <label style={{ display: "block", color: "#7A7468", fontSize: "var(--ui-font-micro)", marginTop: 9 }}>不可违背的规则</label>
          <textarea aria-label="Non-negotiable rule" value={draft.rule} onChange={event => updateDraft({ rule: event.target.value })} rows={2} style={{ ...fieldStyle, resize: "none", marginTop: 5, lineHeight: 1.4 }}/>
        </section>

        <button onClick={saveDraft} style={{ width: "100%", marginTop: 11, border: "none", borderRadius: 13, padding: "11px 12px", cursor: "pointer", background: saved ? "#6B9E7A" : accent, color: "#FAF6EF", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: "var(--ui-font-caption)" }}>
          {saved ? <ShieldCheck size={14}/> : <Save size={14}/>} {saved ? "已保存到本地角色草稿" : "保存角色草稿"}
        </button>
        <button onClick={continueToIdentity} style={{ width: "100%", marginTop: 8, border: "none", borderRadius: 13, padding: "11px 12px", cursor: "pointer", background: "#1C1911", color: "#FAF6EF", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, fontSize: "var(--ui-font-caption)" }}>
          继续编辑 Identity <ChevronRight size={14}/>
        </button>
        <div className="flex items-center justify-center gap-2" style={{ color: "#7A7468", fontSize: "var(--ui-font-micro)", marginTop: 9 }}>
          {selectedAsset.kind === "character" ? <UserRound size={10}/> : <PawPrint size={10}/>} 下一步再连接：图片生成 → Agent 人格 → 文明运行
        </div>
          </>
        )}
      </div>
    </div>
  );
}
