/**
 * OrchestraFlow IPC 消息类型定义
 *
 * 定义 Main 进程 ↔ UtilityProcess(orchestraflow) 之间的消息协议
 */

import type {
  OFWorkflow,
  OFModelConfig,
  OFPromptItem,
  OFNodeTracing,
  OFWorkflowRunResult,
  OFInputVar
} from '@shared/Orchestraflow-types'

// ==================== Config Types ====================

export interface OFProcessConfig {
  knowledgeApiUrl?: string
  modelConfigs?: Record<string, OFModelConfig>
}

// ==================== Workflow Run Types ====================

export interface OFWorkflowRunRequest {
  runId: string
  workflow: OFWorkflow
  inputs: Record<string, any>
}

// ==================== Node Execution Types ====================

export interface OFNodeExecutionInput {
  nodeId: string
  inputs: Record<string, any>
}

export interface OFNodeExecutionOutput {
  nodeId: string
  outputs: Record<string, any>
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
      inputs: Record<string, any>
    }
  | {
      type: 'workflow:stop'
      runId: string
    }

// ==================== Utility -> Main ====================

export type OFToMainMessage =
  | { type: 'process:ready' }
  | { type: 'process:error'; message: string; details?: string }
  | { type: 'workflow:progress'; runId: string; progress: OFNodeTracing }
  | { type: 'workflow:result'; runId: string; result: OFWorkflowRunResult }
  | { type: 'workflow:error'; runId: string; error: string }
