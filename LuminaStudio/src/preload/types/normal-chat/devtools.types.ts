import type { NormalChatConversationStatusPhase } from './common.types'
import type {
  NormalChatConversationRuntimeTrace,
  NormalChatFunctionCallMessagePart,
  NormalChatMessagePart
} from './conversation.types'

export type NormalChatConversationDevScenarioId =
  | 'streaming-baseline'
  | 'functioncall-matrix'
  | 'agent-hierarchy'
  | 'request-interrupt'

export type NormalChatConversationDevDetailMockId =
  | 'detail-streaming-baseline'
  | 'detail-functioncall-matrix'
  | 'detail-agent-hierarchy'
  | 'detail-request-interrupt'

export interface NormalChatConversationDevScenarioCard {
  id: NormalChatConversationDevScenarioId
  title: string
  description: string
  input: string
  badge: string
  accentClass: string
  detailMockId: NormalChatConversationDevDetailMockId
}

export interface NormalChatConversationDevAssistantCommit {
  parts: NormalChatMessagePart[]
  runtimeTrace?: NormalChatConversationRuntimeTrace | null
  errorMessage?: string | null
  aborted?: boolean
}

export type NormalChatConversationDevPlaybackAction =
  | {
      kind: 'status'
      phase: NormalChatConversationStatusPhase
      message: string
    }
  | {
      kind: 'progress'
      message: string
    }
  | {
      kind: 'text-chunk'
      delta: string
    }
  | {
      kind: 'functioncall'
      part: NormalChatFunctionCallMessagePart
    }
  | {
      kind: 'runtime-trace'
      runtimeTrace: NormalChatConversationRuntimeTrace
    }
  | {
      kind: 'commit'
      assistant: NormalChatConversationDevAssistantCommit
    }
  | {
      kind: 'error'
      message: string
      rawErrorJson?: string | null
    }

export interface NormalChatConversationDevPlaybackStep {
  delayMs: number
  actions: NormalChatConversationDevPlaybackAction[]
}

export interface NormalChatConversationDevScenarioDefinition extends NormalChatConversationDevScenarioCard {
  steps: NormalChatConversationDevPlaybackStep[]
}
