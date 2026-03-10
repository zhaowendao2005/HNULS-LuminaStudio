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
        const value =
          this.variableStore.getByVariableRef(v.value_ref) ??
          this.variableStore.getBySelector([v.variable])
        outputs[v.variable] = value
      }
    }

    return { outputs }
  }
}
