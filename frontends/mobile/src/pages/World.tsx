import { useEffect, useRef, useState } from 'react'
import { Camera, MessagesSquare, Send } from 'lucide-react'
import { api } from '../api'
import { useStore } from '../store'
import Scene from '../components/Scene'
import AgentSheet from '../components/AgentSheet'
import ScanModal from '../components/ScanModal'

export default function World() {
  const { user, agents, refreshAgents } = useStore()
  const home = agents.filter((a) => a.location === 'home')
  const [bubbles, setBubbles] = useState<Record<number, string>>({})
  const [diary, setDiary] = useState('')
  const [busy, setBusy] = useState(false)
  const [chatBusy, setChatBusy] = useState(false)
  const [sheetId, setSheetId] = useState<number | null>(null)
  const [scanOpen, setScanOpen] = useState(false)
  const [toast, setToast] = useState('')
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }
  useEffect(() => {
    refreshAgents()
    return clearTimers
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const showBubble = (agentId: number, text: string, ms = 6000) => {
    setBubbles((b) => ({ ...b, [agentId]: text }))
    timers.current.push(
      window.setTimeout(() => setBubbles((b) => {
        const next = { ...b }
        if (next[agentId] === text) delete next[agentId]
        return next
      }), ms),
    )
  }

  const sendDiary = async () => {
    if (!user || !diary.trim() || busy) return
    const text = diary.trim()
    setDiary('')
    setBusy(true)
    setToast('正在寻找想听这件事的伙伴…')
    try {
      const res = await api.diary(user.id, text)
      setToast(`${res.agent.emoji} ${res.agent.name} 收下了这篇日记`)
      showBubble(res.agent.id, res.reply, 9000)
      refreshAgents()
    } catch (e) {
      setToast(e instanceof Error ? e.message : '出错了')
    } finally {
      setBusy(false)
      timers.current.push(window.setTimeout(() => setToast(''), 5000))
    }
  }

  const letThemTalk = async () => {
    if (!user || chatBusy) return
    setChatBusy(true)
    setToast('小伙伴们凑到了一起…')
    try {
      const res = await api.worldConverse(user.id)
      setToast('')
      res.lines.forEach((line, i) => {
        timers.current.push(
          window.setTimeout(() => showBubble(line.agent_id, line.text, 4600), i * 4000),
        )
      })
    } catch (e) {
      setToast(e instanceof Error ? e.message : '出错了')
      timers.current.push(window.setTimeout(() => setToast(''), 4000))
    } finally {
      setChatBusy(false)
    }
  }

  return (
    <div className="relative h-full">
      <Scene agents={home} bubbles={bubbles} onAgentClick={(a) => setSheetId(a.id)} />

      <div className="absolute left-3 top-3 z-20 bg-ink/80 px-2 py-1 text-xs text-cream">
        🏡 {user?.username} 的世界 · {home.length} 个伙伴
      </div>

      {toast && (
        <div className="pixel-border absolute left-1/2 top-12 z-30 -translate-x-1/2 bg-cream px-3 py-1.5 text-xs text-ink">
          {toast}
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 z-20 flex flex-col gap-2">
        <div className="flex justify-end gap-2">
          <button
            className="pixel-btn bg-sky p-2.5 text-ink disabled:opacity-50"
            title="让他们聊聊"
            disabled={chatBusy || home.length < 2}
            onClick={letThemTalk}
          >
            <MessagesSquare size={18} />
          </button>
          <button className="pixel-btn bg-berry p-2.5 text-white" title="扫描新物品" onClick={() => setScanOpen(true)}>
            <Camera size={18} />
          </button>
        </div>
        <div className="flex gap-2">
          <input
            className="pixel-border min-w-0 flex-1 bg-cream px-2 py-2 text-sm text-ink outline-none"
            placeholder="写点今天的事，会有伙伴接收…"
            value={diary}
            onChange={(e) => setDiary(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendDiary()}
          />
          <button className="pixel-btn bg-leaf px-3 text-white disabled:opacity-50" disabled={busy} onClick={sendDiary}>
            <Send size={16} />
          </button>
        </div>
      </div>

      <AgentSheet agentId={sheetId} onClose={() => setSheetId(null)} onChanged={refreshAgents} />
      <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} onCreated={() => {}} />
    </div>
  )
}
