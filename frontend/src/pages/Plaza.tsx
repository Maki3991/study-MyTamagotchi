import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { Home, MessagesSquare, RefreshCw, X } from 'lucide-react'
import { api } from '../api'
import { useStore } from '../store'
import AgentSheet from '../components/AgentSheet'
import type { AgentSummary } from '../types'

/* ---------- 魚骨街區佈局 ----------
 * 中央縱向主幹道，房子左右交錯掛在支路上，行數隨屋主數量動態增加。
 * 座標系：x 用容器寬度百分比，y 用內容區 px。
 */
const ROW_H = 200
const TOP_PAD = 96
const BOTTOM_PAD = 140
const SPINE = { left: 46, right: 54 } // %

const ROOFS = ['#e05d5d', '#5d8fe0', '#e0a75d', '#8f5de0', '#3dbd8a', '#e05da7']
const DECOS = ['🌻', '🏮', '🎈', '🪴', '🌵', '⭐']

interface House {
  ownerId: number
  ownerName: string
  avatar: string
  agents: AgentSummary[]
  side: 'left' | 'right'
  rowY: number       // 支路中心 y (px)
  houseX: number     // 房子中心 x (%)
  yard: { x0: number; x1: number; y0: number; y1: number } // % / px
  roof: string
  deco: string
}

function buildHouses(agents: AgentSummary[], avatarOf: (id: number) => string): House[] {
  const byOwner = new Map<number, AgentSummary[]>()
  agents.forEach((a) => {
    byOwner.set(a.owner_id, [...(byOwner.get(a.owner_id) ?? []), a])
  })
  return [...byOwner.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([ownerId, list], i) => {
      const side = i % 2 === 0 ? 'left' : 'right'
      const rowY = TOP_PAD + Math.floor(i / 2) * ROW_H + 70
      return {
        ownerId,
        ownerName: list[0].owner_name,
        avatar: avatarOf(ownerId),
        agents: list,
        side,
        rowY,
        houseX: side === 'left' ? 20 : 80,
        yard: side === 'left'
          ? { x0: 3, x1: 43, y0: rowY - 8, y1: rowY + 120 }
          : { x0: 57, x1: 97, y0: rowY - 8, y1: rowY + 120 },
        roof: ROOFS[ownerId % ROOFS.length],
        deco: DECOS[ownerId % DECOS.length],
      } as House
    })
}

function seeded(id: number, salt: number) {
  const x = Math.sin(id * 9301 + salt * 49297) * 233280
  return x - Math.floor(x)
}

/* 像素小房子（CSS 拼的），依屋主換屋頂色與門口配飾 */
function HouseSprite({ h, onClick }: { h: House; onClick: () => void }) {
  return (
    <button
      className="absolute z-10 flex -translate-x-1/2 flex-col items-center"
      style={{ left: `${h.houseX}%`, top: h.rowY - 78 }}
      onClick={onClick}
    >
      <div
        style={{
          width: 0, height: 0,
          borderLeft: '46px solid transparent',
          borderRight: '46px solid transparent',
          borderBottom: `34px solid ${h.roof}`,
          filter: 'drop-shadow(0 -3px 0 #2b2233) drop-shadow(3px 0 0 #2b2233) drop-shadow(-3px 0 0 #2b2233)',
        }}
      />
      <div className="pixel-border relative -mt-px h-[52px] w-[74px] bg-cream">
        <div className="absolute left-1.5 top-1.5 h-4 w-4 border-2 border-ink bg-sky" />
        <div className="absolute bottom-0 right-2 flex h-8 w-7 items-center justify-center border-2 border-b-0 border-ink bg-[#8a5a3b] text-sm">
          {h.avatar}
        </div>
        <div className="absolute -left-3 -bottom-1 text-sm">{h.deco}</div>
      </div>
      <div className="mt-1 bg-ink px-1.5 py-0.5 text-[10px] text-cream">{h.ownerName}的家</div>
    </button>
  )
}

