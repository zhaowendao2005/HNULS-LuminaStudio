/**
 * OrchestraFlow 节点类型定义
 */
import type {
  OFStartNodeData,
  OFLLMNodeData,
  OFIfElseNodeData,
  OFIterationNodeData,
  OFIterationStartNodeData,
  OFLoopNodeData,
  OFLoopStartNodeData,
  OFNodeExecutionMetadata,
  OFEndNodeData,
  OFNode,
  OFWorkflowGraph
} from '@shared/Orchestraflow-types'
import type { VariableStore } from '../services/variable-store'

export type OFNodeData =
  | OFStartNodeData
  | OFLLMNodeData
  | OFIfElseNodeData
  | OFIterationNodeData
  | OFIterationStartNodeData
  | OFLoopNodeData
  | OFLoopStartNodeData
  | OFEndNodeData

export interface IterationExecutionContext {
  iterationNodeId: string
  iterationTitle: string
  iterationLength: number
  item: unknown
  index: number
  inIterationId: string
  parallelRunId?: string
  scopePath?: string[]
}

export interface LoopExecutionContext {
  loopNodeId: string
  loopTitle: string
  loopCount: number
  index: number
  inLoopId: string
  scopePath?: string[]
}

export interface ExecuteGraphParams {
  graph: OFWorkflowGraph
  variableStore: VariableStore
  initialInputs?: Record<string, any>
  startNodeId?: string
  scopePath?: string[]
  iterationContext?: IterationExecutionContext
  loopContext?: LoopExecutionContext
}

export interface GraphExecutionResult {
  status: 'succeeded' | 'failed' | 'stopped'
  outputs?: Record<string, any>
  error?: string
}

export interface ExecutionContext {
  runId: string
  node: OFNode
  graph: OFWorkflowGraph
  inputs: Record<string, any>
  variables: Record<string, any>
  scopePath: string[]
  traceKey: string
  executionMetadata?: OFNodeExecutionMetadata
  iterationContext?: IterationExecutionContext
  loopContext?: LoopExecutionContext
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
  executeGraph: (params: ExecuteGraphParams) => Promise<GraphExecutionResult>
  isStopped: () => boolean
}

export interface NodeResult {
  inputs?: Record<string, any>
  outputs: Record<string, any>
  error?: string
  control?: {
    selectedSourceHandleIds?: string[]
  }
}
