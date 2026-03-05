/**
 * OrchestraFlow IPC 消息类型定义
 *
 * 定义 Main 进程 ↔ UtilityProcess(orchestraflow) 之间的消息协议
 */

import type {
  OFWorkflow,
  OFModelConfig,
  OFNodeTracing,
  OFWorkflowRunResult,
  OFNodeDebugResult
} from '@shared/Orchestraflow-types'

// ==================== Config Types ====================

export interface OFProcessConfig {
  knowledgeApiUrl?: string
  modelConfigs?: Record<string, OFModelConfig>
}

// ==================== Provider Config Types ====================

export interface OFProviderConfig {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  enabled: boolean
}

export type OFProviderConfigsMap = Record<string, OFProviderConfig>

// ==================== Workflow Run Types ====================

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
  providerConfigs?: OFProviderConfigsMap
}

// ==================== Node Execution Types ====================

export interface OFNodeExecutionInput {
  nodeId: string
  inputs: Record<string, unknown>
}

export interface OFNodeExecutionOutput {
  nodeId: string
  outputs: Record<string, unknown>
}

// ==================== Main -> Utility ====================

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
      providerConfigs?: OFProviderConfigsMap
    }

// ==================== Utility -> Main ====================

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
