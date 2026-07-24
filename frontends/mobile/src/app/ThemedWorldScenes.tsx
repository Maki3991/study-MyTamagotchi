import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Cog,
  Dumbbell,
  Globe,
  GraduationCap,
  Hammer,
  Package,
  Plus,
  Radio,
  Route,
  Sparkles,
  X,
} from "lucide-react";
import { useWorldEvolution } from "./useWorldEvolution";

export type ThemedWorldKey = "fitness" | "learning" | "maker";

export type ThemedWorldResident = {
  id: string;
  name: string;
  role: string;
  color: string;
  art: ReactNode;
  recordSourceId?: string;
  featured?: boolean;
  visitor?: boolean;
};

type TopicLine = {
  speakerId: string;
  topic: string;
  text: string;
};

type LearningRecord = {
  title: string;
  text: string;
  meta: string;
};

export type ThemedWorldDecoration = {
  id: number;
  label: string;
  x: number;
  y: number;
  art: ReactNode;
  preset?: boolean;
  scale?: number;
};

export type ThemedWorldConfig = {
  id: ThemedWorldKey;
  worldId: string;
  name: string;
  chineseName: string;
  buildingName: string;
  buildingKind: "gym" | "school" | "workshop";
  description: string;
  accent: string;
  secondary: string;
  paper: string;
  topics: string[];
  dialogue: TopicLine[];
  learningRecords: LearningRecord[];
};

export const THEMED_WORLDS: Record<ThemedWorldKey, ThemedWorldConfig> = {
  fitness: {
    id: "fitness",
    worldId: "world-vitality-gym",
    name: "Vitality Gym Town",
    chineseName: "活力健身世界",
    buildingName: "Pulse Gym",
    buildingKind: "gym",
    description: "居民围绕训练、恢复、身体觉察与运动安全交换经验。",
    accent: "#E8634A",
    secondary: "#6B9E7A",
    paper: "#F5F0E8",
    topics: ["动作质量", "训练节奏", "恢复补水"],
    dialogue: [
      { speakerId: "miko", topic: "动作质量", text: "今天先把深蹲拆成慢下、停住、站起三拍。稳定比次数重要。" },
      { speakerId: "beat", topic: "训练节奏", text: "我来把休息间隔播成节拍，别急着抢下一组。" },
      { speakerId: "sprig", topic: "身体觉察", text: "如果关节感到刺痛就停下，酸和痛不是同一种信号。" },
      { speakerId: "tock", topic: "恢复补水", text: "完成一组先补水，也记得等呼吸恢复，再开始下一轮。" },
    ],
    learningRecords: [
      { title: "建立动作基线", text: "记录活动度、呼吸和稳定性，先知道身体今天从哪里开始。", meta: "观察 → 记录" },
      { title: "掌握训练节奏", text: "把动作、休息和补水排成能够长期坚持的循环。", meta: "练习 → 反馈" },
      { title: "识别身体信号", text: "区分疲劳、酸胀和疼痛，并建立及时停止的安全规则。", meta: "辨别 → 调整" },
      { title: "形成共同训练守则", text: "居民把有效经验整理成每个人都能使用的训练 Skill。", meta: "验证 → 共享" },
    ],
  },
  learning: {
    id: "learning",
    worldId: "world-open-school",
    name: "Learning Commons",
    chineseName: "学习教育世界",
    buildingName: "Open School",
    buildingKind: "school",
    description: "居民在学校里讨论学习方法、教育公平与如何把知识教给别人。",
    accent: "#4A7FA5",
    secondary: "#D4A800",
    paper: "#F2F4ED",
    topics: ["学习方法", "同伴教学", "教育公平"],
    dialogue: [
      { speakerId: "atlas", topic: "学习方法", text: "先画出你的思考路径，我们再一起找到真正卡住的那一格。" },
      { speakerId: "honey", topic: "同伴教学", text: "每个人负责讲懂一个小问题，最后把知识拼成完整地图。" },
      { speakerId: "puck", topic: "教育公平", text: "不敢举手的人也应该被听见，我可以替大家递送匿名问题。" },
      { speakerId: "ember", topic: "实验学习", text: "真正学会的标志，是能亲手验证，再换一种方式讲给别人听。" },
    ],
    learningRecords: [
      { title: "画出问题地图", text: "先标记已经理解的部分，再找到知识地图上的空白格。", meta: "提问 → 定位" },
      { title: "拆分学习任务", text: "把大问题拆成可以独立验证的小问题，逐个建立连接。", meta: "拆解 → 练习" },
      { title: "完成同伴教学", text: "每位居民用自己的语言讲一次，让沉默的问题也能被看见。", meta: "表达 → 互评" },
      { title: "沉淀开放课程", text: "把经过验证的方法整理成可访问、可修订的公共课程。", meta: "复盘 → 开放" },
    ],
  },
  maker: {
    id: "maker",
    worldId: "world-maker-hall",
    name: "Maker Harbor",
    chineseName: "创造协作世界",
    buildingName: "Maker Hall",
    buildingKind: "workshop",
    description: "居民围绕一座创想工坊讨论设计、修复、材料循环与新工具。",
    accent: "#6D6884",
    secondary: "#E88752",
    paper: "#EEF0F4",
    topics: ["发明设计", "修复维护", "材料循环"],
    dialogue: [
      { speakerId: "corvus", topic: "问题记录", text: "先记录故障前后的异响，再决定要不要把那块零件拆开。" },
      { speakerId: "ink", topic: "工具安全", text: "新工具先在隔离台验证，别让未知的装置越过安全边界。" },
      { speakerId: "noct", topic: "原型测试", text: "设计、试做、观察、修改——黑夜最适合看见微小的偏差。" },
      { speakerId: "moss", topic: "材料循环", text: "能修好的东西先不要替换，旧材料会告诉我们下一件作品的形状。" },
    ],
    learningRecords: [
      { title: "记录故障现场", text: "保存异响、磨损和操作顺序，避免只记住最后的结果。", meta: "观察 → 留档" },
      { title: "制作可回滚原型", text: "先验证一个关键假设，让失败不会破坏原有工具。", meta: "设计 → 试做" },
      { title: "公开修复过程", text: "居民共同检查工具安全、材料来源和替换成本。", meta: "修复 → 审核" },
      { title: "建立材料循环", text: "把旧零件送回工坊，成为下一次发明的公共资源。", meta: "回收 → 再创造" },
    ],
  },
};

