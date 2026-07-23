import { useStore } from '../store'

export default function Settings() {
  const { users, user, setUser } = useStore()

  return (
    <div className="h-full overflow-y-auto bg-[#f3e8ff] p-3">
      <h1 className="mb-3 text-lg font-bold text-ink">设置</h1>

      <div className="pixel-border mb-4 bg-cream p-3">
        <div className="mb-2 text-sm font-bold text-ink">切换用户（demo 假登入）</div>
        <div className="space-y-2">
          {users.map((u) => (
            <button
              key={u.id}
              className={`pixel-btn flex w-full items-center gap-2 px-2 py-2 text-left text-sm ${
                user?.id === u.id ? 'bg-leaf text-white' : 'bg-white text-ink'
              }`}
              onClick={() => setUser(u)}
            >
              <span className="text-xl">{u.avatar}</span>
              <span className="flex-1">{u.username}</span>
              {user?.id === u.id && <span className="text-xs">✔ 当前</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="pixel-border mb-4 bg-cream p-3 text-xs text-ink/80">
        <div className="mb-1 text-sm font-bold text-ink">关于 My Tamagotchi</div>
        <p>拍下身边的物品，它们会变成像素小伙伴住进你的世界：听你写日记、陪你聊天、去广场交朋友、互相学习技能。</p>
        <p className="mt-2 opacity-60">🚧 开发中：相机扫描识别、视频/镜头结合、实时广场。</p>
      </div>

      <div className="pixel-border bg-ink p-3 text-[10px] text-green-300">
        <div>ver 0.1.0 · AdventureX 2026</div>
        <div>backend: FastAPI + SQLite · llm: OpenRouter</div>
      </div>
    </div>
  )
}
