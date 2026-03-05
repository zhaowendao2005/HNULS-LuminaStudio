/**
 * executeNode - 执行单个节点
 *
 * 根据节点类型创建节点实例并执行
 */
import type { OFNode, OFNodeTracing } from '@shared/Orchestraflow-types'
import { NodeFactory } from '../nodes/node-factory'
import { VariableStore } from '../services/variable-store'
import type { NodeResult } from '../nodes/types'

export async function executeNode(
  node: OFNode,
  variableStore: VariableStore,
  initialInputs: Record<string, any>,
  tracing: OFNodeTracing[],
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
): Promise<NodeResult> {
  // 根据前置节点收集输入
  const inputs: Record<string, any> = {}

  // 从 variableStore 获取所有变量作为输入
  const allVars = variableStore.getAll()
  Object.assign(inputs, allVars)

  // 合并初始输入
  Object.assign(inputs, initialInputs)

  // 创建节点实例
  const nodeInstance = NodeFactory.createNode(node, variableStore)

  // 设置执行上下文，包含 provider 配置
  const context = {
    runId: '',
    node,
    inputs,
    variables: allVars,
    providerConfigs
  }
  nodeInstance.setContext(context)

  // 添加日志
  console.log('[OF Executor] Creating node:', node.data.type, 'with inputs:', inputs)

  try {
    // 执行节点
    const result = await nodeInstance.execute(context)
    return result
  } catch (err) {
    console.error('[OF Executor] Node execution error:', err)
    throw err
  }
}