type ResidentMotion = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  turnAt: number;
  homeX?: number;
  homeY?: number;
};

const SAFE_START_FALLBACKS = [
  { x: 0.13, y: 0.36 },
  { x: 0.87, y: 0.43 },
  { x: 0.28, y: 0.84 },
  { x: 0.72, y: 0.84 },
  { x: 0.12, y: 0.67 },
  { x: 0.88, y: 0.23 },
  { x: 0.5, y: 0.86 },
  { x: 0.5, y: 0.12 },
];

const VISITOR_STARTS = [
  { x: 0.78, y: 0.79 },
  { x: 0.88, y: 0.7 },
];

const SCENE_SCATTER = [
  { kind: "flower", x: 7, y: 18, scale: 0.9, rotate: -8 },
  { kind: "grass", x: 20, y: 13, scale: 0.8, rotate: 4 },
  { kind: "pebble", x: 35, y: 12, scale: 0.8, rotate: -5 },
  { kind: "flower", x: 89, y: 17, scale: 0.75, rotate: 7 },
  { kind: "grass", x: 79, y: 12, scale: 0.9, rotate: -4 },
  { kind: "flower", x: 13, y: 48, scale: 0.8, rotate: 3 },
  { kind: "grass", x: 27, y: 57, scale: 1, rotate: -7 },
  { kind: "pebble", x: 83, y: 49, scale: 0.9, rotate: 5 },
  { kind: "grass", x: 92, y: 56, scale: 0.8, rotate: -3 },
  { kind: "flower", x: 7, y: 82, scale: 0.75, rotate: 6 },
  { kind: "pebble", x: 20, y: 88, scale: 0.8, rotate: -4 },
  { kind: "grass", x: 42, y: 86, scale: 0.9, rotate: 5 },
  { kind: "flower", x: 58, y: 88, scale: 0.7, rotate: -5 },
  { kind: "grass", x: 79, y: 86, scale: 0.85, rotate: 4 },
  { kind: "flower", x: 93, y: 82, scale: 0.8, rotate: -7 },
] as const;

