import { HashRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { Home, PawPrint, Settings as SettingsIcon, Users } from 'lucide-react'
import { StoreProvider, useStore } from './store'
import World from './pages/World'
import Plaza from './pages/Plaza'
import AgentList from './pages/AgentList'
import Settings from './pages/Settings'

const TABS = [
  { to: '/world', label: '世界', Icon: Home },
  { to: '/plaza', label: '广场', Icon: Users },
  { to: '/agents', label: '伙伴', Icon: PawPrint },
  { to: '/settings', label: '设置', Icon: SettingsIcon },
]

function Frame() {
  const { user } = useStore()

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center text-ink">
        <div className="pixel-border bg-cream px-6 py-4 text-sm">连接服务器中… 🛰️</div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col border-x-4 border-ink bg-cream">
      <div className="min-h-0 flex-1">
        <Routes>
          <Route path="/world" element={<World />} />
          <Route path="/plaza" element={<Plaza />} />
          <Route path="/agents" element={<AgentList />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/world" replace />} />
        </Routes>
      </div>
      <nav className="flex border-t-4 border-ink bg-ink">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] ${
                isActive ? 'bg-berry text-white' : 'text-cream/70'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <HashRouter>
        <Frame />
      </HashRouter>
    </StoreProvider>
  )
}
