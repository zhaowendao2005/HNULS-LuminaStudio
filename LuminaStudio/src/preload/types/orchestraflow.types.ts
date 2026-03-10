/**
 * OrchestraFlow (OF) 跨进程类型定义
 */
export * from '@shared/Orchestraflow-types'

import type {
  OFAISchemaBundle,
  OFWorkflow,
  OFWorkflowMeta,
  OFWorkflowRunResult,
  OFNodeTracing,
  OFNodeDebugRunParams,
  OFNodeDebugResult,
  OFGenerationPhase,
  OFGenerationPhaseModelConfig,
  OFGenerationSession,
  OFGenerationAgentId,
  OFGenerationAgentRuntimeConfig,
  OFGenerationAgentEvent
} from '@shared/Orchestraflow-types'

export interface OFWorkflowAPI {
  list(params?: { keyword?: string; page?: number; pageSize?: number }): Promise<{
    success: boolean
    data?: { workflows: OFWorkflowMeta[]; total: number }
    error?: string
  }>

  get(workflowId: string): Promise<{ success: boolean; data?: OFWorkflow; error?: string }>

  create(data: {
    name: string
    description?: string
    author: string
    icon?: string
    iconBackground?: string
  }): Promise<{ success: boolean; data?: OFWorkflow; error?: string }>

  update(
    workflowId: string,
    data: Partial<OFWorkflow>
  ): Promise<{ success: boolean; data?: OFWorkflow; error?: string }>

  delete(workflowId: string): Promise<{ success: boolean; error?: string }>

  listGenerationSessions(): Promise<{ success: boolean; data?: OFGenerationSession[]; error?: string }>
  getGenerationSession(sessionId: string): Promise<{
    success: boolean
    data?: OFGenerationSession
    error?: string
  }>
  createGenerationSession(data: {
    workflow_name: string
    description?: string
    prompt?: string
  }): Promise<{ success: boolean; data?: OFGenerationSession; error?: string }>
  sendGenerationPrompt(sessionId: string, prompt: string): Promise<{
    success: boolean
    data?: OFGenerationSession
    error?: string
  }>
  sendGenerationAgentMessage(
    sessionId: string,
    agentId: OFGenerationAgentId,
    input: string
  ): Promise<{ success: boolean; data?: OFGenerationSession; error?: string }>
  resolveGenerationApproval(
    sessionId: string,
    approvalId: string,
    decision: 'approved' | 'rejected',
    note?: string
  ): Promise<{ success: boolean; data?: OFGenerationSession; error?: string }>
  runGenerationStage(
    sessionId: string,
    stage: 'draft' | 'plan' | 'topology' | 'validation'
  ): Promise<{ success: boolean; data?: OFGenerationSession; error?: string }>
  advanceGenerationPhase(sessionId: string, phase: OFGenerationPhase): Promise<{
    success: boolean
    data?: OFGenerationSession
    error?: string
  }>
  rollbackGenerationCheckpoint(sessionId: string, checkpointId: string): Promise<{
    success: boolean
    data?: OFGenerationSession
    error?: string
  }>
  updateGenerationPhaseModels(
    sessionId: string,
    phaseModels: Record<OFGenerationPhase, OFGenerationPhaseModelConfig>
  ): Promise<{ success: boolean; data?: OFGenerationSession; error?: string }>
  updateGenerationAgentConfig(
    sessionId: string,
    agentId: OFGenerationAgentId,
    patch: Partial<OFGenerationAgentRuntimeConfig>
  ): Promise<{ success: boolean; data?: OFGenerationSession; error?: string }>
  confirmGenerationSession(sessionId: string): Promise<{
    success: boolean
    data?: { session: OFGenerationSession; workflowId: string }
    error?: string
  }>
  deleteGenerationSession(sessionId: string): Promise<{
    success: boolean
    data?: boolean
    error?: string
  }>
  onGenerationAgentEvent(callback: (event: OFGenerationAgentEvent) => void): () => void

  getAISchemaBundle(): Promise<{ success: boolean; data?: OFAISchemaBundle; error?: string }>
  run(
    workflowId: string,
    inputs?: Record<string, unknown>
  ): Promise<{ success: boolean; data?: OFWorkflowRunResult; error?: string }>
  runNodeDebug(params: OFNodeDebugRunParams): Promise<{
    success: boolean
    data?: OFNodeDebugResult
    error?: string
  }>
  stop(runId: string): Promise<{ success: boolean; error?: string }>
  onProgress(callback: (runId: string, progress: OFNodeTracing) => void): () => void
}
