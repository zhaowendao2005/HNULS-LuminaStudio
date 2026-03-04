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
  tracing: OFNodeTracing[]
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

  // 设置执行上下文
  const context = {
    runId: '',
    node,
    inputs,
    variables: allVars
  }
  nodeInstance.setContext(context)

  // 执行节点
  const result = await nodeInstance.execute(context)

  return result
}
