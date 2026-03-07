import type {
  OFNodeDebugResult,
  OFNode,
  OFNodeTracing,
  OFSubWorkflowGraph,
  OFWorkflow,
  OFWorkflowGraph,
  OFWorkflowRunResult
} from '@shared/Orchestraflow-types'
import {
  buildOFNodeTraceKey,
  OFBlockEnum,
  OFNodeRunningStatus,
  OFWorkflowRunningStatus
} from '@shared/Orchestraflow-types'
import { executeNode } from '../services/executor'
import { GraphExecutor } from '../services/graph-executor'
import { VariableStore } from '../services/variable-store'

export interface WorkflowInstance {
  runId: string
  workflow: OFWorkflow
  status: OFWorkflowRunningStatus
  startTime: number
  endTime?: number
  tracing: OFNodeTracing[]
  variableStore: VariableStore
  outputs?: Record<string, any>
  error?: string
}

export class WorkflowInstanceManager {
  private readonly instances: Map<string, WorkflowInstance> = new Map()
  private readonly sendMessage: (msg: any) => void

  constructor(sendMessage: (msg: any) => void) {
    this.sendMessage = sendMessage
  }

  async runWorkflow(
    runId: string,
    workflow: OFWorkflow,
    inputs: Record<string, any>,
    providerConfigs: Record<
      string,
      {
        id: string
        name: string
        baseUrl: string
        apiKey: string
        enabled: boolean
      }
    > = {}
  ): Promise<OFWorkflowRunResult> {
    const instance: WorkflowInstance = {
      runId,
      workflow,
      status: OFWorkflowRunningStatus.Running,
      startTime: Date.now(),
      tracing: [],
      variableStore: new VariableStore()
    }
    this.instances.set(runId, instance)
    this.seedVariableStore(instance.variableStore, workflow, runId, inputs)

    try {
      const executor = new GraphExecutor({
        runId,
        workflowId: workflow.id,
        providerConfigs,
        emitProgress: (progress) => this.sendProgress(runId, progress),
        isStopped: () => this.instances.get(runId)?.status === OFWorkflowRunningStatus.Stopped
      })

      const graphResult = await executor.executeGraph({
        graph: workflow.graph,
        variableStore: instance.variableStore,
        initialInputs: inputs,
        scopePath: []
      })

      instance.tracing = executor.getTracing()
      instance.endTime = Date.now()

      if (graphResult.status === 'stopped') {
        instance.status = OFWorkflowRunningStatus.Stopped
      } else if (graphResult.status === 'failed') {
        instance.status = OFWorkflowRunningStatus.Failed
        instance.error = graphResult.error
      } else {
        instance.status = OFWorkflowRunningStatus.Succeeded
        instance.outputs = this.toSerializable(graphResult.outputs)
      }

      return this.buildResult(instance)
    } catch (error) {
      instance.status = OFWorkflowRunningStatus.Failed
      instance.error = error instanceof Error ? error.message : String(error)
      instance.endTime = Date.now()
      return this.buildResult(instance)
    }
  }

  async runNodeDebug(
    workflow: OFWorkflow,
    nodeId: string,
    inputs: Record<string, any>,
    providerConfigs: Record<
      string,
      {
        id: string
        name: string
        baseUrl: string
        apiKey: string
        enabled: boolean
      }
    > = {},
    scopePath?: string[]
  ): Promise<OFNodeDebugResult> {
    const resolvedGraph = this.resolveDebugGraph(workflow, scopePath)
    if ('error' in resolvedGraph) {
      return {
        nodeId,
        nodeType: workflow.graph.nodes.find((item) => item.id === nodeId)?.data.type || OFBlockEnum.Start,
        status: OFNodeRunningStatus.Failed,
        error: resolvedGraph.error,
        inputs: this.toSerializable(inputs || {})
      }
    }

    const node = resolvedGraph.graph.nodes.find((item) => item.id === nodeId)
    if (!node) {
      return {
        nodeId,
        nodeType: OFBlockEnum.Start,
        status: OFNodeRunningStatus.Failed,
        error: `Node not found: ${nodeId}`,
        inputs: this.toSerializable(inputs || {})
      }
    }

    const start = Date.now()
    const variableStore = new VariableStore()
    const debugRunId = `debug_${Date.now()}`
    this.seedVariableStore(variableStore, workflow, debugRunId, inputs || {})

    const executor = new GraphExecutor({
      runId: debugRunId,
      workflowId: workflow.id,
      providerConfigs,
      emitProgress: () => undefined,
      isStopped: () => false
    })

    const result = await executeNode({
      node,
      graph: resolvedGraph.graph,
      variableStore,
      initialInputs: inputs || {},
      providerConfigs,
      runId: debugRunId,
      scopePath: resolvedGraph.scopePath,
      traceKey: buildOFNodeTraceKey({
        runId: debugRunId,
        workflowId: workflow.id,
        nodeId: node.id,
        scopePath: resolvedGraph.scopePath
      }),
      executeGraph: (params) => executor.executeGraph(params),
      isStopped: () => false
    })

    return {
      nodeId: node.id,
      nodeType: node.data.type,
      status: result.error ? OFNodeRunningStatus.Failed : OFNodeRunningStatus.Succeeded,
      elapsed_time: Date.now() - start,
      inputs: this.toSerializable(result.inputs || inputs || {}),
      outputs: this.toSerializable(result.outputs || {}),
      error: result.error
    }
  }

