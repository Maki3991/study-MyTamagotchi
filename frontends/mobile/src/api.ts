import type { AgentDetail, AgentSummary, ConverseResult, User } from './types'

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `请求失败 (${res.status})`)
  }
  return res.json()
}

export const api = {
  users: () => req<User[]>('/users'),
  agents: (ownerId: number) => req<AgentSummary[]>(`/agents?owner_id=${ownerId}`),
  agent: (id: number) => req<AgentDetail>(`/agents/${id}`),
  scan: (ownerId: number, category: string) =>
    req<AgentDetail>('/agents/scan', {
      method: 'POST',
      body: JSON.stringify({ owner_id: ownerId, category }),
    }),
  chat: (agentId: number, text: string) =>
    req<{ reply: string; mood: number }>(`/agents/${agentId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  dispatch: (agentId: number, location: 'home' | 'plaza') =>
    req<AgentSummary>(`/agents/${agentId}/dispatch`, {
      method: 'POST',
      body: JSON.stringify({ location }),
    }),
  camera: (agentId: number) =>
    req<{ status: string; message: string }>(`/agents/${agentId}/camera`, { method: 'POST' }),
  diary: (userId: number, text: string) =>
    req<{ agent: AgentSummary; reply: string }>('/diary', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, text }),
    }),
  worldConverse: (userId: number) =>
    req<ConverseResult>('/world/converse', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId }),
    }),
  uploadArtifact: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/artifacts', { method: 'POST', body: fd })
    if (!res.ok) throw new Error('上传失败')
    return res.json() as Promise<{ id: string; url: string; mime: string }>
  },
  invokeSkill: (agentId: number, skillId: number, inputs: Record<string, string>) =>
    req<{ output: string; mood: number }>(`/agents/${agentId}/skills/${skillId}/invoke`, {
      method: 'POST',
      body: JSON.stringify({ inputs }),
    }),
  plaza: () => req<AgentSummary[]>('/plaza'),
  plazaConverse: () => req<ConverseResult>('/plaza/converse', { method: 'POST' }),
}
