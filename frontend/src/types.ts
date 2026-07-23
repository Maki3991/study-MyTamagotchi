export interface User {
  id: number
  username: string
  avatar: string
}

export interface AgentSummary {
  id: number
  owner_id: number
  owner_name: string
  name: string
  category: string
  emoji: string
  trait: string
  mood: number
  location: 'home' | 'plaza'
}

export interface Memory {
  id: number
  agent_id: number
  kind: string
  content: string
  created_at: string
}

export interface Skill {
  id: number
  agent_id: number
  name: string
  description: string
  code: string
  source: 'user' | 'learned'
}

export interface AgentDetail extends AgentSummary {
  memories: Memory[]
  skills: Skill[]
  greeting?: string
}

export interface DialogLine {
  agent_id: number
  name: string
  emoji: string
  text: string
}

export interface ConverseResult {
  lines: DialogLine[]
  learned?: { learner: string; learner_id: number; teacher: string; skill: string } | null
}
