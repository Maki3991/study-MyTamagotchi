import { useMemo } from 'react'
import { motion } from 'motion/react'
import type { AgentSummary } from '../types'

// 依 agent id 產生穩定的初始位置
function seeded(id: number, salt: number) {
  const x = Math.sin(id * 9301 + salt * 49297) * 233280
  return x - Math.floor(x)
}

function Cloud({ left, top, delay }: { left: string; top: string; delay: number }) {
  return (
    <motion.div
      className="absolute text-4xl opacity-90"
      style={{ left, top }}
      animate={{ x: [0, 30, 0] }}
      transition={{ duration: 18, repeat: Infinity, delay }}
    >
      ☁️
    </motion.div>
  )
}

export interface SceneProps {
  agents: AgentSummary[]
  bubbles: Record<number, string>
  onAgentClick: (a: AgentSummary) => void
  showOwner?: boolean
  ground?: 'grass' | 'plaza'
}

export default function Scene({ agents, bubbles, onAgentClick, showOwner, ground = 'grass' }: SceneProps) {
  const positions = useMemo(
    () =>
      Object.fromEntries(
        agents.map((a) => [a.id, { x: 8 + seeded(a.id, 1) * 70, y: 46 + seeded(a.id, 2) * 26 }]),
      ) as Record<number, { x: number; y: number }>,
    [agents],
  )

  return (
    <div className="relative h-full w-full overflow-hidden scanlines">
      {/* 天空與地面 */}
      <div className="absolute inset-0 bg-sky" />
      <div
        className={`absolute inset-x-0 bottom-0 h-[55%] border-t-4 border-ink ${
          ground === 'grass' ? 'bg-grass' : 'bg-[#e8c97a]'
        }`}
        style={{
          backgroundImage:
            ground === 'grass'
              ? 'radial-gradient(circle at 20% 30%, #6ab545 6%, transparent 6%), radial-gradient(circle at 70% 60%, #6ab545 5%, transparent 5%), radial-gradient(circle at 45% 80%, #6ab545 7%, transparent 7%)'
              : 'repeating-linear-gradient(90deg, transparent 0 38px, rgb(0 0 0 / 0.08) 38px 40px), repeating-linear-gradient(0deg, transparent 0 38px, rgb(0 0 0 / 0.08) 38px 40px)',
          backgroundSize: ground === 'grass' ? '120px 120px' : undefined,
        }}
      />
      <div className="absolute text-5xl" style={{ left: '78%', top: '6%' }}>🌞</div>
      <Cloud left="10%" top="8%" delay={0} />
      <Cloud left="55%" top="16%" delay={4} />
      {ground === 'grass' ? (
        <>
          <div className="absolute text-5xl" style={{ left: '6%', top: '38%' }}>🌳</div>
          <div className="absolute text-4xl" style={{ left: '85%', top: '46%' }}>🌷</div>
        </>
      ) : (
        <>
          <div className="absolute text-5xl" style={{ left: '6%', top: '38%' }}>⛲</div>
          <div className="absolute text-4xl" style={{ left: '84%', top: '44%' }}>🏮</div>
        </>
      )}

      {/* agents */}
      {agents.map((a) => {
        const p = positions[a.id]
        const bubble = bubbles[a.id]
        return (
          <motion.div
            key={a.id}
            className="absolute z-10 flex flex-col items-center"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            animate={{ x: [0, 18, -12, 0], y: [0, -6, 4, 0] }}
            transition={{ duration: 7 + (a.id % 5), repeat: Infinity, ease: 'easeInOut' }}
          >
            {bubble && (
              <div className="bubble mb-3 max-w-44 px-2 py-1 text-[11px] leading-snug">
                {bubble}
              </div>
            )}
            <motion.button
              className="sprite text-4xl"
              onClick={() => onAgentClick(a)}
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            >
              {a.emoji}
            </motion.button>
            <div className="mt-1 bg-ink px-1.5 py-0.5 text-[10px] text-cream">
              {a.name}
              {showOwner && <span className="opacity-70">·{a.owner_name}</span>}
            </div>
          </motion.div>
        )
      })}

      {agents.length === 0 && (
        <div className="absolute inset-0 z-10 flex items-center justify-center">
          <div className="pixel-border bg-cream px-4 py-3 text-sm text-ink">这里空空的……</div>
        </div>
      )}
    </div>
  )
}
