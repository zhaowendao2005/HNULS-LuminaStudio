import type { ChatMessage } from '../types'

export interface MessageComponentMockDeps {
  openKnowledgeSearchDetail: (payload: unknown) => void
  resetKnowledgeSearchDetail: () => void
}

export interface MessageComponentMockCase {
  id: string
  label: string
  description: string
  order: number
  buildMessages: () => ChatMessage[]
  onApply?: (deps: MessageComponentMockDeps) => void
}
