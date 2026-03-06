/**
 * NodeFactory - 节点工厂
 *
 * 根据节点类型创建对应的节点实例
 */
import { BaseNode } from './base-node'
import { StartNode } from './start-node'
import { LLMNode } from './llm-node'
import { IfElseNode } from './if-else-node'
import { IterationNode } from './iteration-node'
import { IterationStartNode } from './iteration-start-node'
import { LoopNode } from './loop-node'
import { LoopStartNode } from './loop-start-node'
import { EndNode } from './end-node'
import type { OFNode } from '@shared/Orchestraflow-types'
import { OFBlockEnum } from '@shared/Orchestraflow-types'
import { VariableStore } from '../services/variable-store'

export class NodeFactory {
  static createNode(node: OFNode, variableStore: VariableStore): BaseNode {
    const nodeType = node.data.type

    switch (nodeType) {
      case OFBlockEnum.Start:
        return new StartNode(node, variableStore)
      case OFBlockEnum.LLM:
        return new LLMNode(node, variableStore)
      case OFBlockEnum.IfElse:
        return new IfElseNode(node, variableStore)
      case OFBlockEnum.Iteration:
        return new IterationNode(node, variableStore)
      case OFBlockEnum.IterationStart:
        return new IterationStartNode(node, variableStore)
      case OFBlockEnum.Loop:
        return new LoopNode(node, variableStore)
      case OFBlockEnum.LoopStart:
        return new LoopStartNode(node, variableStore)
      case OFBlockEnum.End:
        return new EndNode(node, variableStore)
      default:
        throw new Error(`Unknown node type: ${nodeType}`)
    }
  }
}
