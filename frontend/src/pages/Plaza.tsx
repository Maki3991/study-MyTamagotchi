import { useCallback, useEffect, useRef, useState } from 'react'
import { MessagesSquare, RefreshCw } from 'lucide-react'
import { api } from '../api'
import { useStore } from '../store'
import Scene from '../components/Scene'
import AgentSheet from '../components/AgentSheet'
import type { AgentSummary } from '../types'

export default function Plaza() {
  const { refreshAgents } = useStore()
  const [agents, setAgents] = useState<AgentSummary[]>([])
  const [bubbles, setBubbles] = useState<Record<number, string>>({})
  const [sheetId, setSheetId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const timers = useRef<number[]>([])

  const load = useCallback(() => api.plaza().then(setAgents), [])
  useEffect(() => {
    load()
    return () => timers.current.forEach(clearTimeout)
  }, [load])

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
      <Scene agents={agents} bubbles={bubbles} onAgentClick={(a) => setSheetId(a.id)} showOwner ground="plaza" />

      <div className="absolute left-3 top-3 z-20 bg-ink/80 px-2 py-1 text-xs text-cream">
        ⛲ 公共广场 · {agents.length} 个访客
      </div>

      {toast && (
        <div className="pixel-border absolute left-1/2 top-12 z-30 w-max max-w-[85%] -translate-x-1/2 bg-cream px-3 py-1.5 text-center text-xs text-ink">
          {toast}
        </div>
      )}

      <div className="absolute bottom-3 right-3 z-20 flex gap-2">
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

      {agents.length < 2 && (
        <div className="absolute bottom-16 left-3 right-3 z-20">
          <div className="pixel-border bg-yellow-100 p-2 text-center text-xs text-ink">
            广场有点冷清——去「伙伴」页把你的物品派来广场吧！
          </div>
        </div>
      )}

      <AgentSheet
        agentId={sheetId}
        onClose={() => setSheetId(null)}
        onChanged={() => { load(); refreshAgents() }}
      />
    </div>
  )
}
