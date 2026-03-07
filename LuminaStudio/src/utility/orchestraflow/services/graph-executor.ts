import type {
  OFEdge,
  OFNode,
  OFNodeExecutionMetadata,
  OFNodeTracing,
} from '@shared/Orchestraflow-types'
import {
  buildOFNodeTraceKey,
  OFBlockEnum,
  OFNodeRunningStatus
} from '@shared/Orchestraflow-types'
import { executeNode } from './executor'
import type {
  ExecuteGraphParams,
  GraphExecutionResult,
  IterationExecutionContext,
  LoopExecutionContext
} from '../nodes/types'

interface GraphExecutorOptions {
  runId: string
  workflowId: string
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
  emitProgress: (trace: OFNodeTracing) => void
  isStopped: () => boolean
}

export class GraphExecutor {
  private readonly tracing: OFNodeTracing[] = []
  private readonly traceIndexes = new Map<string, number>()
  private readonly options: GraphExecutorOptions

  constructor(options: GraphExecutorOptions) {
    this.options = options
  }

  getTracing(): OFNodeTracing[] {
    return this.toSerializable(this.tracing)
  }

  async executeGraph(params: ExecuteGraphParams): Promise<GraphExecutionResult> {
    const nodeLevels = this.topologicalLevels(params.graph.nodes, params.graph.edges)
    const edgesBySource = this.buildEdgesBySource(params.graph.edges)
    let activeNodeIds = this.getInitialActiveNodeIds(nodeLevels, params.graph.nodes, params.startNodeId)
    let endOutputs: Record<string, any> | undefined

    for (const levelNodes of nodeLevels) {
      if (this.options.isStopped()) {
        return { status: 'stopped' }
      }

      const runnableNodes = levelNodes.filter((node) => activeNodeIds.has(node.id))
      const skippedNodes = levelNodes.filter((node) => !activeNodeIds.has(node.id))

      for (const node of skippedNodes) {
        this.markNodeSkipped(
          node,
          params.scopePath || [],
          params.iterationContext,
          params.loopContext
        )
      }

      if (runnableNodes.length === 0) {
        activeNodeIds = new Set()
        continue
      }

      for (const node of runnableNodes) {
        const trace = this.createTrace(
          node,
          OFNodeRunningStatus.Running,
          params.scopePath || [],
          params.iterationContext,
          params.loopContext
        )
        this.upsertTrace(trace)
      }

      const levelResults = await Promise.all(
        runnableNodes.map(async (node) => {
          const nodeStartTime = Date.now()
          const metadata = this.buildExecutionMetadata(
            params.scopePath || [],
            params.iterationContext,
            params.loopContext
          )
          const traceKey = this.buildTraceKey(node.id, params.scopePath || [], metadata)

          try {
            const result = await executeNode({
              node,
              graph: params.graph,
              variableStore: params.variableStore,
              initialInputs: params.initialInputs || {},
              providerConfigs: this.options.providerConfigs,
              runId: this.options.runId,
              scopePath: params.scopePath || [],
              traceKey,
              executionMetadata: metadata,
              iterationContext: params.iterationContext,
              loopContext: params.loopContext,
              executeGraph: (nextParams) => this.executeGraph(nextParams),
              isStopped: this.options.isStopped
            })

            return {
              node,
              traceKey,
              result,
              elapsed: Date.now() - nodeStartTime
            }
          } catch (error) {
            return {
              node,
              traceKey,
              result: {
                inputs: {},
                outputs: {},
                error: error instanceof Error ? error.message : String(error)
              },
              elapsed: Date.now() - nodeStartTime
            }
          }
        })
      )

      for (const item of levelResults) {
        const status = item.result.error
          ? OFNodeRunningStatus.Failed
          : OFNodeRunningStatus.Succeeded
        const nextTrace: OFNodeTracing = {
          ...this.getTrace(item.traceKey),
          nodeId: item.node.id,
          nodeType: item.node.data.type,
          status,
          trace_key: item.traceKey,
          scope_path: params.scopePath || [],
          execution_metadata: this.buildExecutionMetadata(
            params.scopePath || [],
            params.iterationContext,
            params.loopContext
          ),
          elapsed_time: item.elapsed,
          inputs: this.toSerializable(item.result.inputs || {}),
          outputs: this.toSerializable(item.result.outputs || {}),
          error: item.result.error
        }
        this.upsertTrace(nextTrace)
        if (item.node.data.type === OFBlockEnum.End && !item.result.error) {
          endOutputs = this.toSerializable(item.result.outputs || {})
        }
      }

      const firstFailed = levelResults.find((item) => item.result.error)
      if (firstFailed) {
        return {
          status: this.options.isStopped() ? 'stopped' : 'failed',
          error: firstFailed.result.error
        }
      }

      const nextActiveNodeIds = new Set<string>()
      for (const resultItem of levelResults) {
        const outgoingEdges = edgesBySource.get(resultItem.node.id) || []
        for (const edge of outgoingEdges) {
          if (this.shouldFollowEdge(edge, resultItem.result.control?.selectedSourceHandleIds)) {
            nextActiveNodeIds.add(edge.target)
          }
        }
      }
      activeNodeIds = nextActiveNodeIds
    }

    for (const node of params.graph.nodes) {
      const metadata = this.buildExecutionMetadata(
        params.scopePath || [],
        params.iterationContext,
        params.loopContext
      )
      const traceKey = this.buildTraceKey(node.id, params.scopePath || [], metadata)
      if (!this.traceIndexes.has(traceKey)) {
        this.markNodeSkipped(
          node,
          params.scopePath || [],
          params.iterationContext,
          params.loopContext
        )
      }
    }

    return {
      status: this.options.isStopped() ? 'stopped' : 'succeeded',
      outputs: endOutputs
    }
  }

