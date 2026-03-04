/**
 * EndNode - 结束节点
 *
 * 收集输出变量，返回最终结果
 */
import { BaseNode } from './base-node'
import type { OFBlockEnum, OFEndNodeData } from '@shared/Orchestraflow-types'
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

    // 收集输出变量
    if (nodeData.outputs) {
      for (const output of nodeData.outputs) {
        const value = this.variableStore.getBySelector(output.value_selector)
        outputs[output.variable] = value
      }
    }

    return { outputs }
  }
}
