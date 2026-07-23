import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from './api'
import type { AgentSummary, User } from './types'

interface Store {
  users: User[]
  user: User | null
  setUser: (u: User) => void
  agents: AgentSummary[]
  refreshAgents: () => Promise<void>
}

const Ctx = createContext<Store>(null!)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [user, setUserState] = useState<User | null>(null)
  const [agents, setAgents] = useState<AgentSummary[]>([])

  useEffect(() => {
    api.users().then((us) => {
      setUsers(us)
      const savedId = Number(localStorage.getItem('userId'))
      setUserState(us.find((u) => u.id === savedId) ?? us[0] ?? null)
    })
  }, [])

  const refreshAgents = useCallback(async () => {
    if (!user) return
    setAgents(await api.agents(user.id))
  }, [user])

  useEffect(() => {
    refreshAgents()
  }, [refreshAgents])

  const setUser = (u: User) => {
    localStorage.setItem('userId', String(u.id))
    setUserState(u)
  }

  return (
    <Ctx.Provider value={{ users, user, setUser, agents, refreshAgents }}>
      {children}
    </Ctx.Provider>
  )
}

export const useStore = () => useContext(Ctx)
