/**
 * executeNode - 执行单个节点
 */
import type { OFNode, OFNodeExecutionMetadata, OFWorkflowGraph } from '@shared/Orchestraflow-types'
import { NodeFactory } from '../nodes/node-factory'
import { VariableStore } from './variable-store'
import type {
  ExecuteGraphParams,
  IterationExecutionContext,
  LoopExecutionContext,
  NodeResult
} from '../nodes/types'

export interface ExecuteNodeParams {
  node: OFNode
  graph: OFWorkflowGraph
  variableStore: VariableStore
  initialInputs: Record<string, any>
  providerConfigs: Record<
    string,
    {
      id: string
      name: string
      baseUrl: string
      apiKey: string
      enabled: boolean
    }
  >
  runId: string
  scopePath: string[]
  traceKey: string
  executionMetadata?: OFNodeExecutionMetadata
  iterationContext?: IterationExecutionContext
  loopContext?: LoopExecutionContext
  executeGraph: (params: ExecuteGraphParams) => Promise<{ status: 'succeeded' | 'failed' | 'stopped'; outputs?: Record<string, any>; error?: string }>
  isStopped: () => boolean
}

export async function executeNode(params: ExecuteNodeParams): Promise<NodeResult> {
  const inputs: Record<string, any> = {}
  const allVars = params.variableStore.getAll()
  Object.assign(inputs, allVars)
  Object.assign(inputs, params.initialInputs)

  const nodeInstance = NodeFactory.createNode(params.node, params.variableStore)
  const context = {
    runId: params.runId,
    node: params.node,
    graph: params.graph,
    inputs,
    variables: allVars,
    scopePath: params.scopePath,
    traceKey: params.traceKey,
    executionMetadata: params.executionMetadata,
    iterationContext: params.iterationContext,
    loopContext: params.loopContext,
    providerConfigs: params.providerConfigs,
    executeGraph: params.executeGraph,
    isStopped: params.isStopped
  }
  nodeInstance.setContext(context)

  const result = await nodeInstance.execute(context)
  return {
    ...result,
    inputs
  }
}
