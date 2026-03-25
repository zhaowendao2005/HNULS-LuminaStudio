import type {
  NormalChatAgentDecisionRecord,
  NormalChatAgentRoleKind,
  NormalChatAgentTaskKind
} from '@preload/types'
import type { NormalChatFunctioncallResultAssessment } from '../functioncalls/contracts'

/**
 * 这份文件是 normal-chat 新控制面的单一事实来源。
 *
 * 设计目标：
 * 1. 让 planner / state-machine / orchestrator 说的是同一套语言；
 * 2. 让“批量 helper / 批量 child-agent / 最终收口”在协议层就是一等公民；
 * 3. 后续即使换 prompt、换 provider，也不需要重新发明 action 格式。
 */

export type NormalChatCorePhase = 'strategy' | 'evidence' | 'synthesize' | 'repair'

export interface NormalChatCoreBudget {
  maxSteps: number
  stepIndex: number
  currentDepth: number
  maxDepth: number
  currentRetries: number
  maxRetries: number
  isLastStep: boolean
}

export interface NormalChatHelperCallAction {
  kind: 'helper-call'
  actionId: string
  helperId: string
  reason: string
  args: Record<string, unknown>
  dependsOn: string[]
}

export interface NormalChatChildTaskAction {
  kind: 'child-task'
  actionId: string
  roleKind: Extract<NormalChatAgentRoleKind, 'worker' | 'repair'>
  taskKind: Extract<
    NormalChatAgentTaskKind,
    'tool-research' | 'repair' | 'synthesis' | 'direct-answer'
  >
  goal: string
  summary: string
  expectedOutput: string
  doneWhen: string
  dependsOn: string[]
}

export interface NormalChatFinalAnswerAction {
  kind: 'final-answer'
  actionId: string
  answerHint: string
}

export interface NormalChatFallbackAction {
  kind: 'fallback'
  actionId: string
  reason: string
}

export type NormalChatCoreAction =
  | NormalChatHelperCallAction
  | NormalChatChildTaskAction
  | NormalChatFinalAnswerAction
  | NormalChatFallbackAction

export interface NormalChatCoreStepEnvelope {
  phase: NormalChatCorePhase
  plannerNotes: string
  statusText: string | null
  actions: NormalChatCoreAction[]
  stopReason: string | null
}

export interface NormalChatCorePlannerParseResult {
  rawText: string
  extractedJsonText: string | null
  repairedJsonText: string | null
  envelope: NormalChatCoreStepEnvelope | null
  validationError: string | null
  repairAttempted: boolean
}

export interface NormalChatHelperObservation {
  kind: 'helper-observation'
  actionId: string
  helperId: string
  summary: string
  outputJson: string
  assessment: NormalChatFunctioncallResultAssessment
}

export interface NormalChatChildObservation {
  kind: 'child-observation'
  actionId: string
  summary: string
  status: 'success' | 'error' | 'aborted'
  errorMessage: string | null
}

export interface NormalChatFinalAnswerObservation {
  kind: 'final-answer-observation'
  actionId: string
  summary: string
}

export interface NormalChatFallbackObservation {
  kind: 'fallback-observation'
  actionId: string
  reason: string
}

export type NormalChatCoreObservation =
  | NormalChatHelperObservation
  | NormalChatChildObservation
  | NormalChatFinalAnswerObservation
  | NormalChatFallbackObservation

export function buildCoreBudget(params: {
  maxSteps: number
  stepIndex: number
  currentDepth: number
  maxDepth: number
  currentRetries: number
  maxRetries: number
}): NormalChatCoreBudget {
  return {
    maxSteps: params.maxSteps,
    stepIndex: params.stepIndex,
    currentDepth: params.currentDepth,
    maxDepth: params.maxDepth,
    currentRetries: params.currentRetries,
    maxRetries: params.maxRetries,
    isLastStep: params.stepIndex >= params.maxSteps
  }
}

export function summarizeActionKinds(actions: NormalChatCoreAction[]): string {
  if (actions.length === 0) {
    return 'empty'
  }

  const uniqueKinds = Array.from(new Set(actions.map((action) => action.kind)))
  return uniqueKinds.join(' + ')
}

export function toDecisionRecord(params: {
  stepIndex: number
  budget: NormalChatCoreBudget
  parseResult: NormalChatCorePlannerParseResult
}): NormalChatAgentDecisionRecord {
  const actionKinds = params.parseResult.envelope?.actions.map((action) => action.kind) ?? []
  return {
    stepIndex: params.stepIndex,
    phase: params.parseResult.envelope?.phase ?? 'repair',
    action: summarizeActionKinds(params.parseResult.envelope?.actions ?? []),
    rawText: params.parseResult.rawText,
    parsedJson: params.parseResult.repairedJsonText ?? params.parseResult.extractedJsonText,
    repairAttempted: params.parseResult.repairAttempted,
    validationError: params.parseResult.validationError,
    reasoning: params.parseResult.envelope?.plannerNotes ?? null,
    statusText: params.parseResult.envelope?.statusText ?? null,
    stopReason: params.parseResult.envelope?.stopReason ?? null,
    actionKinds,
    actionsJson: params.parseResult.envelope
      ? JSON.stringify(params.parseResult.envelope.actions, null, 2)
      : null,
    budgetSummary: `step ${params.budget.stepIndex}/${params.budget.maxSteps}, depth ${params.budget.currentDepth}/${params.budget.maxDepth}, retry ${params.budget.currentRetries}/${params.budget.maxRetries}`,
    createdAt: new Date().toISOString()
  }
}
