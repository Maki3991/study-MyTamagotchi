import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, MapPin, Send, X } from 'lucide-react'
import { api } from '../api'
import { useStore } from '../store'
import SkillRunner from './SkillRunner'
import type { AgentDetail, Skill } from '../types'

const KIND_LABEL: Record<string, string> = {
  diary: '📔日记', chat: '💬对话', camera: '📷镜头', plaza: '⛲广场', world: '🏡家里',
}

function MoodBar({ mood }: { mood: number }) {
  const color = mood > 66 ? 'bg-leaf' : mood > 33 ? 'bg-yellow-400' : 'bg-berry'
  return (
    <div className="pixel-border h-4 w-full bg-white">
      <div className={`h-full ${color}`} style={{ width: `${mood}%` }} />
    </div>
  )
}

interface Props {
  agentId: number | null
  onClose: () => void
  onChanged?: () => void
}

export default function AgentSheet({ agentId, onClose, onChanged }: Props) {
  const { user } = useStore()
  const [detail, setDetail] = useState<AgentDetail | null>(null)
  const [openSkill, setOpenSkill] = useState<Skill | null>(null)
  const [runningSkill, setRunningSkill] = useState<Skill | null>(null)
  const [chatLog, setChatLog] = useState<{ who: 'me' | 'agent'; text: string }[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [cameraMsg, setCameraMsg] = useState('')
  const logRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setDetail(null)
    setChatLog([])
    setCameraMsg('')
    setOpenSkill(null)
    if (agentId != null) api.agent(agentId).then(setDetail)
  }, [agentId])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [chatLog])

  const send = async () => {
    if (!detail || !input.trim() || busy) return
    const text = input.trim()
    setInput('')
    setChatLog((l) => [...l, { who: 'me', text }])
    setBusy(true)
    try {
      const res = await api.chat(detail.id, text)
      setChatLog((l) => [...l, { who: 'agent', text: res.reply }])
      api.agent(detail.id).then(setDetail)
    } finally {
      setBusy(false)
    }
  }

  const toggleDispatch = async () => {
    if (!detail) return
    const target = detail.location === 'home' ? 'plaza' : 'home'
    await api.dispatch(detail.id, target)
    setDetail({ ...detail, location: target })
    onChanged?.()
  }

  const isMine = detail && user && detail.owner_id === user.id

  return (
    <AnimatePresence>
      {agentId != null && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/40"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[82%] w-full max-w-md flex-col border-x-4 border-t-4 border-ink bg-cream"
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.22 }}
          >
            {!detail ? (
              <div className="p-8 text-center text-ink">加载中…</div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b-4 border-ink bg-berry/20 p-3">
                  <span className="sprite text-4xl">{detail.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-bold text-ink">
                      {detail.name}
                      <span className="ml-2 text-xs opacity-60">{detail.category} · {detail.owner_name}的</span>
                    </div>
                    <div className="truncate text-xs text-ink/70">{detail.trait}</div>
                  </div>
                  <button className="pixel-btn bg-white p-1" onClick={onClose}><X size={16} /></button>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-3">
                  <div>
                    <div className="mb-1 text-xs text-ink/70">心情 {detail.mood}/100</div>
                    <MoodBar mood={detail.mood} />
                  </div>

                  {isMine && (
                    <div className="flex gap-2">
                      <button className="pixel-btn flex-1 bg-leaf px-2 py-1.5 text-sm text-white" onClick={toggleDispatch}>
                        <MapPin size={14} className="mr-1 inline" />
                        {detail.location === 'home' ? '派往广场' : '召回家里'}
                      </button>
                      <button
                        className="pixel-btn flex-1 bg-sky px-2 py-1.5 text-sm text-ink"
                        onClick={() => api.camera(detail.id).then((r) => setCameraMsg(r.message))}
                      >
                        <Camera size={14} className="mr-1 inline" />结合镜头
                      </button>
                    </div>
                  )}
                  {cameraMsg && (
                    <div className="pixel-border bg-yellow-100 p-2 text-xs text-ink">🚧 {cameraMsg}</div>
                  )}

                  <div>
                    <div className="mb-1 text-sm font-bold text-ink">技能 Skills</div>
                    <div className="flex flex-wrap gap-2">
                      {detail.skills.length === 0 && <span className="text-xs text-ink/50">还没有技能</span>}
                      {detail.skills.map((s) => {
                        const runnable = !!s.def_id
                        return (
                          <button
                            key={s.id}
                            className={`pixel-btn px-2 py-1 text-xs ${
                              runnable ? 'bg-yellow-300 text-ink'
                                : s.source === 'learned' ? 'bg-berry text-white' : 'bg-white text-ink'
                            }`}
                            onClick={() =>
                              runnable && isMine
                                ? setRunningSkill(s)
                                : setOpenSkill(openSkill?.id === s.id ? null : s)}
                          >
                            {runnable ? '⚡' : s.source === 'learned' ? '✨' : '🔧'}{s.name}
                          </button>
                        )
                      })}
                    </div>
                    {openSkill && (
                      <div className="pixel-border mt-2 bg-ink p-2 text-xs text-green-300">
                        <div className="mb-1 text-cream">{openSkill.description}</div>
                        <pre className="overflow-x-auto whitespace-pre-wrap">{openSkill.code}</pre>
                        {!!openSkill.def_id && !isMine && (
                          <div className="mt-1 text-yellow-300">⚡ 可执行技能——派你的伙伴来广场交流，有机会学会它！</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-1 text-sm font-bold text-ink">记忆 Memories</div>
                    <div className="space-y-1.5">
                      {detail.memories.length === 0 && <span className="text-xs text-ink/50">还没有记忆</span>}
                      {detail.memories.slice(0, 20).map((m) => (
                        <div key={m.id} className="pixel-border bg-white p-2 text-xs text-ink">
                          <span className="mr-1 opacity-60">{KIND_LABEL[m.kind] ?? m.kind}</span>
                          {m.content}
                        </div>
                      ))}
                    </div>
                  </div>

                  {chatLog.length > 0 && (
                    <div ref={logRef} className="max-h-40 space-y-1.5 overflow-y-auto">
                      {chatLog.map((m, i) => (
                        <div key={i} className={`flex ${m.who === 'me' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`pixel-border max-w-[80%] px-2 py-1 text-xs ${m.who === 'me' ? 'bg-leaf text-white' : 'bg-white text-ink'}`}>
                            {m.text}
                          </div>
                        </div>
                      ))}
                      {busy && <div className="text-xs text-ink/50">对方正在输入…</div>}
                    </div>
                  )}
                </div>

                {isMine && (
                  <div className="flex gap-2 border-t-4 border-ink p-2">
                    <input
                      className="pixel-border min-w-0 flex-1 bg-white px-2 py-1.5 text-sm text-ink outline-none"
                      placeholder={`和${detail.name}说点什么…`}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && send()}
                    />
                    <button className="pixel-btn bg-berry px-3 text-white" onClick={send} disabled={busy}>
                      <Send size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
          {runningSkill && detail && (
            <SkillRunner
              agentId={detail.id}
              agentName={detail.name}
              skill={runningSkill}
              onClose={() => setRunningSkill(null)}
              onDone={() => api.agent(detail.id).then(setDetail)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  )
}
