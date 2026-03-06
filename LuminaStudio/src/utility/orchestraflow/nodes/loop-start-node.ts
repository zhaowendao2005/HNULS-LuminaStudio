import { BaseNode } from './base-node'
import { OFBlockEnum } from '@shared/Orchestraflow-types'
import type { ExecutionContext, NodeResult } from './types'
import { VariableStore } from '../services/variable-store'

export class LoopStartNode extends BaseNode {
  readonly nodeType: OFBlockEnum.LoopStart

  constructor(node: any, variableStore: VariableStore) {
    super(node, variableStore)
    this.nodeType = OFBlockEnum.LoopStart
  }

  async execute(context: ExecutionContext): Promise<NodeResult> {
    this.setContext(context)

    if (!context.loopContext) {
      return {
        outputs: {},
        error: 'LoopStart 节点只能在 Loop 子图中执行'
      }
    }

    return {
      outputs: {
        index: context.loopContext.index,
        loop_count: context.loopContext.loopCount
      }
    }
  }
}
