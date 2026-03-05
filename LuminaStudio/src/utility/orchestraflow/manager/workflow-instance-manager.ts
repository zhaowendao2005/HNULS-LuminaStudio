/**
 * WorkflowInstance - 工作流实例
 *
 * 表示一个正在运行或已完成的工作流实例
 */
import type {
  OFWorkflow,
  OFNodeTracing,
  OFWorkflowRunResult
} from '@shared/Orchestraflow-types'
import { OFWorkflowRunningStatus, OFNodeRunningStatus } from '@shared/Orchestraflow-types'
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

    try {
      // 拓扑排序获取执行顺序
      const nodeLevels = this.topologicalLevels(workflow.graph.nodes, workflow.graph.edges)

      // 按层执行：同层并行，层间串行
      for (const levelNodes of nodeLevels) {
        // 检查是否被停止
        const currentInstance = this.instances.get(runId)
        if (!currentInstance || currentInstance.status === OFWorkflowRunningStatus.Stopped) {
          instance.status = OFWorkflowRunningStatus.Stopped
          instance.endTime = Date.now()
          return this.buildResult(instance)
        }

        // 先给本层所有节点发送 running 进度
        for (const node of levelNodes) {
          const nodeTracing: OFNodeTracing = {
            nodeId: node.id,
            nodeType: node.data.type,
            status: OFNodeRunningStatus.Running,
            inputs: {}
          }
          instance.tracing.push(nodeTracing)
          this.sendProgress(runId, nodeTracing)
        }

        const { executeNode } = await import('../services/executor')
        const levelResults = await Promise.all(
          levelNodes.map(async (node) => {
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
                outputs: result.outputs,
                error: result.error,
                elapsed: Date.now() - nodeStartTime
              }
            } catch (error) {
              return {
                nodeId: node.id,
                status: OFNodeRunningStatus.Failed,
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
      }

      // 所有节点执行完成
      instance.status = OFWorkflowRunningStatus.Succeeded
      instance.endTime = Date.now()

      // 收集最终输出
      const endNode = workflow.graph.nodes.find((n) => n.data.type === 'end')
      if (endNode) {
        const endTracing = instance.tracing.find((t) => t.nodeId === endNode.id)
        instance.outputs = endTracing?.outputs || {}
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
      tracing: instance.tracing,
      outputs: instance.outputs,
      error: instance.error
    }
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
