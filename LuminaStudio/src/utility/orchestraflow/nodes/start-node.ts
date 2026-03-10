/**
 * StartNode - 起始节点
 *
 * 读取配置的输入变量，收集用户传入的值
 */
import { BaseNode } from './base-node'
import {
  buildOFInputDefaultValue,
  OFBlockEnum,
  type OFStartNodeData
} from '@shared/Orchestraflow-types'
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

    // 根据 input.variables 收集输入变量
    const inputConfig = nodeData.input
    if (inputConfig?.variables) {
      for (const v of inputConfig.variables) {
        const value = context.inputs[v.variable] ?? buildOFInputDefaultValue(v)
        outputs[v.variable] = value
        // 存储到变量库
        this.setOutput(v.variable, value)
      }
    }

    return { outputs }
  }
}
