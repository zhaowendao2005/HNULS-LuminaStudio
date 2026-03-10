import type { OFWorkflowMeta } from './core-types'
import type { OFGenerationGraphState } from './generation-graph'
import type { OFGenerationOpLogEntry, OFGenerationCheckpoint } from './generation-oplog'
import type {
  OFGenerationAgentArtifacts,
  OFGenerationAgentThread,
  OFGenerationAgentRuntimeConfig,
  OFGenerationAgentId
} from './generation-agent'
import {
  createOFDefaultGenerationArtifacts,
  createOFDefaultGenerationThreads
} from './generation-agent'
import type {
  OFGenerationPhase,
  OFGenerationPhaseModelConfig,
  OFGenerationPhaseState
} from './generation-phase'
import {
  getOFDefaultGenerationPhaseModels,
  mapAgentConfigsToLegacyPhaseModels,
  normalizeOFGenerationAgentConfigs,
  normalizeOFGenerationPhaseModels
} from './generation-phase'
import type { OFGenerationPreview } from './generation-preview'
import type { OFGenerationValidationReport } from './generation-validation'

export type OFGenerationSessionStatus =
  | 'draft'
  | 'running'
  | 'waiting-confirm'
  | 'confirmed'
  | 'failed'

export interface OFGenerationSessionMeta extends OFWorkflowMeta {
  session_status: OFGenerationSessionStatus
  current_phase: OFGenerationPhase
}

export interface OFGenerationSession {
  id: string
  workflow_name: string
  description?: string
  prompt: string
  status: OFGenerationSessionStatus
  current_phase: OFGenerationPhase
  schema_version: number
  phase_state: Record<OFGenerationPhase, OFGenerationPhaseState>
  phase_models: Record<OFGenerationPhase, OFGenerationPhaseModelConfig>
  agent_configs: Record<OFGenerationAgentId, OFGenerationAgentRuntimeConfig>
  agent_threads: Record<OFGenerationAgentId, OFGenerationAgentThread>
  artifacts: OFGenerationAgentArtifacts
  graph_state: OFGenerationGraphState
  preview: OFGenerationPreview
  validation: OFGenerationValidationReport
  checkpoints: OFGenerationCheckpoint[]
  op_log: OFGenerationOpLogEntry[]
  compiled_workflow_id?: string
  created_at: number
  updated_at: number
}

export function normalizeOFGenerationSession(
  source: Partial<OFGenerationSession> & Pick<OFGenerationSession, 'id' | 'workflow_name'>
): OFGenerationSession {
  const nowMs = Date.now()
  const nowSec = Math.floor(nowMs / 1000)
  const phase_models = normalizeOFGenerationPhaseModels(source.phase_models)
  const agent_configs = normalizeOFGenerationAgentConfigs(source.agent_configs, phase_models)

  return {
    id: source.id,
    workflow_name: source.workflow_name,
    description: source.description,
    prompt: source.prompt || '',
    status: source.status || 'draft',
    current_phase: source.current_phase || 'plan',
    schema_version: source.schema_version || 2,
    phase_state: source.phase_state || {
      plan: { phase: 'plan', status: 'idle' },
      wire: { phase: 'wire', status: 'idle' },
      config: { phase: 'config', status: 'idle' },
      validate: { phase: 'validate', status: 'idle' }
    },
    phase_models:
      source.agent_configs || source.schema_version === 2
        ? mapAgentConfigsToLegacyPhaseModels(agent_configs)
        : phase_models || getOFDefaultGenerationPhaseModels(),
    agent_configs,
    agent_threads: {
      ...createOFDefaultGenerationThreads(nowMs),
      ...(source.agent_threads || {})
    },
    artifacts: {
      ...createOFDefaultGenerationArtifacts(nowMs),
      ...(source.artifacts || {})
    },
    graph_state: source.graph_state || {
      version: 1,
      checkpoints_version: 0,
      nodes: [],
      edges: [],
      node_snapshots: []
    },
    preview: source.preview || {
      plan: [],
      summary: { node_count: 0, edge_count: 0, namespaces: [], node_types: {} },
      topology_text: []
    },
    validation: source.validation || { ok: false, issues: [], checked_at: nowMs },
    checkpoints: source.checkpoints || [],
    op_log: source.op_log || [],
    compiled_workflow_id: source.compiled_workflow_id,
    created_at: source.created_at || nowSec,
    updated_at: source.updated_at || nowSec
  }
}