function createRandomResidentMotions(residents: ThemedWorldResident[]): ResidentMotion[] {
  const count = residents.length;
  const points: { x: number; y: number }[] = [];
  const minimumDistance = count > 6 ? 0.105 : 0.135;
  const now = performance.now();
  let visitorIndex = 0;

  return Array.from({ length: count }, (_, index) => {
    const visitor = residents[index]?.visitor;
    let point = visitor
      ? VISITOR_STARTS[visitorIndex++ % VISITOR_STARTS.length]
      : SAFE_START_FALLBACKS[index % SAFE_START_FALLBACKS.length];

    for (let attempt = 0; !visitor && attempt < 80; attempt += 1) {
      const candidate = {
        x: 0.09 + Math.random() * 0.82,
        y: 0.12 + Math.random() * 0.76,
      };
      const overlapsLandmark = candidate.x > 0.2
        && candidate.x < 0.8
        && candidate.y > 0.2
        && candidate.y < 0.7;
      const overlapsResident = points.some(existing => Math.hypot(
        candidate.x - existing.x,
        candidate.y - existing.y,
      ) < minimumDistance);

      if (!overlapsLandmark && !overlapsResident) {
        point = candidate;
        break;
      }
    }

    points.push(point);
    const direction = Math.random() * Math.PI * 2;
    const speed = visitor
      ? 0.017 + Math.random() * 0.005
      : 0.031 + Math.random() * 0.013;
    return {
      x: point.x,
      y: point.y,
      vx: Math.cos(direction) * speed,
      vy: Math.sin(direction) * speed,
      turnAt: now + 1800 + Math.random() * 3200,
      homeX: visitor ? point.x : undefined,
      homeY: visitor ? point.y : undefined,
    };
  });
}

function FixedBuilding({ config, compact = false }: { config: ThemedWorldConfig; compact?: boolean }) {
  const Icon = config.buildingKind === "gym"
    ? Dumbbell
    : config.buildingKind === "school"
      ? GraduationCap
      : Cog;

  return (
    <div
      className={`fixed-world-building fixed-world-building--${config.buildingKind} ${compact ? "is-compact" : ""}`}
      style={{
        "--world-accent": config.accent,
        "--world-secondary": config.secondary,
      } as CSSProperties}
      aria-label={`${config.buildingName}，${config.chineseName}的固定主题建筑`}
    >
      <span className="fixed-world-building__flag" aria-hidden="true" />
      <span className="fixed-world-building__roof" aria-hidden="true" />
      <div className="fixed-world-building__body">
        <span className="fixed-world-building__window fixed-world-building__window--left" />
        <span className="fixed-world-building__window fixed-world-building__window--right" />
        <span className="fixed-world-building__sign"><Icon size={compact ? 13 : 19} /> {config.buildingName}</span>
        <span className="fixed-world-building__door" />
      </div>
      <span className="fixed-world-building__ground" aria-hidden="true" />
    </div>
  );
}