export default function Plaza() {
  const { user, users, refreshAgents } = useStore()
  const navigate = useNavigate()
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [bubbles, setBubbles] = useState<Record<number, string>>({})
  const [positions, setPositions] = useState<Record<number, { x: number; y: number }>>({})
  const [sheetId, setSheetId] = useState<number | null>(null)
  const [houseOpen, setHouseOpen] = useState<House | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const timers = useRef<number[]>([])

  const avatarOf = useCallback(
    (id: number) => users.find((u) => u.id === id)?.avatar ?? '🙂',
    [users],
  )
  const houses = useMemo(() => buildHouses(agents, avatarOf), [agents, avatarOf])
  const mapH = TOP_PAD + Math.max(1, Math.ceil(houses.length / 2)) * ROW_H + BOTTOM_PAD

  const load = useCallback(() => api.plaza().then(setAgents), [])
  useEffect(() => {
    load()
    return () => timers.current.forEach(clearTimeout)
  }, [load])

  /* ---------- agent 遊蕩：院子休息 / 上街 / 串門 ---------- */
  const pickTarget = useCallback((a: AgentSummary, hs: House[]) => {
    const mine = hs.find((h) => h.ownerId === a.owner_id)
    if (!mine) return { x: 50, y: TOP_PAD }
    const r = Math.random()
    let zone = mine.yard
    if (r > 0.8 && hs.length > 1) {
      const others = hs.filter((h) => h.ownerId !== a.owner_id)
      zone = others[Math.floor(Math.random() * others.length)].yard
    } else if (r > 0.55) {
      return { x: SPINE.left + 2 + Math.random() * 4, y: TOP_PAD + Math.random() * (mapH - TOP_PAD - BOTTOM_PAD) }
    }
    return {
      x: zone.x0 + 4 + Math.random() * (zone.x1 - zone.x0 - 8),
      y: zone.y0 + 14 + Math.random() * (zone.y1 - zone.y0 - 28),
    }
  }, [mapH])

  useEffect(() => {
    if (houses.length === 0) return
    setPositions((prev) => {
      const next = { ...prev }
      agents.forEach((a) => {
        if (!next[a.id]) {
          const h = houses.find((x) => x.ownerId === a.owner_id)!
          next[a.id] = {
            x: h.yard.x0 + 6 + seeded(a.id, 1) * (h.yard.x1 - h.yard.x0 - 12),
            y: h.yard.y0 + 20 + seeded(a.id, 2) * 80,
          }
        }
      })
      return next
    })
    const iv = window.setInterval(() => {
      setPositions((prev) => {
        const next = { ...prev }
        const a = agents[Math.floor(Math.random() * agents.length)]
        if (a) next[a.id] = pickTarget(a, houses)
        return next
      })
    }, 3500)
    return () => clearInterval(iv)
  }, [agents, houses, pickTarget])

  const showBubble = (agentId: number, text: string, ms = 4600) => {
    setBubbles((b) => ({ ...b, [agentId]: text }))
    timers.current.push(
      window.setTimeout(() => setBubbles((b) => {
        const next = { ...b }
        if (next[agentId] === text) delete next[agentId]
        return next
      }), ms),
    )
  }

  const converse = async () => {
    if (busy) return
    setBusy(true)
    setToast('大家凑到了一起，正在开聊…')
    try {
      const res = await api.plazaConverse()
      setToast('')
      res.lines.forEach((line, i) => {
        timers.current.push(window.setTimeout(() => showBubble(line.agent_id, line.text), i * 4000))
      })
      if (res.learned) {
        timers.current.push(
          window.setTimeout(() => {
            setToast(`✨ ${res.learned!.learner} 向 ${res.learned!.teacher} 学会了「${res.learned!.skill}」`)
            timers.current.push(window.setTimeout(() => setToast(''), 6000))
          }, res.lines.length * 4000),
        )
      }
    } catch (e) {
      setToast(e instanceof Error ? e.message : '出错了')
      timers.current.push(window.setTimeout(() => setToast(''), 4000))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative h-full">
      <div className="scanlines absolute inset-0 overflow-y-auto overflow-x-hidden bg-grass">
        <div className="relative w-full" style={{ height: mapH }}>
          {/* 草地紋理 */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, #6ab545 6%, transparent 6%), radial-gradient(circle at 70% 60%, #6ab545 5%, transparent 5%), radial-gradient(circle at 45% 80%, #6ab545 7%, transparent 7%)',
              backgroundSize: '120px 120px',
            }}
          />

          {/* 魚骨道路：主幹 + 支路 */}
          <div
            className="absolute border-x-4 border-ink/60 bg-[#d9b380]"
            style={{
              left: `${SPINE.left}%`, width: `${SPINE.right - SPINE.left}%`,
              top: 0, height: mapH,
              backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 26px, rgb(255 255 255/.5) 26px 40px)',
              backgroundPosition: 'center', backgroundSize: '4px 100%', backgroundRepeat: 'repeat-y',
            }}
          />
          {houses.map((h) => (
            <div
              key={`road-${h.ownerId}`}
              className="absolute border-y-4 border-ink/60 bg-[#d9b380]"
              style={{
                top: h.rowY - 11, height: 22,
                left: h.side === 'left' ? `${h.houseX}%` : `${SPINE.right}%`,
                width: h.side === 'left' ? `${SPINE.left - h.houseX}%` : `${h.houseX - SPINE.right}%`,
              }}
            />
          ))}

          {/* 院子 */}
          {houses.map((h) => (
            <div
              key={`yard-${h.ownerId}`}
              className="absolute border-4 border-dashed border-ink/25 bg-[#9ed76f]/60"
              style={{
                left: `${h.yard.x0}%`, width: `${h.yard.x1 - h.yard.x0}%`,
                top: h.yard.y0, height: h.yard.y1 - h.yard.y0,
              }}
            >
              <div className="absolute bottom-0.5 right-1 text-[9px] text-ink/40">{h.ownerName}的院子</div>
            </div>
          ))}

          {/* 路口裝飾 */}
          <div className="absolute -translate-x-1/2 text-2xl" style={{ left: '50%', top: 30 }}>⛲</div>
          {houses.map((h) => <HouseSprite key={h.ownerId} h={h} onClick={() => setHouseOpen(h)} />)}

          {/* agents */}
          {agents.map((a) => {
            const p = positions[a.id]
            if (!p) return null
            const bubble = bubbles[a.id]
            return (
              <div
                key={a.id}
                className="absolute z-20 flex -translate-x-1/2 flex-col items-center"
                style={{ left: `${p.x}%`, top: p.y, transition: 'left 3s ease-in-out, top 3s ease-in-out' }}
              >
                {bubble && (
                  <div className="bubble mb-2 w-max max-w-40 px-2 py-1 text-[10px] leading-snug">{bubble}</div>
                )}
                <motion.button
                  className="sprite text-3xl"
                  animate={{ y: [0, -3, 0] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                  onClick={() => setSheetId(a.id)}
                >
                  {a.emoji}
                </motion.button>
                <div className="bg-ink/80 px-1 text-[9px] text-cream">{a.name}</div>
              </div>
            )
          })}

          {agents.length === 0 && (
            <div className="absolute inset-x-6 top-40 z-10">
              <div className="pixel-border bg-cream p-3 text-center text-sm text-ink">
                街上空空的——去「伙伴」页把你的物品派来广场吧！
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="absolute left-3 top-3 z-30 bg-ink/80 px-2 py-1 text-xs text-cream">
        ⛲ 公共广场 · {houses.length} 户 · {agents.length} 个伙伴
      </div>

      {toast && (
        <div className="pixel-border absolute left-1/2 top-12 z-30 w-max max-w-[85%] -translate-x-1/2 bg-cream px-3 py-1.5 text-center text-xs text-ink">
          {toast}
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-30 flex gap-2">
        <button className="pixel-btn bg-white p-2.5 text-ink" title="刷新" onClick={load}>
          <RefreshCw size={18} />
        </button>
        <button
          className="pixel-btn bg-berry p-2.5 text-white disabled:opacity-50"
          title="促成一场交流"
          disabled={busy || agents.length < 2}
          onClick={converse}
        >
          <MessagesSquare size={18} />
        </button>
      </div>

      {/* 房子介紹卡片 */}
      <AnimatePresence>
        {houseOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-8"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setHouseOpen(null)}
          >
            <motion.div
              className="pixel-border w-full max-w-xs bg-cream p-4"
              initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-2 flex items-center gap-2">
                <span className="text-3xl">{houseOpen.avatar}</span>
                <div className="flex-1">
                  <div className="text-base font-bold text-ink">{houseOpen.ownerName}的家</div>
                  <div className="text-[10px] text-ink/60">
                    屋顶漆成了自己喜欢的颜色，门口摆着{houseOpen.deco}
                  </div>
                </div>
                <button className="pixel-btn bg-white p-1" onClick={() => setHouseOpen(null)}><X size={14} /></button>
              </div>
              <div className="mb-3 space-y-1.5">
                {houseOpen.agents.map((a) => (
                  <button
                    key={a.id}
                    className="pixel-border flex w-full items-center gap-2 bg-white p-1.5 text-left"
                    onClick={() => { setHouseOpen(null); setSheetId(a.id) }}
                  >
                    <span className="text-xl">{a.emoji}</span>
                    <span className="flex-1 text-xs text-ink">{a.name} <span className="opacity-50">· {a.category}</span></span>
                    <span className="text-[10px]">{a.mood > 66 ? '😊' : a.mood > 33 ? '😐' : '😞'}</span>
                  </button>
                ))}
              </div>
              {user?.id === houseOpen.ownerId && (
                <button
                  className="pixel-btn w-full bg-leaf py-2 text-sm text-white"
                  onClick={() => navigate('/world')}
                >
                  <Home size={14} className="mr-1 inline" />回家
                </button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AgentSheet
        agentId={sheetId}
        onClose={() => setSheetId(null)}
        onChanged={() => { load(); refreshAgents() }}
      />
    </div>
  )
}
