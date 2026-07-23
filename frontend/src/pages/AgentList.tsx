import { useState } from 'react'
import { Camera, MapPin } from 'lucide-react'
import { api } from '../api'
import { useStore } from '../store'
import AgentSheet from '../components/AgentSheet'
import ScanModal from '../components/ScanModal'

export default function AgentList() {
  const { agents, refreshAgents } = useStore()
  const [sheetId, setSheetId] = useState<number | null>(null)
  const [scanOpen, setScanOpen] = useState(false)

  const toggle = async (id: number, location: 'home' | 'plaza') => {
    await api.dispatch(id, location === 'home' ? 'plaza' : 'home')
    refreshAgents()
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f3e8ff] p-3">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-ink">我的伙伴 ({agents.length})</h1>
        <button className="pixel-btn bg-berry px-2 py-1.5 text-sm text-white" onClick={() => setScanOpen(true)}>
          <Camera size={14} className="mr-1 inline" />扫描
        </button>
      </div>

      <div className="space-y-2">
        {agents.map((a) => (
          <div key={a.id} className="pixel-border flex items-center gap-3 bg-cream p-2.5">
            <button className="sprite text-3xl" onClick={() => setSheetId(a.id)}>{a.emoji}</button>
            <button className="min-w-0 flex-1 text-left" onClick={() => setSheetId(a.id)}>
              <div className="text-sm font-bold text-ink">
                {a.name}
                <span className="ml-1.5 text-[10px] font-normal opacity-60">{a.category}</span>
              </div>
              <div className="truncate text-xs text-ink/60">{a.trait}</div>
              <div className="mt-1 flex items-center gap-2 text-[10px] text-ink/70">
                <span>{a.mood > 66 ? '😊' : a.mood > 33 ? '😐' : '😞'} {a.mood}</span>
                <span>{a.location === 'home' ? '🏡 在家' : '⛲ 广场中'}</span>
              </div>
            </button>
            <button
              className={`pixel-btn px-2 py-1 text-[10px] ${a.location === 'home' ? 'bg-sky text-ink' : 'bg-leaf text-white'}`}
              onClick={() => toggle(a.id, a.location)}
            >
              <MapPin size={10} className="mr-0.5 inline" />
              {a.location === 'home' ? '派出' : '召回'}
            </button>
          </div>
        ))}
        {agents.length === 0 && (
          <div className="pixel-border bg-cream p-4 text-center text-sm text-ink/60">
            还没有伙伴，点右上角「扫描」创建一个吧！
          </div>
        )}
      </div>

      <AgentSheet agentId={sheetId} onClose={() => setSheetId(null)} onChanged={refreshAgents} />
      <ScanModal open={scanOpen} onClose={() => setScanOpen(false)} onCreated={() => {}} />
    </div>
  )
}
