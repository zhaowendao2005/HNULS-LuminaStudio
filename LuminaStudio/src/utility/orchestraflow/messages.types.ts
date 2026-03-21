/**
 * OrchestraFlow IPC 消息类型定义
 *
 * 定义 Main 进程 ↔ UtilityProcess(orchestraflow) 之间的消息协议
 */

import type {
  OFWorkflow,
  OFWorkflowGraph,
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
  defaultHeaders?: Record<string, string>
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
  scopePath?: string[]
  providerConfigs?: OFProviderConfigsMap
}

// ==================== Node Execution Types ====================

export interface OFNodeExecutionInput {
  nodeId: string
  graph?: OFWorkflowGraph
  inputs: Record<string, unknown>
}

export interface OFNodeExecutionOutput {
  nodeId: string
  outputs: Record<string, unknown>
}

// ==================== Private RPC Types ====================

export interface OFPrivateRpcRequestMap {
  'knowledge:retrieve': {
    query: string
    /**
     * 旧字段：单知识库目标。
     * 为兼容历史节点数据与旧 worker 请求，继续保留。
     */
    knowledgeBaseId?: number
    /**
     * 新字段：多知识库目标。
     * main service 会优先按该数组执行，并与旧字段做并集去重。
     */
    knowledgeBaseIds?: number[]
    permissionTree?: unknown
    k?: number
    ef?: number
    rerank?: {
      modelId?: string | null
      topN?: number | null
    }
  }
  'paper:retrieve': {
    provider_id: string
    api_key_ref_id: string | null
    provider_options: Record<string, unknown>
  }
}

export interface OFPrivateRpcResponseMap {
  'knowledge:retrieve': unknown
  'paper:retrieve': unknown
}

export type OFPrivateRpcChannel = keyof OFPrivateRpcRequestMap

export type OFPrivateRpcRequestMessage<TChannel extends OFPrivateRpcChannel = OFPrivateRpcChannel> =
  {
    type: 'private-rpc:request'
    requestId: string
    channel: TChannel
    payload: OFPrivateRpcRequestMap[TChannel]
  }
export type OFPrivateRpcResponseMessage<
  TChannel extends OFPrivateRpcChannel = OFPrivateRpcChannel
> =
  | {
      type: 'private-rpc:response'
      requestId: string
      channel: TChannel
      success: true
      payload: OFPrivateRpcResponseMap[TChannel]
    }
  | {
      type: 'private-rpc:response'
      requestId: string
      channel: TChannel
      success: false
      error: string
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
      scopePath?: string[]
      providerConfigs?: OFProviderConfigsMap
    }
  | OFPrivateRpcResponseMessage

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
  | OFPrivateRpcRequestMessage
