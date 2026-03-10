import type { OFGenerationPhaseModelConfig } from './generation-phase'

export type OFGenerationAgentId = 'draft_chat' | 'plan_panel' | 'topology_graph'
export type OFGenerationAgentRole = 'conversation' | 'planner' | 'topology'
export type OFGenerationAgentMessageRole = 'system' | 'user' | 'assistant' | 'tool'
export type OFGenerationApprovalStatus = 'pending' | 'approved' | 'rejected'
export type OFGenerationArtifactStatus = 'idle' | 'ready' | 'outdated'

export interface OFGenerationAgentRuntimeConfig {
  agent_id: OFGenerationAgentId
  label: string
  enabled: boolean
  provider?: string
  model?: string
  temperature?: number
  context_limit: number
}

export interface OFGenerationConversationMessage {
  id: string
  agent_id: OFGenerationAgentId
  role: OFGenerationAgentMessageRole
  content: string
  created_at: number
  status?: 'streaming' | 'completed' | 'error'
  meta?: Record<string, unknown>
}

export interface OFGenerationApprovalDraft {
  id: string
  summary: string
  requirements: string[]
  design_direction: string[]
  node_outline: string[]
  status: OFGenerationApprovalStatus
  created_at: number
  updated_at: number
}

export interface OFGenerationPlanArtifact {
  status: OFGenerationArtifactStatus
  version: number
  title: string
  objectives: string[]
  constraints: string[]
  steps: string[]
  dsl_outline: string[]
  updated_at: number
}

export interface OFGenerationTopologyArtifact {
  status: OFGenerationArtifactStatus
  version: number
  summary: string
  topology_text: string[]
  dsl_text: string
  updated_at: number
}

export interface OFGenerationValidationArtifact {
  status: OFGenerationArtifactStatus
  version: number
  review_notes: string[]
  updated_at: number
}

export interface OFGenerationAgentArtifacts {
  approval_draft: OFGenerationApprovalDraft | null
  plan: OFGenerationPlanArtifact
  topology: OFGenerationTopologyArtifact
  validation_review: OFGenerationValidationArtifact
}

export interface OFGenerationAgentThread {
  agent_id: OFGenerationAgentId
  role: OFGenerationAgentRole
  title: string
  messages: OFGenerationConversationMessage[]
  updated_at: number
}

export interface OFGenerationAgentEvent {
  request_id: string
  session_id: string
  agent_id: OFGenerationAgentId
  type:
    | 'message-start'
    | 'message-delta'
    | 'message-complete'
    | 'approval-updated'
    | 'artifact-updated'
    | 'session-updated'
    | 'run-error'
  message_id?: string
  delta?: string
  payload?: Record<string, unknown>
  created_at: number
}

export const OF_GENERATION_AGENT_IDS: OFGenerationAgentId[] = [
  'draft_chat',
  'plan_panel',
  'topology_graph'
]

export const OF_GENERATION_AGENT_PHASE_COMPAT: Record<
  'plan' | 'wire' | 'config' | 'validate',
  OFGenerationAgentId
> = {
  plan: 'draft_chat',
  wire: 'topology_graph',
  config: 'topology_graph',
  validate: 'plan_panel'
}

export function getOFDefaultGenerationAgentConfigs(
  legacyPhaseModels?: Record<string, OFGenerationPhaseModelConfig>
): Record<OFGenerationAgentId, OFGenerationAgentRuntimeConfig> {
  const phaseCompat = legacyPhaseModels || {}
  return {
    draft_chat: {
      agent_id: 'draft_chat',
      label: '草案对话 Agent',
      enabled: true,
      provider: phaseCompat.plan?.provider,
      model: phaseCompat.plan?.model,
      temperature: phaseCompat.plan?.temperature ?? 0.2,
      context_limit: 20
    },
    plan_panel: {
      agent_id: 'plan_panel',
      label: '计划面板 Agent',
      enabled: true,
      provider: phaseCompat.validate?.provider || phaseCompat.plan?.provider,
      model: phaseCompat.validate?.model || phaseCompat.plan?.model,
      temperature: phaseCompat.validate?.temperature ?? 0.1,
      context_limit: 12
    },
    topology_graph: {
      agent_id: 'topology_graph',
      label: '拓扑图谱 Agent',
      enabled: true,
      provider: phaseCompat.wire?.provider || phaseCompat.config?.provider,
      model: phaseCompat.wire?.model || phaseCompat.config?.model,
      temperature: phaseCompat.wire?.temperature ?? 0.1,
      context_limit: 8
    }
  }
}

export function createOFDefaultGenerationArtifacts(now = Date.now()): OFGenerationAgentArtifacts {
  return {
    approval_draft: null,
    plan: {
      status: 'idle',
      version: 0,
      title: '未生成规划',
      objectives: [],
      constraints: [],
      steps: [],
      dsl_outline: [],
      updated_at: now
    },
    topology: {
      status: 'idle',
      version: 0,
      summary: '',
      topology_text: [],
      dsl_text: '',
      updated_at: now
    },
    validation_review: {
      status: 'idle',
      version: 0,
      review_notes: [],
      updated_at: now
    }
  }
}

export function createOFDefaultGenerationThreads(
  now = Date.now()
): Record<OFGenerationAgentId, OFGenerationAgentThread> {
  return {
    draft_chat: {
      agent_id: 'draft_chat',
      role: 'conversation',
      title: '草案规划对话',
      messages: [],
      updated_at: now
    },
    plan_panel: {
      agent_id: 'plan_panel',
      role: 'planner',
      title: '计划编辑面板',
      messages: [],
      updated_at: now
    },
    topology_graph: {
      agent_id: 'topology_graph',
      role: 'topology',
      title: '拓扑与图谱生成',
      messages: [],
      updated_at: now
    }
  }
}
