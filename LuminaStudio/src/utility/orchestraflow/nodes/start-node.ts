/**
 * StartNode - 起始节点
 *
 * 读取配置的输入变量，收集用户传入的值
 */
import { BaseNode } from './base-node'
import type { OFBlockEnum, OFStartNodeData } from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'

export class StartNode extends BaseNode {
  readonly nodeType: OFBlockEnum.Start

  constructor(node: any, variableStore: VariableStore) {
    super(node, variableStore)
    this.nodeType = OFBlockEnum.Start
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    this.setContext(context)
    const nodeData = this.getNodeData() as OFStartNodeData
    const outputs: Record<string, any> = {}

    // 收集输入变量
    if (nodeData.inputs) {
      for (const input of nodeData.inputs) {
        const value = context.inputs[input.variable] ?? input.default
        outputs[input.variable] = value
        // 存储到变量库
        this.setOutput(input.variable, value)
      }
    }

    return { outputs }
  }
}
