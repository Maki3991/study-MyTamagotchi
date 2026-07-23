import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ImagePlus, Play, X } from 'lucide-react'
import { api } from '../api'
import type { Skill, SkillManifest } from '../types'

/* 迷你 markdown 渲染：## 标题 / **粗体** / - 列表 / 段落 */
function Md({ text }: { text: string }) {
  const blocks = text.split('\n')
  return (
    <div className="space-y-1.5 text-xs leading-relaxed text-ink">
      {blocks.map((line, i) => {
        const bold = (s: string) =>
          s.split(/\*\*(.+?)\*\*/g).map((seg, j) => (j % 2 ? <b key={j}>{seg}</b> : seg))
        if (line.startsWith('## ')) {
          return <div key={i} className="mt-2 border-b-2 border-ink/20 pb-0.5 text-sm font-bold">{line.slice(3)}</div>
        }
        if (line.startsWith('- ')) {
          return <div key={i} className="pl-2">▸ {bold(line.slice(2))}</div>
        }
        if (!line.trim()) return null
        return <div key={i}>{bold(line)}</div>
      })}
    </div>
  )
}

const LOADING_LINES = ['翻出工具箱…', '认真施展技能中…', '快好了，再等等…', '马上就好！']

interface Props {
  agentId: number
  agentName: string
  skill: Skill
  onClose: () => void
  onDone?: () => void
}

export default function SkillRunner({ agentId, agentName, skill, onClose, onDone }: Props) {
  const manifest: SkillManifest | null = useMemo(() => {
    try { return JSON.parse(skill.manifest) } catch { return null }
  }, [skill.manifest])

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries((manifest?.inputs ?? []).map((s) => [s.key, s.default ?? ''])))
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [loadingLine, setLoadingLine] = useState(0)
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  if (!manifest) return null

  const setVal = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }))

  const pickImage = (key: string, file: File | null) => {
    if (!file) return
    setUploading(key)
    api.uploadArtifact(file)
      .then((art) => {
        setVal(key, art.id)
        setPreviews((p) => ({ ...p, [key]: URL.createObjectURL(file) }))
      })
      .catch(() => setError('图片上传失败，再试一次？'))
      .finally(() => setUploading(null))
  }

  const missing = manifest.inputs.filter((s) => s.required && !values[s.key])

  const run = async () => {
    if (running || missing.length > 0) return
    setRunning(true)
    setError('')
    setOutput('')
    const timer = window.setInterval(
      () => setLoadingLine((i) => Math.min(i + 1, LOADING_LINES.length - 1)), 9000)
    try {
      const res = await api.invokeSkill(agentId, skill.id, values)
      setOutput(res.output)
      onDone?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : '施展失败了…')
    } finally {
      clearInterval(timer)
      setRunning(false)
      setLoadingLine(0)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div
          className="pixel-border flex max-h-[88vh] w-full max-w-md flex-col bg-cream"
          initial={{ y: 60, scale: 0.97 }} animate={{ y: 0, scale: 1 }}
        >
          <div className="flex items-center gap-2 border-b-4 border-ink bg-sky/40 p-3">
            <span className="text-2xl">{manifest.emoji ?? '🔧'}</span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-ink">{manifest.name}</div>
              <div className="truncate text-[10px] text-ink/60">{manifest.description}</div>
            </div>
            <button className="pixel-btn bg-white p-1" onClick={onClose}><X size={14} /></button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {!output && manifest.inputs.map((spec) => (
              <div key={spec.key}>
                <div className="mb-1 text-xs text-ink/80">
                  {spec.label}{spec.required && <span className="text-berry"> *</span>}
                </div>
                {spec.type === 'select' ? (
                  <div className="flex flex-wrap gap-1.5">
                    {(spec.options ?? []).map((opt) => (
                      <button
                        key={opt}
                        className={`pixel-btn px-2 py-1 text-xs ${values[spec.key] === opt ? 'bg-leaf text-white' : 'bg-white text-ink'}`}
                        onClick={() => setVal(spec.key, opt)}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                ) : spec.type === 'image' ? (
                  <label className="pixel-border flex h-28 cursor-pointer items-center justify-center bg-white">
                    {previews[spec.key] ? (
                      <img src={previews[spec.key]} className="h-full w-full object-contain" style={{ imageRendering: 'auto' }} />
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-ink/50">
                        <ImagePlus size={16} />{uploading === spec.key ? '上传中…' : '点击选择照片'}
                      </span>
                    )}
                    <input
                      type="file" accept="image/*" className="hidden"
                      onChange={(e) => pickImage(spec.key, e.target.files?.[0] ?? null)}
                    />
                  </label>
                ) : (
                  <input
                    type={spec.type === 'date' ? 'date' : spec.type === 'time' ? 'time' : 'text'}
                    className="pixel-border w-full bg-white px-2 py-1.5 text-sm text-ink outline-none"
                    placeholder={spec.placeholder}
                    value={values[spec.key]}
                    onChange={(e) => setVal(spec.key, e.target.value)}
                  />
                )}
              </div>
            ))}

            {running && (
              <div className="pixel-border bg-white p-3 text-center">
                <motion.div
                  className="text-3xl"
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                >
                  {manifest.emoji ?? '🔧'}
                </motion.div>
                <div className="mt-1 text-xs text-ink/70">{agentName}：{LOADING_LINES[loadingLine]}</div>
              </div>
            )}

            {error && <div className="pixel-border bg-berry/15 p-2 text-xs text-ink">😿 {error}</div>}

            {output && (
              <div className="pixel-border bg-white p-3">
                <Md text={output} />
              </div>
            )}
          </div>

          <div className="border-t-4 border-ink p-2">
            {output ? (
              <div className="flex gap-2">
                <button className="pixel-btn flex-1 bg-white py-2 text-sm text-ink" onClick={() => setOutput('')}>
                  再来一次
                </button>
                <button className="pixel-btn flex-1 bg-leaf py-2 text-sm text-white" onClick={onClose}>
                  收好了
                </button>
              </div>
            ) : (
              <button
                className="pixel-btn w-full bg-berry py-2 text-sm text-white disabled:opacity-50"
                disabled={running || missing.length > 0}
                onClick={run}
              >
                <Play size={14} className="mr-1 inline" />
                {running ? '施展中…' : (manifest.cta ?? '使用技能')}
                {missing.length > 0 && !running && `（先填${missing[0].label}）`}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
