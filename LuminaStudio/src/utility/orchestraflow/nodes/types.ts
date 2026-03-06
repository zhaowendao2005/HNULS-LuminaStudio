/**
 * OrchestraFlow 节点类型定义
 */
import type {
  OFStartNodeData,
  OFLLMNodeData,
  OFIfElseNodeData,
  OFEndNodeData,
  OFNode
} from '@shared/Orchestraflow-types'

export type OFNodeData = OFStartNodeData | OFLLMNodeData | OFIfElseNodeData | OFEndNodeData

export interface ExecutionContext {
  runId: string
  node: OFNode
  inputs: Record<string, any>
  variables: Record<string, any>
  providerConfigs?: Record<
    string,
    {
      id: string
      name: string
      baseUrl: string
      apiKey: string
      enabled: boolean
    }
  >
}

export interface NodeResult {
  inputs?: Record<string, any>
  outputs: Record<string, any>
  error?: string
  control?: {
    selectedSourceHandleIds?: string[]
  }
}
