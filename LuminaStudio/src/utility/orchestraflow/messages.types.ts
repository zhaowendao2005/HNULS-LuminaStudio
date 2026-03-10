/**
 * OrchestraFlow IPC 消息类型定义
 */

import type {
  OFWorkflow,
  OFWorkflowGraph,
  OFModelConfig,
  OFNodeTracing,
  OFWorkflowRunResult,
  OFNodeDebugResult,
  OFGenerationPhase,
  OFGenerationSession,
  OFGenerationAgentId,
  OFGenerationAgentEvent,
  OFGenerationAgentRuntimeConfig
} from '@shared/Orchestraflow-types'

export interface OFProcessConfig {
  knowledgeApiUrl?: string
  modelConfigs?: Record<string, OFModelConfig>
}

export interface OFProviderConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  apiMode?: 'auto' | 'responses' | 'chat-completions'
  enabled: boolean
  defaultHeaders?: Record<string, string>
}

export type OFProviderConfigsMap = Record<string, OFProviderConfig>

export interface OFWorkflowRunRequest {
  runId: string
  workflow: OFWorkflow
  inputs: Record<string, unknown>
  providerConfigs?: OFProviderConfigsMap
}

export interface OFNodeDebugRunRequest {
  requestId: string
  workflow: OFWorkflow
  nodeId: string
  inputs: Record<string, unknown>
  scopePath?: string[]
  providerConfigs?: OFProviderConfigsMap
}

export interface OFNodeExecutionInput {
  nodeId: string
  graph?: OFWorkflowGraph
  inputs: Record<string, unknown>
}

export interface OFNodeExecutionOutput {
  nodeId: string
  outputs: Record<string, unknown>
}

export type MainToOFMessage =
  | {
      type: 'process:init'
      config: OFProcessConfig
    }
  | {
      type: 'process:shutdown'
    }
  | {
      type: 'workflow:run'
      runId: string
      workflow: OFWorkflow
      inputs: Record<string, unknown>
      providerConfigs?: OFProviderConfigsMap
    }
  | {
      type: 'workflow:stop'
      runId: string
    }
  | {
      type: 'node:debug-run'
      requestId: string
      workflow: OFWorkflow
      nodeId: string
      inputs: Record<string, unknown>
      scopePath?: string[]
      providerConfigs?: OFProviderConfigsMap
    }
  | {
      type: 'generation:send-prompt'
      session: OFGenerationSession
      prompt: string
      providerConfigs?: OFProviderConfigsMap
    }
  | {
      type: 'generation:advance-phase'
      session: OFGenerationSession
      phase: OFGenerationPhase
      providerConfigs?: OFProviderConfigsMap
    }
  | {
      type: 'generation:rollback-checkpoint'
      session: OFGenerationSession
      checkpointId: string
      providerConfigs?: OFProviderConfigsMap
    }
  | {
      type: 'generation:send-agent-message'
      session: OFGenerationSession
      agentId: OFGenerationAgentId
      input: string
      requestId: string
      providerConfigs?: OFProviderConfigsMap
    }
  | {
      type: 'generation:resolve-approval'
      session: OFGenerationSession
      approvalId: string
      decision: 'approved' | 'rejected'
      note?: string
      requestId: string
      providerConfigs?: OFProviderConfigsMap
    }
  | {
      type: 'generation:run-stage'
      session: OFGenerationSession
      stage: 'draft' | 'plan' | 'topology' | 'validation'
      requestId: string
      providerConfigs?: OFProviderConfigsMap
    }
  | {
      type: 'generation:update-agent-config'
      session: OFGenerationSession
      agentId: OFGenerationAgentId
      patch: Partial<OFGenerationAgentRuntimeConfig>
      providerConfigs?: OFProviderConfigsMap
    }

export type OFToMainMessage =
  | { type: 'process:ready' }
  | { type: 'process:error'; message: string; details?: string }
  | {
      type: 'process:log'
      level: 'log' | 'error' | 'warn' | 'info' | 'debug'
      message: string
      timestamp: number
    }
  | { type: 'workflow:progress'; runId: string; progress: OFNodeTracing }
  | { type: 'workflow:result'; runId: string; result: OFWorkflowRunResult }
  | { type: 'workflow:error'; runId: string; error: string }
  | { type: 'node:debug-result'; requestId: string; result: OFNodeDebugResult }
  | { type: 'node:debug-error'; requestId: string; error: string }
  | { type: 'generation:session'; session: OFGenerationSession }
  | { type: 'generation:error'; error: string; requestId?: string }
  | { type: 'generation:agent-event'; event: OFGenerationAgentEvent }
