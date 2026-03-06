/**
 * WorkflowInstance - 工作流实例
 *
 * 表示一个正在运行或已完成的工作流实例
 */
import type {
  OFWorkflow,
  OFNodeTracing,
  OFWorkflowRunResult,
  OFNodeDebugResult,
  OFEdge,
  OFNode
} from '@shared/Orchestraflow-types'
import {
  OFWorkflowRunningStatus,
  OFNodeRunningStatus,
  OFBlockEnum
} from '@shared/Orchestraflow-types'
import { VariableStore } from '../services/variable-store'
import { executeNode } from '../services/executor'

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

/**
 * WorkflowInstanceManager - 工作流实例管理器
 *
 * 职责：
 * - 管理多个工作流实例（Map<runId, WorkflowInstance>）
 * - 创建/销毁工作流实例
 * - 处理节点执行顺序（拓扑排序）
 * - 收集节点输入输出，维护上下文变量
 */
export class WorkflowInstanceManager {
  private instances: Map<string, WorkflowInstance> = new Map()
  private sendMessage: (msg: any) => void

  constructor(sendMessage: (msg: any) => void) {
    this.sendMessage = sendMessage
  }

  /**
   * 创建并运行工作流实例
   */
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
    // 创建实例
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
      const nodeLevels = this.topologicalLevels(workflow.graph.nodes, workflow.graph.edges)
      const edgesBySource = this.buildEdgesBySource(workflow.graph.edges)
      let activeNodeIds = new Set((nodeLevels[0] || workflow.graph.nodes).map((node) => node.id))

      for (const levelNodes of nodeLevels) {
        const currentInstance = this.instances.get(runId)
        if (!currentInstance || currentInstance.status === OFWorkflowRunningStatus.Stopped) {
          instance.status = OFWorkflowRunningStatus.Stopped
          instance.endTime = Date.now()
          return this.buildResult(instance)
        }

        const runnableNodes = levelNodes.filter((node) => activeNodeIds.has(node.id))
        const skippedNodes = levelNodes.filter((node) => !activeNodeIds.has(node.id))

        for (const node of skippedNodes) {
          this.markNodeSkipped(runId, instance, node)
        }

        if (runnableNodes.length === 0) {
          activeNodeIds = new Set()
          continue
        }

        for (const node of runnableNodes) {
          const nodeTracing: OFNodeTracing = {
            nodeId: node.id,
            nodeType: node.data.type,
            status: OFNodeRunningStatus.Running,
            inputs: {}
          }
          instance.tracing.push(nodeTracing)
          this.sendProgress(runId, nodeTracing)
        }

        const levelResults = await Promise.all(
          runnableNodes.map(async (node) => {
            const nodeStartTime = Date.now()
            try {
              const result = await executeNode(
                node,
                instance.variableStore,
                inputs,
                instance.tracing,
                providerConfigs
              )
              return {
                nodeId: node.id,
                status: result.error ? OFNodeRunningStatus.Failed : OFNodeRunningStatus.Succeeded,
                inputs: this.toSerializable(result.inputs || {}),
                outputs: this.toSerializable(result.outputs),
                control: result.control,
                error: result.error,
                elapsed: Date.now() - nodeStartTime
              }
            } catch (error) {
              return {
                nodeId: node.id,
                status: OFNodeRunningStatus.Failed,
                inputs: {},
                outputs: {},
                error: error instanceof Error ? error.message : String(error),
                elapsed: Date.now() - nodeStartTime
              }
            }
          })
        )

        // 汇总本层结果，并推送进度
        for (const resultItem of levelResults) {
          const tracingIndex = instance.tracing.findIndex((t) => t.nodeId === resultItem.nodeId)
          if (tracingIndex >= 0) {
            instance.tracing[tracingIndex] = {
              ...instance.tracing[tracingIndex],
              status: resultItem.status,
              elapsed_time: resultItem.elapsed,
              inputs: resultItem.inputs,
              outputs: resultItem.outputs,
              error: resultItem.error
            }
            this.sendProgress(runId, instance.tracing[tracingIndex])
          }
        }

        // 本层任一节点失败，则整体失败
        const firstFailed = levelResults.find((item) => item.status === OFNodeRunningStatus.Failed)
        if (firstFailed) {
          instance.status = OFWorkflowRunningStatus.Failed
          instance.error = firstFailed.error || 'Node execution failed'
          instance.endTime = Date.now()
          return this.buildResult(instance)
        }

        const nextActiveNodeIds = new Set<string>()
        for (const resultItem of levelResults) {
          const outgoingEdges = edgesBySource.get(resultItem.nodeId) || []
          for (const edge of outgoingEdges) {
            if (this.shouldFollowEdge(edge, resultItem.control?.selectedSourceHandleIds)) {
              nextActiveNodeIds.add(edge.target)
            }
          }
        }
        activeNodeIds = nextActiveNodeIds
      }

