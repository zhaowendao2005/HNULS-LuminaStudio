/**
 * EndNode - 结束节点
 *
 * 收集输出变量，返回最终结果
 */
import { BaseNode } from './base-node'
import { OFBlockEnum, type OFEndNodeData } from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'

export class EndNode extends BaseNode {
  readonly nodeType: OFBlockEnum.End

  constructor(node: any, variableStore: VariableStore) {
    super(node, variableStore)
    this.nodeType = OFBlockEnum.End
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    this.setContext(context)
    const nodeData = this.getNodeData() as OFEndNodeData
    const outputs: Record<string, any> = {}

    // 根据 output.variables 收集输出变量
    const outputConfig = nodeData.output
    if (outputConfig?.variables) {
      for (const v of outputConfig.variables) {
        // 使用 value_selector 获取变量值
        const selector = v.value_selector?.length ? v.value_selector : [v.variable]
        const value = this.variableStore.getBySelector(selector)
        outputs[v.variable] = value
      }
    }

    return { outputs }
  }
}
