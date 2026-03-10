import type {
  OFGenerationCheckpoint,
  OFGenerationOpLogEntry,
  OFGenerationPhase,
  OFGenerationPreview,
  OFGenerationSession,
  OFGenerationValidationIssue,
  OFGenerationValidationReport,
  OFGenerationAgentId,
  OFGenerationAgentRuntimeConfig,
  OFGenerationApprovalDraft,
  OFGenerationPlanArtifact,
  OFGenerationTopologyArtifact,
  OFGenerationValidationArtifact,
  OFGenerationConversationMessage
} from '@shared/Orchestraflow-types'
import {
  normalizeOFGenerationSession,
  createOFDefaultGenerationArtifacts,
  createOFDefaultGenerationThreads,
  normalizeOFGenerationAgentConfigs,
  normalizeOFGenerationPhaseModels
} from '@shared/Orchestraflow-types'
import type { OFProviderConfigsMap } from '@utility/orchestraflow/messages.types'
import { runGenerationTurn } from '@utility/llm-client'
import { applyPromptToGraphState } from './semantic-edit-engine'
import { buildGenerationGraphSummary } from './graph-summary'

function nowMs(): number {
  return Date.now()
}

function nowSec(): number {
  return Math.floor(Date.now() / 1000)
}

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
    created_at: nowMs()
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
    created_at: nowMs()
  }
}

function summarizePrompt(prompt: string): string[] {
  return prompt
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 8)
}

function ensureAgentConfigured(config: OFGenerationAgentRuntimeConfig, label: string) {
  if (!config.enabled) {
    throw new Error(`${label} 未启用，请先在生成配置中启用该 Agent。`)
  }
  if (!config.provider || !config.model) {
    throw new Error(`${label} 缺少 provider/model 配置，请先在生成配置中完成设置。`)
  }
}

function appendMessage(
  session: OFGenerationSession,
  agentId: OFGenerationAgentId,
  role: OFGenerationConversationMessage['role'],
  content: string,
  meta?: Record<string, unknown>
) {
  const message: OFGenerationConversationMessage = {
    id: `${agentId}-${session.agent_threads[agentId].messages.length + 1}`,
    agent_id: agentId,
    role,
    content,
    created_at: nowMs(),
    status: 'completed',
    meta
  }
  session.agent_threads[agentId].messages.push(message)
  session.agent_threads[agentId].updated_at = nowMs()
  return message
}

function getProviderConfig(
  session: OFGenerationSession,
  providerConfigs: OFProviderConfigsMap | undefined,
  agentId: OFGenerationAgentId
) {
  const config = session.agent_configs[agentId]
  ensureAgentConfigured(config, agentId)
  const provider = config.provider ? providerConfigs?.[config.provider] : null
  return provider || null
}

function extractJson<T>(text: string, fallback: T): T {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i)
  const source = (fenced?.[1] || text).trim()
  try {
    return JSON.parse(source) as T
  } catch {
    return fallback
  }
}

