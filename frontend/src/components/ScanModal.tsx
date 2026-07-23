import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Camera, X } from 'lucide-react'
import { api } from '../api'
import { useStore } from '../store'
import type { AgentDetail } from '../types'

const CATEGORIES = [
  ['狗', '🐶'], ['猫', '🐱'], ['书本', '📚'], ['水瓶', '🫙'], ['哑铃', '🏋️'],
  ['相机', '📷'], ['钢笔', '🖊️'], ['植物', '🪴'], ['耳机', '🎧'], ['杯子', '☕'],
  ['键盘', '⌨️'], ['吉他', '🎸'],
] as const

export default function ScanModal({ open, onClose, onCreated }: {
  open: boolean
  onClose: () => void
  onCreated: (a: AgentDetail) => void
}) {
  const { user, refreshAgents } = useStore()
  const [scanning, setScanning] = useState<string | null>(null)
  const [result, setResult] = useState<AgentDetail | null>(null)

  const scan = async (category: string) => {
    if (!user || scanning) return
    setScanning(category)
    try {
      const agent = await api.scan(user.id, category)
      setResult(agent)
      await refreshAgents()
      onCreated(agent)
    } finally {
      setScanning(null)
    }
  }

  const close = () => {
    setResult(null)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-6"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <motion.div
            className="pixel-border w-full max-w-sm bg-cream p-4"
            initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-bold text-ink"><Camera size={16} className="mr-1 inline" />扫描物品</div>
              <button className="pixel-btn bg-white p-1" onClick={close}><X size={14} /></button>
            </div>

            {result ? (
              <div className="text-center">
                <motion.div
                  className="my-4 text-6xl"
                  initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', bounce: 0.6 }}
                >
                  {result.emoji}
                </motion.div>
                <div className="text-lg font-bold text-ink">{result.name}</div>
                <div className="mb-2 text-xs text-ink/60">{result.trait}</div>
                <div className="bubble mx-auto mb-4 max-w-64 px-3 py-2 text-sm">{result.greeting}</div>
                <button className="pixel-btn w-full bg-leaf py-2 text-white" onClick={close}>带它回家</button>
              </div>
            ) : (
              <>
                <div className="pixel-border mb-3 bg-yellow-100 p-2 text-xs text-ink">
                  🚧 相机拍照识别开发中——先手动选一个物品类型来模拟扫描吧！
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(([name, emoji]) => (
                    <button
                      key={name}
                      className="pixel-btn flex flex-col items-center bg-white py-2 text-ink disabled:opacity-40"
                      disabled={!!scanning}
                      onClick={() => scan(name)}
                    >
                      <span className="text-2xl">{scanning === name ? '⏳' : emoji}</span>
                      <span className="mt-0.5 text-[10px]">{name}</span>
                    </button>
                  ))}
                </div>
                {scanning && <div className="mt-2 text-center text-xs text-ink/60">正在生成人设…</div>}
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
