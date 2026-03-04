/**
 * WorkflowInstance - 工作流实例
 *
 * 表示一个正在运行或已完成的工作流实例
 */
import type { OFWorkflow, OFNodeTracing, OFWorkflowRunResult, OFWorkflowRunningStatus } from '@shared/Orchestraflow-types'
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
    inputs: Record<string, any>
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
      const sortedNodes = this.topologicalSort(workflow.graph.nodes, workflow.graph.edges)

      // 依次执行节点
      for (const node of sortedNodes) {
        // 检查是否被停止
        const currentInstance = this.instances.get(runId)
        if (!currentInstance || currentInstance.status === OFWorkflowRunningStatus.Stopped) {
          instance.status = OFWorkflowRunningStatus.Stopped
          instance.endTime = Date.now()
          return this.buildResult(instance)
        }

        // 发送节点开始进度
        const nodeTracing: OFNodeTracing = {
          nodeId: node.id,
          nodeType: node.data.type,
          status: OFNodeRunningStatus.Running,
          inputs: {}
        }
        instance.tracing.push(nodeTracing)
        this.sendProgress(runId, nodeTracing)

        // 执行节点
        const nodeStartTime = Date.now()
        try {
          const { node: execNode, variableStore } = instance
          const { executeNode } = await import('./executor')
          const result = await executeNode(node, instance.variableStore, inputs, instance.tracing)

          // 更新节点 tracing
          const tracingIndex = instance.tracing.findIndex((t) => t.nodeId === node.id)
          if (tracingIndex >= 0) {
            instance.tracing[tracingIndex] = {
              ...instance.tracing[tracingIndex],
              status: result.error ? OFNodeRunningStatus.Failed : OFNodeRunningStatus.Succeeded,
              elapsed_time: Date.now() - nodeStartTime,
              outputs: result.outputs,
              error: result.error
            }
          }

          // 发送节点完成进度
          this.sendProgress(runId, instance.tracing[tracingIndex])

          // 如果节点失败，工作流失败
          if (result.error) {
            instance.status = OFWorkflowRunningStatus.Failed
            instance.error = result.error
            instance.endTime = Date.now()
            return this.buildResult(instance)
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error)
          instance.status = OFWorkflowRunningStatus.Failed
          instance.error = errorMessage
          instance.endTime = Date.now()

          // 更新节点 tracing 为失败
          const tracingIndex = instance.tracing.findIndex((t) => t.nodeId === node.id)
          if (tracingIndex >= 0) {
            instance.tracing[tracingIndex].status = OFNodeRunningStatus.Failed
            instance.tracing[tracingIndex].error = errorMessage
          }

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
   * 拓扑排序 - 获取节点执行顺序
   */
  private topologicalSort(nodes: any[], edges: any[]): any[] {
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

    // 执行拓扑排序
    const result: any[] = []
    const nodeMap = new Map(nodes.map((n) => [n.id, n]))

    while (queue.length > 0) {
      const nodeId = queue.shift()!
      const node = nodeMap.get(nodeId)
      if (node) {
        result.push(node)
      }

      // 处理相邻节点
      const targets = adjacencyList.get(nodeId) || []
      for (const targetId of targets) {
        const newDegree = (inDegree.get(targetId) || 1) - 1
        inDegree.set(targetId, newDegree)
        if (newDegree === 0) {
          queue.push(targetId)
        }
      }
    }

    // 如果结果数量不等于节点数量，说明有环
    if (result.length !== nodes.length) {
      // 有环，返回原始顺序（前端应该保证无环）
      return nodes
    }

    return result
  }
}