  private getInitialActiveNodeIds(
    levels: OFNode[][],
    nodes: OFNode[],
    startNodeId?: string
  ): Set<string> {
    if (startNodeId) {
      return new Set([startNodeId])
    }
    const firstLevel = levels[0] || nodes
    return new Set(firstLevel.map((node) => node.id))
  }

  private buildEdgesBySource(edges: OFEdge[]): Map<string, OFEdge[]> {
    const map = new Map<string, OFEdge[]>()
    for (const edge of edges) {
      const current = map.get(edge.source) || []
      current.push(edge)
      map.set(edge.source, current)
    }
    return map
  }

  private shouldFollowEdge(edge: OFEdge, selectedSourceHandleIds?: string[]): boolean {
    if (!selectedSourceHandleIds || selectedSourceHandleIds.length === 0) {
      return true
    }
    const handleId = edge.sourceHandle || 'source'
    return selectedSourceHandleIds.includes(handleId)
  }

  private markNodeSkipped(
    node: OFNode,
    scopePath: string[],
    iterationContext?: IterationExecutionContext,
    loopContext?: LoopExecutionContext
  ): void {
    const trace = this.createTrace(
      node,
      OFNodeRunningStatus.Skipped,
      scopePath,
      iterationContext,
      loopContext
    )
    if (!this.traceIndexes.has(trace.trace_key || '')) {
      this.upsertTrace(trace)
    }
  }

  private createTrace(
    node: OFNode,
    status: OFNodeRunningStatus,
    scopePath: string[],
    iterationContext?: IterationExecutionContext,
    loopContext?: LoopExecutionContext
  ): OFNodeTracing {
    const executionMetadata = this.buildExecutionMetadata(scopePath, iterationContext, loopContext)
    return {
      nodeId: node.id,
      nodeType: node.data.type,
      status,
      trace_key: this.buildTraceKey(node.id, scopePath, executionMetadata),
      scope_path: scopePath,
      execution_metadata: executionMetadata,
      inputs: {},
      outputs: {}
    }
  }

  private buildExecutionMetadata(
    scopePath: string[],
    iterationContext?: IterationExecutionContext,
    loopContext?: LoopExecutionContext
  ): OFNodeExecutionMetadata | undefined {
    if (!iterationContext && !loopContext && scopePath.length === 0) {
      return undefined
    }

    return {
      in_iteration_id: iterationContext?.inIterationId,
      iteration_index: iterationContext?.index,
      iteration_length: iterationContext?.iterationLength,
      in_loop_id: loopContext?.inLoopId,
      loop_index: loopContext?.index,
      loop_count: loopContext?.loopCount,
      parallel_run_id: iterationContext?.parallelRunId,
      scope_path: scopePath
    }
  }

  private buildTraceKey(
    nodeId: string,
    scopePath: string[],
    metadata?: OFNodeExecutionMetadata
  ): string {
    return buildOFNodeTraceKey({
      runId: this.options.runId,
      workflowId: this.options.workflowId,
      nodeId,
      scopePath,
      executionMetadata: metadata
    })
  }

  private getTrace(traceKey: string): OFNodeTracing {
    const index = this.traceIndexes.get(traceKey)
    if (index === undefined) {
      throw new Error(`Trace not found: ${traceKey}`)
    }
    return this.tracing[index]
  }

  private upsertTrace(trace: OFNodeTracing): void {
    const traceKey = trace.trace_key || ''
    const currentIndex = this.traceIndexes.get(traceKey)
    const serialized = this.toSerializable(trace)
    if (currentIndex === undefined) {
      this.traceIndexes.set(traceKey, this.tracing.length)
      this.tracing.push(serialized)
    } else {
      this.tracing[currentIndex] = serialized
    }
    this.options.emitProgress(serialized)
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

  private topologicalLevels(nodes: OFNode[], edges: OFEdge[]): OFNode[][] {
    const adjacencyList = new Map<string, string[]>()
    const inDegree = new Map<string, number>()

    for (const node of nodes) {
      adjacencyList.set(node.id, [])
      inDegree.set(node.id, 0)
    }

    for (const edge of edges) {
      const targets = adjacencyList.get(edge.source) || []
      targets.push(edge.target)
      adjacencyList.set(edge.source, targets)
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    }

    const queue: string[] = []
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId)
      }
    })

    const levels: OFNode[][] = []
    const nodeMap = new Map(nodes.map((node) => [node.id, node]))

    while (queue.length) {
      const currentLevelIds = [...queue]
      queue.length = 0
      const currentLevelNodes: OFNode[] = []

      for (const nodeId of currentLevelIds) {
        const node = nodeMap.get(nodeId)
        if (node) {
          currentLevelNodes.push(node)
        }

        const targets = adjacencyList.get(nodeId) || []
        for (const targetId of targets) {
          const nextDegree = (inDegree.get(targetId) || 1) - 1
          inDegree.set(targetId, nextDegree)
          if (nextDegree === 0) {
            queue.push(targetId)
          }
        }
      }

      if (currentLevelNodes.length > 0) {
        levels.push(currentLevelNodes)
      }
    }

    const count = levels.reduce((sum, level) => sum + level.length, 0)
    if (count !== nodes.length) {
      return nodes.map((node) => [node])
    }

    return levels
  }
}