  private resolveDebugGraph(
    workflow: OFWorkflow,
    scopePath?: string[]
  ):
    | { graph: OFWorkflowGraph | OFSubWorkflowGraph; scopePath: string[] }
    | { error: string } {
    let graph: OFWorkflowGraph | OFSubWorkflowGraph = workflow.graph
    const resolvedScopePath: string[] = []

    for (const scopeNodeId of scopePath || []) {
      const scopeNode = graph.nodes.find((item) => item.id === scopeNodeId)
      if (!scopeNode) {
        return {
          error: `Scope node not found: ${scopeNodeId}`
        }
      }

      if (scopeNode.data.type !== OFBlockEnum.Iteration && scopeNode.data.type !== OFBlockEnum.Loop) {
        return {
          error: `Scope node ${scopeNodeId} is not a container node`
        }
      }

      graph = scopeNode.data.subgraph
      resolvedScopePath.push(scopeNodeId)
    }

    return {
      graph,
      scopePath: resolvedScopePath
    }
  }

  stopWorkflow(runId: string): void {
    const instance = this.instances.get(runId)
    if (instance && instance.status === OFWorkflowRunningStatus.Running) {
      instance.status = OFWorkflowRunningStatus.Stopped
      instance.endTime = Date.now()
    }
  }

  getInstance(runId: string): WorkflowInstance | undefined {
    return this.instances.get(runId)
  }

  destroyInstance(runId: string): void {
    this.instances.delete(runId)
  }

  private sendProgress(runId: string, progress: OFNodeTracing): void {
    this.sendMessage({
      type: 'workflow:progress',
      runId,
      progress
    })
  }

  private buildResult(instance: WorkflowInstance): OFWorkflowRunResult {
    return {
      status: instance.status,
      elapsed_time: instance.endTime ? instance.endTime - instance.startTime : undefined,
      tracing: this.toSerializable(instance.tracing),
      outputs: this.toSerializable(instance.outputs),
      error: instance.error
    }
  }

  private seedVariableStore(
    variableStore: VariableStore,
    workflow: OFWorkflow,
    runId: string,
    inputs: Record<string, any>
  ): void {
    Object.entries(inputs || {}).forEach(([key, value]) => {
      variableStore.set(key, value)
    })
    variableStore.set('sys.user_id', inputs?.user_id ?? '')
    variableStore.set('sys.app_id', 'LuminaStudio')
    variableStore.set('sys.workflow_id', workflow.id)
    variableStore.set('sys.workflow_run_id', runId)
    variableStore.set('sys.timestamp', Date.now())
  }

  private toSerializable<T>(value: T): T {
    if (value === undefined) {
      return value
    }
    const seen = new WeakSet<object>()
    return JSON.parse(
      JSON.stringify(value, (_key, currentValue) => {
        if (typeof currentValue === 'bigint') {
          return currentValue.toString()
        }
        if (typeof currentValue === 'function' || typeof currentValue === 'symbol') {
          return undefined
        }
        if (currentValue instanceof Error) {
          return {
            name: currentValue.name,
            message: currentValue.message,
            stack: currentValue.stack
          }
        }
        if (currentValue && typeof currentValue === 'object') {
          if (seen.has(currentValue)) {
            return '[Circular]'
          }
          seen.add(currentValue)
        }
        return currentValue
      })
    ) as T
  }
}
