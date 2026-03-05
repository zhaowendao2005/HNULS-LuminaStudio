/**
 * OrchestraFlow 节点类型定义
 */
import type {
  OFBlockEnum,
  OFStartNodeData,
  OFLLMNodeData,
  OFEndNodeData,
  OFNode
} from '@shared/Orchestraflow-types'

export type OFNodeData = OFStartNodeData | OFLLMNodeData | OFEndNodeData

export interface ExecutionContext {
  runId: string
  node: OFNode
  inputs: Record<string, any>
  variables: Record<string, any>
  providerConfigs?: Record<string, {
    id: string
    name: string
    baseUrl: string
    apiKey: string
    enabled: boolean
  }>
}

export interface NodeResult {
  outputs: Record<string, any>
  error?: string
}