async function buildApprovalDraft(
  session: OFGenerationSession,
  providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationApprovalDraft> {
  const fallback = buildApprovalDraftFallback(session)
  const provider = getProviderConfig(session, providerConfigs, 'draft_chat')
  if (!provider) return fallback

  const result = await runGenerationTurn(provider, session.agent_configs.draft_chat.model!, {
    temperature: session.agent_configs.draft_chat.temperature,
    systemPrompt:
      '你是 OrchestraFlow generation 的需求澄清 agent。请只输出 JSON，字段包含 summary, requirements, design_direction, node_outline。requirements/design_direction/node_outline 必须是字符串数组。',
    userPrompt: `用户需求：\n${session.prompt}\n\n请生成需求确认草案。`
  })

  const parsed = extractJson<
    Pick<
      OFGenerationApprovalDraft,
      'summary' | 'requirements' | 'design_direction' | 'node_outline'
    >
  >(result.text, {
    summary: fallback.summary,
    requirements: fallback.requirements,
    design_direction: fallback.design_direction,
    node_outline: fallback.node_outline
  })

  return {
    ...fallback,
    summary: parsed.summary || fallback.summary,
    requirements: parsed.requirements?.length ? parsed.requirements : fallback.requirements,
    design_direction: parsed.design_direction?.length
      ? parsed.design_direction
      : fallback.design_direction,
    node_outline: parsed.node_outline?.length ? parsed.node_outline : fallback.node_outline,
    updated_at: nowMs()
  }
}

function buildApprovalDraftFallback(session: OFGenerationSession): OFGenerationApprovalDraft {
  const promptLines = summarizePrompt(session.prompt)
  const requirementSeed =
    promptLines.length > 0 ? promptLines : ['补充业务目标', '补充输入输出约束']
  return {
    id: `${session.id}-approval-${session.op_log.length + 1}`,
    summary: requirementSeed.join('；'),
    requirements: requirementSeed,
    design_direction: [
      '沿用 OrchestraFlow node spec 与 shared definition 基座',
      '先输出规划草案，再收敛到拓扑与图谱',
      '确认后再进入 compile 流程'
    ],
    node_outline: ['开始节点', '核心处理节点', '输出/结束节点'],
    status: 'pending',
    created_at: nowMs(),
    updated_at: nowMs()
  }
}

async function buildPlanArtifact(
  session: OFGenerationSession,
  providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationPlanArtifact> {
  const fallback = buildPlanArtifactFallback(session)
  const provider = getProviderConfig(session, providerConfigs, 'plan_panel')
  if (!provider) return fallback

  const result = await runGenerationTurn(provider, session.agent_configs.plan_panel.model!, {
    temperature: session.agent_configs.plan_panel.temperature,
    systemPrompt:
      '你是 OrchestraFlow generation 的计划 agent。请只输出 JSON，字段包含 title, objectives, constraints, steps, dsl_outline，除 title 外都为字符串数组。',
    userPrompt: `已批准需求摘要：\n${session.artifacts.approval_draft?.summary || session.prompt}\n\n请输出规划草案。`
  })

  const parsed = extractJson<
    Pick<OFGenerationPlanArtifact, 'title' | 'objectives' | 'constraints' | 'steps' | 'dsl_outline'>
  >(result.text, {
    title: fallback.title,
    objectives: fallback.objectives,
    constraints: fallback.constraints,
    steps: fallback.steps,
    dsl_outline: fallback.dsl_outline
  })

  return {
    ...fallback,
    title: parsed.title || fallback.title,
    objectives: parsed.objectives?.length ? parsed.objectives : fallback.objectives,
    constraints: parsed.constraints?.length ? parsed.constraints : fallback.constraints,
    steps: parsed.steps?.length ? parsed.steps : fallback.steps,
    dsl_outline: parsed.dsl_outline?.length ? parsed.dsl_outline : fallback.dsl_outline,
    updated_at: nowMs()
  }
}

function buildPlanArtifactFallback(session: OFGenerationSession): OFGenerationPlanArtifact {
  const approval = session.artifacts.approval_draft
  const objectives = approval?.requirements?.length
    ? approval.requirements.slice(0, 5)
    : summarizePrompt(session.prompt)
  return {
    status: 'ready',
    version: session.artifacts.plan.version + 1,
    title: objectives[0] || '规划草案',
    objectives: objectives.length ? objectives : ['补充业务目标'],
    constraints: [
      '沿用现有 node spec / variable / DSL 基座',
      '生成态与正式 workflow 持久化分离',
      '确认前不写 runnable workflow JSON'
    ],
    steps: [
      '梳理用户目标与输入输出',
      '确定节点骨架与分支结构',
      '生成 DSL 草案并映射到图状态',
      '执行校验并等待确认'
    ],
    dsl_outline: [
      'WIRE_BATCH',
      'start -> planner',
      'planner -> result',
      'CONFIG_BATCH',
      'set model and outputs'
    ],
    updated_at: nowMs()
  }
}

async function buildTopologyArtifact(
  session: OFGenerationSession,
  providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationTopologyArtifact> {
  const fallback = buildTopologyArtifactFallback(session)
  const provider = getProviderConfig(session, providerConfigs, 'topology_graph')
  if (!provider) return fallback

  const result = await runGenerationTurn(provider, session.agent_configs.topology_graph.model!, {
    temperature: session.agent_configs.topology_graph.temperature,
    systemPrompt:
      '你是 OrchestraFlow generation 的 topology agent。请只输出 JSON，字段包含 summary, topology_text, dsl_text。其中 topology_text 为字符串数组，dsl_text 为字符串。',
    userPrompt: `计划标题：${session.artifacts.plan.title}\n计划目标：${session.artifacts.plan.objectives.join('；')}\n计划步骤：${session.artifacts.plan.steps.join('；')}\n\n请输出 topology 草案与 DSL。`
  })

  const parsed = extractJson<
    Pick<OFGenerationTopologyArtifact, 'summary' | 'topology_text' | 'dsl_text'>
  >(result.text, {
    summary: fallback.summary,
    topology_text: fallback.topology_text,
    dsl_text: fallback.dsl_text
  })

  return {
    ...fallback,
    summary: parsed.summary || fallback.summary,
    topology_text: parsed.topology_text?.length ? parsed.topology_text : fallback.topology_text,
    dsl_text: parsed.dsl_text || fallback.dsl_text,
    updated_at: nowMs()
  }
}

function buildTopologyArtifactFallback(session: OFGenerationSession): OFGenerationTopologyArtifact {
  const plan = session.artifacts.plan
  const primaryObjective = plan.objectives[0] || session.prompt || 'workflow generation'
  const topologySteps = (plan.steps.length ? plan.steps : summarizePrompt(session.prompt)).slice(
    0,
    5
  )
  const dslLines = ['WIRE_BATCH']
  let previous = 'start'

  topologySteps.forEach((step, index) => {
    const nodeId = toDslNodeName(step, index)
    dslLines.push(`${previous} -> ${nodeId}`)
    previous = nodeId
  })

  dslLines.push(`${previous} -> result`, '', 'CONFIG_BATCH', `set objective ${primaryObjective}`)

  return {
    status: 'ready',
    version: session.artifacts.topology.version + 1,
    summary: `已基于规划草案生成拓扑骨架：${primaryObjective}`,
    topology_text: dslLines.filter((line) => line.includes('->')),
    dsl_text: dslLines.join('\n'),
    updated_at: nowMs()
  }
}

function buildValidationArtifact(session: OFGenerationSession): OFGenerationValidationArtifact {
  const notes = [
    session.artifacts.plan.status === 'ready' ? '规划草案已生成。' : '规划草案尚未生成。',
    session.artifacts.topology.status === 'ready' ? '拓扑草案已生成。' : '拓扑草案尚未生成。',
    session.validation.ok ? '当前会话可进入确认编译。' : '仍需处理校验问题。'
  ]

  return {
    status: session.validation.ok ? 'ready' : 'outdated',
    version: session.artifacts.validation_review.version + 1,
    review_notes: notes,
    updated_at: nowMs()
  }
}

function buildPreview(session: OFGenerationSession): OFGenerationPreview {
  const summary = buildGenerationGraphSummary(session.graph_state)
  return {
    plan: [
      {
        id: `${session.id}-plan-draft`,
        title: session.artifacts.plan.title || '规划草案',
        detail: session.artifacts.plan.objectives.join('；') || session.prompt || 'No prompt yet',
        status: session.artifacts.plan.status === 'ready' ? 'ready' : 'pending'
      },
      {
        id: `${session.id}-plan-topology`,
        title: '拓扑与图谱',
        detail:
          session.artifacts.topology.summary ||
          `Nodes ${summary.node_count}, edges ${summary.edge_count}`,
        status: session.artifacts.topology.status === 'ready' ? 'ready' : 'pending'
      }
    ],
    summary,
    topology_text:
      session.artifacts.topology.topology_text.length > 0
        ? session.artifacts.topology.topology_text
        : session.graph_state.edges.map((edge) => `${edge.source} -> ${edge.target}`)
  }
}

function buildValidation(session: OFGenerationSession): OFGenerationValidationReport {
  const issues: OFGenerationValidationIssue[] = []
  if (!session.prompt.trim()) {
    issues.push({
      id: `${session.id}-validation-prompt`,
      level: 'error',
      type: 'prompt',
      message: 'Prompt is required before confirm.',
      suggested_action: 'Provide a generation prompt.'
    })
  }
  if (!session.artifacts.approval_draft || session.artifacts.approval_draft.status !== 'approved') {
    issues.push({
      id: `${session.id}-validation-approval`,
      level: 'error',
      type: 'approval',
      message: 'Approval draft has not been approved yet.',
      suggested_action: 'Approve the draft requirements before topology generation.'
    })
  }
  if (session.graph_state.nodes.length < 2) {
    issues.push({
      id: `${session.id}-validation-graph`,
      level: 'error',
      type: 'graph',
      message: 'At least start and end nodes are required.',
      suggested_action: 'Run topology generation to build the graph state.'
    })
  }

  return {
    ok: issues.length === 0,
    issues,
    checked_at: nowMs()
  }
}

function finalizeSession(session: OFGenerationSession): OFGenerationSession {
  session.preview = buildPreview(session)
  session.validation = buildValidation(session)
  session.artifacts.validation_review = buildValidationArtifact(session)
  session.updated_at = nowSec()
  session.phase_models = normalizeOFGenerationPhaseModels(session.phase_models)
  session.agent_configs = normalizeOFGenerationAgentConfigs(
    session.agent_configs,
    session.phase_models
  )
  return session
}

function markPhase(
  session: OFGenerationSession,
  phase: OFGenerationPhase,
  status: 'running' | 'completed' | 'waiting-confirm'
) {
  session.current_phase = phase
  session.phase_state[phase] = {
    phase,
    status,
    completed_at: status === 'running' ? undefined : nowMs(),
    started_at: nowMs()
  }
}

async function runDraftStage(
  session: OFGenerationSession,
  userInput: string,
  providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationSession> {
  ensureAgentConfigured(session.agent_configs.draft_chat, 'draft_chat')
  if (userInput.trim()) appendMessage(session, 'draft_chat', 'user', userInput)

  const approvalDraft = await buildApprovalDraft(session, providerConfigs)
  session.artifacts.approval_draft = approvalDraft
  appendMessage(
    session,
    'draft_chat',
    'assistant',
    `我先基于当前需求整理了一版确认草案。\n\n需求摘要：${approvalDraft.summary}`,
    { approval_id: approvalDraft.id, block: 'approval-draft' }
  )
  markPhase(session, 'plan', 'waiting-confirm')
  session.status = 'waiting-confirm'
  session.op_log.push(
    createOp(session, 'plan', 'PROMPT_SET', 'Draft chat generated an approval draft.')
  )
  session.checkpoints.push(createCheckpoint(session, 'plan', 'Draft requirements prepared'))
  return finalizeSession(session)
}

async function runPlanStage(
  session: OFGenerationSession,
  providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationSession> {
  ensureAgentConfigured(session.agent_configs.plan_panel, 'plan_panel')
  session.artifacts.plan = await buildPlanArtifact(session, providerConfigs)
  appendMessage(
    session,
    'plan_panel',
    'assistant',
    `已生成规划草案：${session.artifacts.plan.title}`,
    {
      artifact: 'plan'
    }
  )
  markPhase(session, 'plan', 'completed')
  session.status = 'running'
  session.op_log.push(
    createOp(session, 'plan', 'EDIT_BATCH', 'Plan panel produced a planning artifact.')
  )
  session.checkpoints.push(createCheckpoint(session, 'plan', 'Plan artifact ready'))
  return finalizeSession(session)
}

async function runTopologyStage(
  session: OFGenerationSession,
  providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationSession> {
  ensureAgentConfigured(session.agent_configs.topology_graph, 'topology_graph')
  session.artifacts.topology = await buildTopologyArtifact(session, providerConfigs)
  session.graph_state = applyPromptToGraphState(
    [session.artifacts.topology.summary, session.artifacts.topology.dsl_text].join('\n'),
    session.graph_state
  )
  appendMessage(session, 'topology_graph', 'assistant', session.artifacts.topology.summary, {
    artifact: 'topology',
    dsl_text: session.artifacts.topology.dsl_text
  })
  markPhase(session, 'wire', 'completed')
  session.phase_state.config = {
    phase: 'config',
    status: 'completed',
    started_at: nowMs(),
    completed_at: nowMs()
  }
  session.current_phase = 'config'
  session.status = 'running'
  session.op_log.push(
    createOp(session, 'wire', 'WIRE_BATCH', 'Topology agent generated graph mutations.')
  )
  session.checkpoints.push(createCheckpoint(session, 'wire', 'Topology artifact ready'))
  return finalizeSession(session)
}

function toDslNodeName(input: string, index: number): string {
  const normalized =
    input
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 18) || `node-${index + 1}`
  return normalized
}

async function runValidationStage(
  session: OFGenerationSession,
  _providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationSession> {
  ensureAgentConfigured(session.agent_configs.plan_panel, 'plan_panel')
  finalizeSession(session)
  appendMessage(
    session,
    'plan_panel',
    'assistant',
    session.validation.ok
      ? '校验通过，可以进入确认编译。'
      : `校验仍有 ${session.validation.issues.length} 个问题，请继续修改草案或拓扑。`,
    { artifact: 'validation' }
  )
  markPhase(session, 'validate', 'waiting-confirm')
  session.status = session.validation.ok ? 'waiting-confirm' : 'failed'
  session.op_log.push(
    createOp(
      session,
      'validate',
      'VALIDATION_SET',
      'Validation stage reviewed the current session state.'
    )
  )
  session.checkpoints.push(createCheckpoint(session, 'validate', 'Validation review completed'))
  return finalizeSession(session)
}

export function createGenerationSession(input: {
  id: string
  workflow_name: string
  description?: string
  prompt?: string
}): OFGenerationSession {
  const now = nowMs()
  return finalizeSession(
    normalizeOFGenerationSession({
      id: input.id,
      workflow_name: input.workflow_name,
      description: input.description,
      prompt: input.prompt || '',
      schema_version: 2,
      status: 'draft',
      current_phase: 'plan',
      phase_models: normalizeOFGenerationPhaseModels(),
      agent_configs: normalizeOFGenerationAgentConfigs(),
      agent_threads: createOFDefaultGenerationThreads(now),
      artifacts: createOFDefaultGenerationArtifacts(now),
      created_at: nowSec(),
      updated_at: nowSec()
    })
  )
}

export async function sendGenerationPrompt(
  session: OFGenerationSession,
  prompt: string,
  providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationSession> {
  const next = normalizeOFGenerationSession(structuredClone(session))
  next.prompt = prompt.trim()
  return runDraftStage(next, prompt.trim(), providerConfigs)
}

export async function sendGenerationAgentMessage(
  session: OFGenerationSession,
  agentId: OFGenerationAgentId,
  input: string,
  providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationSession> {
  const next = normalizeOFGenerationSession(structuredClone(session))
  if (agentId === 'draft_chat') {
    next.prompt = input.trim() || next.prompt
    return runDraftStage(next, input, providerConfigs)
  }
  appendMessage(next, agentId, 'user', input)
  if (agentId === 'plan_panel') return runPlanStage(next, providerConfigs)
  return runTopologyStage(next, providerConfigs)
}

export async function resolveGenerationApproval(
  session: OFGenerationSession,
  approvalId: string,
  decision: 'approved' | 'rejected',
  note?: string,
  providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationSession> {
  const next = normalizeOFGenerationSession(structuredClone(session))
  const approval = next.artifacts.approval_draft
  if (!approval || approval.id !== approvalId)
    throw new Error(`Approval draft not found: ${approvalId}`)

  approval.status = decision
  approval.updated_at = nowMs()
  appendMessage(
    next,
    'draft_chat',
    'assistant',
    decision === 'approved'
      ? '用户已批准需求草案，开始生成规划。'
      : `用户驳回了需求草案${note ? `：${note}` : ''}`,
    { approval_id: approvalId, decision }
  )

  next.status = decision === 'approved' ? 'running' : 'draft'
  next.op_log.push(
    createOp(
      next,
      'plan',
      'EDIT_BATCH',
      decision === 'approved' ? 'Approval draft approved.' : 'Approval draft rejected.'
    )
  )

  return decision === 'approved' ? runPlanStage(next, providerConfigs) : finalizeSession(next)
}

export async function advanceGenerationPhase(
  session: OFGenerationSession,
  phase: OFGenerationPhase,
  providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationSession> {
  const next = normalizeOFGenerationSession(structuredClone(session))
  if (phase === 'plan') return runPlanStage(next, providerConfigs)
  if (phase === 'wire' || phase === 'config') return runTopologyStage(next, providerConfigs)
  return runValidationStage(next, providerConfigs)
}

export async function runGenerationStage(
  session: OFGenerationSession,
  stage: 'draft' | 'plan' | 'topology' | 'validation',
  providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationSession> {
  const next = normalizeOFGenerationSession(structuredClone(session))
  if (stage === 'draft') return runDraftStage(next, '', providerConfigs)
  if (stage === 'plan') return runPlanStage(next, providerConfigs)
  if (stage === 'topology') return runTopologyStage(next, providerConfigs)
  return runValidationStage(next, providerConfigs)
}

export async function updateGenerationAgentConfig(
  session: OFGenerationSession,
  agentId: OFGenerationAgentId,
  patch: Partial<OFGenerationAgentRuntimeConfig>,
  _providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationSession> {
  const next = normalizeOFGenerationSession(structuredClone(session))
  next.agent_configs = {
    ...next.agent_configs,
    [agentId]: {
      ...next.agent_configs[agentId],
      ...patch,
      agent_id: agentId
    }
  }
  next.op_log.push(
    createOp(next, next.current_phase, 'CONFIG_BATCH', `Updated agent config for ${agentId}.`)
  )
  return finalizeSession(next)
}

export async function rollbackGenerationSession(
  session: OFGenerationSession,
  checkpointId: string,
  _providerConfigs?: OFProviderConfigsMap
): Promise<OFGenerationSession> {
  const target = session.checkpoints.find((item) => item.id === checkpointId)
  if (!target) return session
  const next = normalizeOFGenerationSession(structuredClone(session))
  next.op_log = next.op_log.slice(0, target.op_index)
  next.checkpoints = next.checkpoints.filter((item) => item.created_at <= target.created_at)
  next.current_phase = target.phase
  next.phase_state[target.phase] = {
    phase: target.phase,
    status: 'waiting-confirm',
    completed_at: nowMs(),
    started_at: nowMs()
  }
  next.updated_at = nowSec()
  return finalizeSession(next)
}
