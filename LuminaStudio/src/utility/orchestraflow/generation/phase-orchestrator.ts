import type {
  OFGenerationCheckpoint,
  OFGenerationOpLogEntry,
  OFGenerationPhase,
  OFGenerationPreview,
  OFGenerationSession,
  OFGenerationValidationIssue,
  OFGenerationValidationReport
} from '@shared/Orchestraflow-types'
import { normalizeOFGenerationPhaseModels } from '@shared/Orchestraflow-types'
import { buildGenerationGraphSummary } from './graph-summary'
import { applyPromptToGraphState } from './semantic-edit-engine'

function createOp(
  session: OFGenerationSession,
  phase: OFGenerationPhase,
  kind: OFGenerationOpLogEntry['kind'],
  summary: string
): OFGenerationOpLogEntry {
  return {
    id: `${session.id}-${phase}-${session.op_log.length + 1}`,
    session_id: session.id,
    phase,
    kind,
    summary,
    created_at: Date.now()
  }
}

function createCheckpoint(
  session: OFGenerationSession,
  phase: OFGenerationPhase,
  label: string
): OFGenerationCheckpoint {
  return {
    id: `${session.id}-cp-${session.checkpoints.length + 1}`,
    session_id: session.id,
    label,
    phase,
    op_index: session.op_log.length,
    created_at: Date.now()
  }
}

function buildPreview(session: OFGenerationSession): OFGenerationPreview {
  const summary = buildGenerationGraphSummary(session.graph_state)
  return {
    plan: [
      {
        id: `${session.id}-plan-1`,
        title: 'Interpret prompt',
        detail: session.prompt || 'No prompt yet',
        status: 'ready'
      },
      {
        id: `${session.id}-plan-2`,
        title: 'Build starter topology',
        detail: `Nodes ${summary.node_count}, edges ${summary.edge_count}`,
        status: summary.node_count > 0 ? 'ready' : 'pending'
      }
    ],
    summary,
    topology_text: session.graph_state.edges.map((edge) => `${edge.source} -> ${edge.target}`)
  }
}

function buildValidation(session: OFGenerationSession): OFGenerationValidationReport {
  const issues: OFGenerationValidationIssue[] = []
  if (!session.prompt.trim()) {
    issues.push({
      id: `${session.id}-validation-prompt`,
      level: 'error' as const,
      type: 'prompt',
      message: 'Prompt is required before confirm.',
      suggested_action: 'Provide a generation prompt.'
    })
  }
  if (session.graph_state.nodes.length < 2) {
    issues.push({
      id: `${session.id}-validation-graph`,
      level: 'error' as const,
      type: 'graph',
      message: 'At least start and end nodes are required.',
      suggested_action: 'Advance the plan and wire phases.'
    })
  }
  return {
    ok: issues.length === 0,
    issues,
    checked_at: Date.now()
  }
}

export function createGenerationSession(input: {
  id: string
  workflow_name: string
  description?: string
  prompt?: string
}): OFGenerationSession {
  const now = Math.floor(Date.now() / 1000)
  const session: OFGenerationSession = {
    id: input.id,
    workflow_name: input.workflow_name,
    description: input.description,
    prompt: input.prompt || '',
    status: 'draft',
    current_phase: 'plan',
    phase_state: {
      plan: { phase: 'plan', status: 'idle' },
      wire: { phase: 'wire', status: 'idle' },
      config: { phase: 'config', status: 'idle' },
      validate: { phase: 'validate', status: 'idle' }
    },
    phase_models: normalizeOFGenerationPhaseModels(),
    graph_state: { version: 1, checkpoints_version: 0, nodes: [], edges: [], node_snapshots: [] },
    preview: {
      plan: [],
      summary: { node_count: 0, edge_count: 0, namespaces: [], node_types: {} },
      topology_text: []
    },
    validation: { ok: false, issues: [], checked_at: Date.now() },
    checkpoints: [],
    op_log: [],
    created_at: now,
    updated_at: now
  }
  session.preview = buildPreview(session)
  session.validation = buildValidation(session)
  return session
}

export function sendGenerationPrompt(
  session: OFGenerationSession,
  prompt: string
): OFGenerationSession {
  const next = structuredClone(session)
  next.prompt = prompt.trim()
  next.status = 'running'
  next.phase_state.plan = { phase: 'plan', status: 'completed', completed_at: Date.now() }
  next.graph_state = applyPromptToGraphState(next.prompt, next.graph_state)
  next.op_log.push(
    createOp(next, 'plan', 'PROMPT_SET', 'Prompt updated and starter topology generated.')
  )
  next.checkpoints.push(createCheckpoint(next, 'plan', 'Initial plan ready'))
  next.preview = buildPreview(next)
  next.validation = buildValidation(next)
  next.updated_at = Math.floor(Date.now() / 1000)
  return next
}

export function advanceGenerationPhase(
  session: OFGenerationSession,
  phase: OFGenerationPhase
): OFGenerationSession {
  const next = structuredClone(session)
  next.current_phase = phase
  next.phase_state[phase] = {
    phase,
    status: phase === 'validate' ? 'waiting-confirm' : 'completed',
    completed_at: Date.now()
  }
  const kind =
    phase === 'wire'
      ? 'WIRE_BATCH'
      : phase === 'config'
        ? 'CONFIG_BATCH'
        : phase === 'validate'
          ? 'VALIDATION_SET'
          : 'EDIT_BATCH'
  next.op_log.push(createOp(next, phase, kind, `Phase ${phase} advanced.`))
  next.checkpoints.push(createCheckpoint(next, phase, `${phase} completed`))
  next.preview = buildPreview(next)
  next.validation = buildValidation(next)
  next.status =
    phase === 'validate' ? (next.validation.ok ? 'waiting-confirm' : 'failed') : 'running'
  next.updated_at = Math.floor(Date.now() / 1000)
  return next
}

export function rollbackGenerationSession(
  session: OFGenerationSession,
  checkpointId: string
): OFGenerationSession {
  const target = session.checkpoints.find((item) => item.id === checkpointId)
  if (!target) return session
  const next = structuredClone(session)
  next.op_log = next.op_log.slice(0, target.op_index)
  next.checkpoints = next.checkpoints.filter((item) => item.created_at <= target.created_at)
  next.current_phase = target.phase
  next.phase_state[target.phase] = {
    phase: target.phase,
    status: 'waiting-confirm',
    completed_at: Date.now()
  }
  next.updated_at = Math.floor(Date.now() / 1000)
  return next
}