      for (const node of workflow.graph.nodes) {
        if (!instance.tracing.some((item) => item.nodeId === node.id)) {
          this.markNodeSkipped(runId, instance, node)
        }
      }

      // 所有节点执行完成
      instance.status = OFWorkflowRunningStatus.Succeeded
      instance.endTime = Date.now()

      // 收集最终输出
      const endNode = workflow.graph.nodes.find((n) => n.data.type === 'end')
      if (endNode) {
        const endTracing = instance.tracing.find((t) => t.nodeId === endNode.id)
        instance.outputs = this.toSerializable(endTracing?.outputs || {})
      }

      return this.buildResult(instance)
    } catch (error) {
      instance.status = OFWorkflowRunningStatus.Failed
      instance.error = error instanceof Error ? error.message : String(error)
      instance.endTime = Date.now()
      return this.buildResult(instance)
    }
  }

  /**
   * 执行单节点调试
   */
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
    > = {}
  ): Promise<OFNodeDebugResult> {
    const node = workflow.graph.nodes.find((item) => item.id === nodeId)
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

    const result = await executeNode(node, variableStore, inputs || {}, [], providerConfigs)
    const elapsed = Date.now() - start

    return {
      nodeId: node.id,
      nodeType: node.data.type,
      status: result.error ? OFNodeRunningStatus.Failed : OFNodeRunningStatus.Succeeded,
      elapsed_time: elapsed,
      inputs: this.toSerializable(result.inputs || inputs || {}),
      outputs: this.toSerializable(result.outputs),
      error: result.error
    }
  }

  /**
   * 停止工作流运行
   */
  stopWorkflow(runId: string): void {
    const instance = this.instances.get(runId)
    if (instance && instance.status === OFWorkflowRunningStatus.Running) {
      instance.status = OFWorkflowRunningStatus.Stopped
      instance.endTime = Date.now()
    }
  }

  /**
   * 获取工作流实例
   */
  getInstance(runId: string): WorkflowInstance | undefined {
    return this.instances.get(runId)
  }

  /**
   * 销毁工作流实例
   */
  destroyInstance(runId: string): void {
    this.instances.delete(runId)
  }

  /**
   * 发送进度
   */
  private sendProgress(runId: string, progress: OFNodeTracing): void {
    this.sendMessage({
      type: 'workflow:progress',
      runId,
      progress
    })
  }

  /**
   * 构建运行结果
   */
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

  private markNodeSkipped(runId: string, instance: WorkflowInstance, node: OFNode): void {
    if (instance.tracing.some((item) => item.nodeId === node.id)) {
      return
    }
    const tracing: OFNodeTracing = {
      nodeId: node.id,
      nodeType: node.data.type,
      status: OFNodeRunningStatus.Skipped,
      inputs: {},
      outputs: {}
    }
    instance.tracing.push(tracing)
    this.sendProgress(runId, tracing)
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

  /**
   * 拓扑分层 - 每层可以并行执行，层与层之间串行
   */
  private topologicalLevels(nodes: any[], edges: any[]): any[][] {
    // 构建邻接表和入度表
    const adjacencyList = new Map<string, string[]>()
    const inDegree = new Map<string, number>()

    // 初始化
    for (const node of nodes) {
      adjacencyList.set(node.id, [])
      inDegree.set(node.id, 0)
    }

    // 构建图（注意：edges 的 source -> target 表示从 source 指向 target）
    // 在工作流中，边的方向表示数据流向，所以我们需要反向执行
    for (const edge of edges) {
      const targets = adjacencyList.get(edge.source) || []
      targets.push(edge.target)
      adjacencyList.set(edge.source, targets)
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1)
    }

    // 找到所有入度为 0 的节点（起点）
    const queue: string[] = []
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) {
        queue.push(nodeId)
      }
    })

    // 执行分层拓扑排序
    const levels: any[][] = []
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    while (queue.length) {
      const currentLevelIds = [...queue]
      queue.length = 0
      const currentLevelNodes: any[] = []

      for (const nodeId of currentLevelIds) {
        const node = nodeMap.get(nodeId)
        if (node) {
          currentLevelNodes.push(node)
        }

        const targets = adjacencyList.get(nodeId) || []
        for (const targetId of targets) {
          const newDegree = (inDegree.get(targetId) || 1) - 1
          inDegree.set(targetId, newDegree)
          if (newDegree === 0) {
            queue.push(targetId)
          }
        }
      }

      if (currentLevelNodes.length) {
        levels.push(currentLevelNodes)
      }
    }

    // 如果层级总数不足，说明有环，回退到串行执行
    const count = levels.reduce((sum, level) => sum + level.length, 0)
    if (count !== nodes.length) {
      return nodes.map((node) => [node])
    }

    return levels
  }
}