function WorldCanvas({
  config,
  residents,
  compact = false,
  decorations = [],
  onDecorationMove,
  onDecorationRemove,
  onSpeakerChange,
  showWorldline = true,
}: {
  config: ThemedWorldConfig;
  residents: ThemedWorldResident[];
  compact?: boolean;
  decorations?: ThemedWorldDecoration[];
  onDecorationMove?: (id: number, x: number, y: number) => void;
  onDecorationRemove?: (id: number) => void;
  onSpeakerChange?: (residentId: string) => void;
  showWorldline?: boolean;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const initialMotionRef = useRef<ResidentMotion[] | null>(null);
  if (!initialMotionRef.current) {
    initialMotionRef.current = createRandomResidentMotions(residents);
  }
  const motionRef = useRef<ResidentMotion[]>(initialMotionRef.current);
  const decorationDragRef = useRef<number | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [positions, setPositions] = useState(
    initialMotionRef.current.map(({ x, y }) => ({ x, y })),
  );
  const residentKey = residents.map(resident => resident.id).join("|");

  useEffect(() => {
    if (compact) return;
    const timer = window.setInterval(
      () => setLineIndex((current) => (current + 1) % config.dialogue.length),
      4200,
    );
    return () => window.clearInterval(timer);
  }, [compact, config.dialogue.length]);

  useEffect(() => {
    const initial = createRandomResidentMotions(residents);
    motionRef.current = initial;
    setPositions(initial.map(({ x, y }) => ({ x, y })));
  }, [config.id, residentKey, residents.length]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let animationFrame = 0;
    let previousTime = performance.now();
    let lastPaint = previousTime;

    const moveResidents = (time: number) => {
      if (compact && time - previousTime < 50) {
        animationFrame = window.requestAnimationFrame(moveResidents);
        return;
      }

      const canvas = canvasRef.current;
      if (!canvas) {
        animationFrame = window.requestAnimationFrame(moveResidents);
        return;
      }

      const elapsed = Math.min((time - previousTime) / 1000, 0.06);
      previousTime = time;
      const canvasBounds = canvas.getBoundingClientRect();
      const radiusX = (compact ? 23 : 34) / Math.max(canvasBounds.width, 1);
      const radiusY = (compact ? 24 : 42) / Math.max(canvasBounds.height, 1);
      const obstacleElements = canvas.querySelectorAll<HTMLElement>(".fixed-world-building, .fixed-world-decoration");
      const obstacles = obstacleElements.length
        ? Array.from(obstacleElements).map(element => {
            const bounds = element.getBoundingClientRect();
            return {
              left: (bounds.left - canvasBounds.left) / canvasBounds.width - radiusX,
              right: (bounds.right - canvasBounds.left) / canvasBounds.width + radiusX,
              top: (bounds.top - canvasBounds.top) / canvasBounds.height - radiusY,
              bottom: (bounds.bottom - canvasBounds.top) / canvasBounds.height + radiusY,
            };
          })
        : [{ left: 0.22, right: 0.78, top: 0.22, bottom: 0.66 }];

      motionRef.current.forEach((motion, index) => {
        const resident = residents[index];
        if (resident?.featured) return;

        if (time >= motion.turnAt) {
          const speed = Math.max(0.03, Math.hypot(motion.vx, motion.vy));
          const turn = (Math.random() - 0.5) * 1.15;
          const angle = Math.atan2(motion.vy, motion.vx) + turn;
          motion.vx = Math.cos(angle) * speed;
          motion.vy = Math.sin(angle) * speed;
          motion.turnAt = time + 2400 + Math.random() * 2600;
        }

        let nextX = motion.x + motion.vx * elapsed;
        let nextY = motion.y + motion.vy * elapsed;
        const minX = resident?.visitor && motion.homeX !== undefined
          ? Math.max(radiusX, motion.homeX - 0.075)
          : radiusX;
        const maxX = resident?.visitor && motion.homeX !== undefined
          ? Math.min(1 - radiusX, motion.homeX + 0.075)
          : 1 - radiusX;
        const minY = resident?.visitor && motion.homeY !== undefined
          ? Math.max(radiusY, motion.homeY - 0.065)
          : radiusY;
        const maxY = resident?.visitor && motion.homeY !== undefined
          ? Math.min(1 - radiusY, motion.homeY + 0.065)
          : 1 - radiusY;

        if (nextX <= minX || nextX >= maxX) {
          nextX = Math.max(minX, Math.min(maxX, nextX));
          motion.vx *= -1;
        }
        if (nextY <= minY || nextY >= maxY) {
          nextY = Math.max(minY, Math.min(maxY, nextY));
          motion.vy *= -1;
        }

        obstacles.forEach(obstacle => {
          const entersObstacle = nextX > obstacle.left
            && nextX < obstacle.right
            && nextY > obstacle.top
            && nextY < obstacle.bottom;

          if (entersObstacle) {
            const exits = [
              { edge: "left", distance: Math.abs(nextX - obstacle.left) },
              { edge: "right", distance: Math.abs(obstacle.right - nextX) },
              { edge: "top", distance: Math.abs(nextY - obstacle.top) },
              { edge: "bottom", distance: Math.abs(obstacle.bottom - nextY) },
            ].sort((left, right) => left.distance - right.distance);

            switch (exits[0].edge) {
              case "left":
                nextX = obstacle.left;
                motion.vx = -Math.abs(motion.vx);
                break;
              case "right":
                nextX = obstacle.right;
                motion.vx = Math.abs(motion.vx);
                break;
              case "top":
                nextY = obstacle.top;
                motion.vy = -Math.abs(motion.vy);
                break;
              default:
                nextY = obstacle.bottom;
                motion.vy = Math.abs(motion.vy);
            }
          }
        });

        motion.x = nextX;
        motion.y = nextY;
        motionRef.current[index] = motion;
      });

      if (time - lastPaint >= (compact ? 50 : 33)) {
        lastPaint = time;
        setPositions(motionRef.current.map(({ x, y }) => ({ x, y })));
      }
      animationFrame = window.requestAnimationFrame(moveResidents);
    };

    animationFrame = window.requestAnimationFrame(moveResidents);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [compact, config.id, residentKey]);

  const activeLine = config.dialogue[lineIndex % config.dialogue.length];
  const activeResidentIndex = Math.max(
    0,
    residents.findIndex((resident) => resident.id === activeLine.speakerId),
  );
  const residentPosition = (index: number) => residents[index]?.featured
    ? { x: 0.5, y: compact ? 0.76 : 0.66 }
    : positions[index]
      || motionRef.current[index]
      || SAFE_START_FALLBACKS[index % SAFE_START_FALLBACKS.length];
  const activePosition = residentPosition(activeResidentIndex);
  const relationPartnerIndexes = [1, Math.ceil(residents.length / 2)]
    .map(offset => (activeResidentIndex + offset) % residents.length)
    .filter((index, position, indexes) => index !== activeResidentIndex && indexes.indexOf(index) === position);

  useEffect(() => {
    if (!compact) onSpeakerChange?.(activeLine.speakerId);
  }, [activeLine.speakerId, compact, onSpeakerChange]);

  const moveDecoration = (event: React.PointerEvent<HTMLButtonElement>, id: number) => {
    if (decorationDragRef.current !== id || !canvasRef.current) return;
    const bounds = canvasRef.current.getBoundingClientRect();
    const x = Math.max(7, Math.min(93, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(12, Math.min(88, ((event.clientY - bounds.top) / bounds.height) * 100));
    onDecorationMove?.(id, x, y);
  };

  return (
    <div
      ref={canvasRef}
      className={`fixed-world-canvas fixed-world-canvas--${config.id} ${compact ? "is-compact" : ""}`}
      style={{
        "--world-paper": config.paper,
        "--world-accent": config.accent,
        "--world-secondary": config.secondary,
      } as CSSProperties}
    >
      <div className="fixed-world-canvas__mark fixed-world-canvas__mark--one" aria-hidden="true" />
      <div className="fixed-world-canvas__mark fixed-world-canvas__mark--two" aria-hidden="true" />
      <div className="fixed-world-canvas__mark fixed-world-canvas__mark--three" aria-hidden="true" />
      <div className="fixed-world-scatter" aria-hidden="true">
        {SCENE_SCATTER.map((item, index) => (
          <i
            key={`${item.kind}-${index}`}
            className={`fixed-world-scatter__item is-${item.kind}`}
            style={{
              "--scatter-x": `${item.x}%`,
              "--scatter-y": `${item.y}%`,
              "--scatter-scale": item.scale,
              "--scatter-rotate": `${item.rotate}deg`,
            } as CSSProperties}
          />
        ))}
      </div>

      {!compact && showWorldline && relationPartnerIndexes.length > 0 && (
        <svg className="fixed-world-relations" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {relationPartnerIndexes.map(index => {
            const partnerPosition = residentPosition(index);
            return (
              <line
                key={residents[index].id}
                x1={activePosition.x * 100}
                y1={activePosition.y * 100}
                x2={partnerPosition.x * 100}
                y2={partnerPosition.y * 100}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
          <circle
            cx={activePosition.x * 100}
            cy={activePosition.y * 100}
            r="2.2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      <FixedBuilding config={config} compact={compact} />

      {!compact && decorations.map(decoration => (
        <button
          key={decoration.id}
          type="button"
          className={`fixed-world-decoration ${decoration.preset ? "is-preset" : ""}`}
          aria-label={decoration.preset ? `${decoration.label}，场景预置素材` : `${decoration.label}，可拖动`}
          tabIndex={decoration.preset ? -1 : 0}
          onPointerDown={decoration.preset ? undefined : event => {
            decorationDragRef.current = decoration.id;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={decoration.preset ? undefined : event => moveDecoration(event, decoration.id)}
          onPointerUp={decoration.preset ? undefined : () => {
            decorationDragRef.current = null;
          }}
          onDoubleClick={decoration.preset ? undefined : () => onDecorationRemove?.(decoration.id)}
          style={{
            "--decoration-x": `${decoration.x}%`,
            "--decoration-y": `${decoration.y}%`,
            "--decoration-scale": decoration.scale ?? 0.58,
          } as CSSProperties}
        >
          <span>{decoration.art}</span>
          <small>{decoration.label}</small>
          {!decoration.preset && (
            <i onClick={event => {
              event.stopPropagation();
              onDecorationRemove?.(decoration.id);
            }}>×</i>
          )}
        </button>
      ))}

      {residents.map((resident, index) => {
        const position = residentPosition(index);
        const isSpeaking = !compact && resident.id === activeLine.speakerId;
        return (
          <button
            type="button"
            className={`fixed-world-resident ${resident.featured ? "is-featured" : ""} ${resident.visitor ? "is-visitor" : ""} ${isSpeaking ? "is-speaking" : ""}`}
            key={resident.id}
            onClick={() => onSpeakerChange?.(resident.id)}
            style={{
              "--resident-x": `${position.x * 100}%`,
              "--resident-y": `${position.y * 100}%`,
              "--resident-color": resident.color,
              "--resident-step-delay": `${-(index % 5) * 0.24}s`,
            } as CSSProperties}
          >
            <span className="fixed-world-resident__art">{resident.art}</span>
            {!compact && (
              <span className="fixed-world-resident__identity">
                <b>{resident.name}</b>
                <small>{resident.role}</small>
              </span>
            )}
          </button>
        );
      })}

      {!compact && (
        <>
          <div
            className={`fixed-world-speech ${activePosition.x > 0.68 ? "is-right" : activePosition.x >= 0.32 ? "is-center" : ""} ${activePosition.y < 0.38 ? "is-below" : ""}`}
            key={`${config.id}-${lineIndex}`}
            style={{
              "--speech-x": `${activePosition.x * 100}%`,
              "--speech-y": `${activePosition.y * 100}%`,
            } as CSSProperties}
          >
            <span>{residents[activeResidentIndex]?.name} · {activeLine.topic}</span>
            <p>{activeLine.text}</p>
          </div>
          <div className="fixed-world-topic">
            <span><Radio size={9} /> WORLD TOPIC</span>
            <p>{config.topics.join(" · ")}</p>
          </div>
        </>
      )}
    </div>
  );
}

export function ThemedWorldPreview({
  config,
  residents,
}: {
  config: ThemedWorldConfig;
  residents: ThemedWorldResident[];
}) {
  return (
    <div
      className="themed-world-preview"
      style={{
        "--world-paper": config.paper,
        "--world-accent": config.accent,
        "--world-secondary": config.secondary,
      } as CSSProperties}
    >
      <WorldCanvas config={config} residents={residents} compact />
      <div className="themed-world-preview__meta">
        <span><Sparkles size={9} /> {config.chineseName}</span>
        <h3>{config.name}</h3>
        <p>{config.buildingName} · {config.topics.join(" / ")}</p>
        <div>
          <b>{residents.length} 位居民</b>
          <b>固定建筑</b>
        </div>
      </div>
    </div>
  );
}

function WorldRecordChain({
  config,
  resident,
  tick,
  personalityVersion,
}: {
  config: ThemedWorldConfig;
  resident: ThemedWorldResident;
  tick: number;
  personalityVersion: number;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"learning" | "memory">("learning");
  const [nodeIndex, setNodeIndex] = useState(3);
  const learningItems = config.learningRecords.map((record, index) => ({
    id: `learning-${index}`,
    label: `v${Math.max(1, personalityVersion - (3 - index))}`,
    tick: Math.max(0, tick - (3 - index) * 4),
    ...record,
  }));
  const memoryItems = config.dialogue.map((line, index) => ({
    id: `memory-${index}`,
    label: `#${Math.max(0, tick - (3 - index))}`,
    tick: Math.max(0, tick - (3 - index)),
    title: `${line.topic}讨论`,
    text: line.text,
    meta: `${config.buildingName} · 主题记忆`,
  }));
  const items = tab === "learning" ? learningItems : memoryItems;
  const activeIndex = Math.min(nodeIndex, items.length - 1);
  const active = items[activeIndex];

  useEffect(() => {
    setNodeIndex(3);
  }, [config.id, resident.id, tab]);

  return (
    <aside className={`themed-world-record ${open ? "is-open" : ""}`}>
      <button
        type="button"
        className="themed-world-record__summary"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
      >
        <span className="themed-world-record__status" />
        <span className="themed-world-record__identity">
          <b>{resident.name.toUpperCase()} · {tab === "learning" ? "SELF EVOLUTION" : "PERSONAL MEMORY"}</b>
          <small>人格 v{personalityVersion} · 第 {active.tick} 回合</small>
        </span>
        <span className="themed-world-record__current">
          <b>{active.title}</b>
          <small>{active.meta}</small>
        </span>
        {open ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
      </button>

      {open && (
        <div className="themed-world-record__body">
          <div className="themed-world-record__tabs" role="tablist" aria-label="Agent 记录链类型">
            <button type="button" role="tab" aria-selected={tab === "learning"} onClick={() => setTab("learning")}>自我学习进化链</button>
            <button type="button" role="tab" aria-selected={tab === "memory"} onClick={() => setTab("memory")}>个体记忆链</button>
          </div>
          <div className="themed-world-record__nodes">
            {items.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={activeIndex === index ? "is-active" : ""}
                onClick={() => setNodeIndex(index)}
                aria-label={`查看记录：${item.title}`}
              >
                <i>{index + 1}</i>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className="themed-world-record__detail">
            <b>{active.title}</b>
            <p>{active.text}</p>
            <span>{active.meta} · 点击场景居民可以切换记录主体</span>
          </div>
        </div>
      )}
    </aside>
  );
}

export function ThemedWorldScreen({
  config,
  residents,
  sceneControl,
  decorations = [],
  onDecorationMove,
  onDecorationRemove,
  onOpenBuild,
  onCapture,
  onBack,
  onOpenWorldline,
  onOpenVisitor,
  onOpenAgents,
}: {
  config: ThemedWorldConfig;
  residents: ThemedWorldResident[];
  sceneControl: ReactNode;
  decorations?: ThemedWorldDecoration[];
  onDecorationMove?: (id: number, x: number, y: number) => void;
  onDecorationRemove?: (id: number) => void;
  onOpenBuild: () => void;
  onCapture: () => void;
  onBack: () => void;
  onOpenWorldline: () => void;
  onOpenVisitor: () => void;
  onOpenAgents: () => void;
}) {
  const { world, error } = useWorldEvolution(3500);
  const [activeResidentId, setActiveResidentId] = useState(residents[0]?.id || "");
  const [worldlineVisible, setWorldlineVisible] = useState(true);
  const [visitorVisible, setVisitorVisible] = useState(true);
  const [learningProgressOpen, setLearningProgressOpen] = useState(false);
  const worldTopic = useMemo(() => config.topics.join(" · "), [config.topics]);
  const activeResident = residents.find(resident => resident.id === activeResidentId) || residents[0];
  const recordSource = world?.agents.find(agent => agent.id === activeResident.recordSourceId);
  const tick = world?.meta.tick || 0;
  const personalityVersion = recordSource?.personalityVersion || Math.max(1, Math.floor(tick / 4) + 1);
  const worldClock = world
    ? `${String(Math.floor(world.meta.minute / 60)).padStart(2, "0")}:${String(world.meta.minute % 60).padStart(2, "0")}`
    : "--:--";
  const learnedCount = Math.min(
    config.learningRecords.length,
    Math.max(1, world?.meta.eraNumber || 1),
  );

  return (
    <main
      className="themed-world-screen"
      style={{
        "--world-paper": config.paper,
        "--world-accent": config.accent,
        "--world-secondary": config.secondary,
      } as CSSProperties}
    >
      <div className="themed-world-screen__controls">{sceneControl}</div>
      <header className="themed-world-screen__header">
        <button type="button" className="themed-world-screen__back" onClick={onBack} aria-label="返回世界列表">
          <ChevronLeft size={17}/>
        </button>
        <div className="themed-world-screen__heading">
          <span>{config.chineseName}</span>
          <h1>{config.name}</h1>
          <p>
            {world
              ? `${worldClock} · ${world.meta.era} · 第 ${tick} 回合`
              : error
                ? "演化引擎暂时离线"
                : "正在读取文明记录…"}
          </p>
        </div>
        <div className="themed-world-screen__actions">
          <button type="button" className="themed-world-screen__build" onClick={onOpenBuild}>
            <Hammer size={12}/> 建造
          </button>
          <button type="button" className="themed-world-screen__capture" onClick={onCapture} aria-label="捕获新物件">
            <Plus size={15}/>
          </button>
        </div>
      </header>

      <section className="themed-world-screen__scene">
        <WorldCanvas
          config={config}
          residents={residents}
          decorations={decorations}
          onDecorationMove={onDecorationMove}
          onDecorationRemove={onDecorationRemove}
          onSpeakerChange={setActiveResidentId}
          showWorldline={worldlineVisible}
        />
        {worldlineVisible && (
          <WorldRecordChain
            config={config}
            resident={activeResident}
            tick={tick}
            personalityVersion={personalityVersion}
          />
        )}

        <div className="themed-world-layers">
          <b>MAP LAYERS</b>
          <div>
            <button
              type="button"
              aria-pressed={worldlineVisible}
              onClick={() => setWorldlineVisible(current => !current)}
            >
              <i className={worldlineVisible ? "is-on" : ""}/>
            </button>
            <button type="button" onClick={onOpenWorldline}>Worldline <ArrowRight size={9}/></button>
          </div>
          <div>
            <button
              type="button"
              aria-pressed={visitorVisible}
              onClick={() => setVisitorVisible(current => !current)}
            >
              <i className={visitorVisible ? "is-on" : ""}/>
            </button>
            <button type="button" onClick={onOpenVisitor}>Visitor <ArrowRight size={9}/></button>
          </div>
        </div>

        {visitorVisible && (
          <button type="button" className="themed-world-visitor" onClick={onOpenVisitor}>
            <i/>
            {config.id === "fitness"
              ? "训练观察员正在抵达"
              : config.id === "learning"
                ? "交换生正在抵达"
                : "零件信使正在抵达"}
          </button>
        )}
      </section>

      <footer className="themed-world-screen__footer">
        <button type="button" onClick={onOpenWorldline}><Route size={12} />世界线</button>
        <button type="button" onClick={onOpenVisitor}><Globe size={12} />访客</button>
        <button type="button" onClick={onOpenAgents}><Package size={12} />居民档案</button>
        <button type="button" className="themed-world-screen__progress" onClick={() => setLearningProgressOpen(true)}>
          <BookOpen size={11}/>
          <span>学习 {learnedCount}/{config.learningRecords.length} · {worldTopic}</span>
          <ArrowRight size={10}/>
        </button>
      </footer>

      {learningProgressOpen && (
        <div className="themed-learning-progress" onClick={() => setLearningProgressOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label={`${config.chineseName}学习进度`}
            onClick={event => event.stopPropagation()}
          >
            <header>
              <div>
                <span>THEME KNOWLEDGE</span>
                <h2>主题学习进度</h2>
                <p>{config.chineseName} · {config.buildingName}</p>
              </div>
              <button type="button" onClick={() => setLearningProgressOpen(false)} aria-label="关闭学习进度">
                <X size={16}/>
              </button>
            </header>

            <div className="themed-learning-progress__summary">
              <div>
                <b>{learnedCount}/{config.learningRecords.length}</b>
                <span>项主题知识已形成</span>
              </div>
              <div className="themed-learning-progress__bar">
                <i style={{ width: `${(learnedCount / config.learningRecords.length) * 100}%` }}/>
              </div>
              <p>来自场景对话、学习记录链和第 {tick} 回合的共同经验。</p>
            </div>

            <div className="themed-learning-progress__list">
              {config.learningRecords.map((record, index) => {
                const learned = index < learnedCount;
                return (
                  <article className={learned ? "is-learned" : ""} key={record.title}>
                    <i>{learned ? <Check size={11}/> : index + 1}</i>
                    <div>
                      <span>{learned ? "已学习" : "学习中"} · {record.meta}</span>
                      <h3>{record.title}</h3>
                      <p>{record.text}</p>
                    </div>
                  </article>
                );
              })}
            </div>

            <footer>
              <span><Bot size={11}/>{residents.map(resident => resident.name).join(" · ")}</span>
              <button type="button" onClick={() => setLearningProgressOpen(false)}>返回场景</button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
