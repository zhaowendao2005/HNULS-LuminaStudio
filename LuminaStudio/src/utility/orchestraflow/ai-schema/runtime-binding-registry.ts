import type { OFNode } from '@shared/Orchestraflow-types'
import { OFBlockEnum } from '@shared/Orchestraflow-types'
import { resolveOFNodeDefinition } from '@shared/Orchestraflow-types/node-definition-registry'
import { BaseNode } from '../nodes/base-node'
import { EndNode } from '../nodes/end-node'
import { IfElseNode } from '../nodes/if-else-node'
import { IterationNode } from '../nodes/iteration-node'
import { IterationStartNode } from '../nodes/iteration-start-node'
import { LLMNode } from '../nodes/llm-node'
import { LoopNode } from '../nodes/loop-node'
import { LoopStartNode } from '../nodes/loop-start-node'
import { StartNode } from '../nodes/start-node'
import { VariableAssignNode } from '../nodes/variable-assign-node'
import { VariableStore } from '../services/variable-store'

type RuntimeNodeConstructor = new (node: OFNode, variableStore: VariableStore) => BaseNode

export interface OFNodeRuntimeBinding {
  type: OFBlockEnum
  create(node: OFNode, variableStore: VariableStore): BaseNode
}

const RUNTIME_BINDINGS = new Map<OFBlockEnum, RuntimeNodeConstructor>([
  [OFBlockEnum.Start, StartNode],
  [OFBlockEnum.LLM, LLMNode as unknown as RuntimeNodeConstructor],
  [OFBlockEnum.IfElse, IfElseNode],
  [OFBlockEnum.Iteration, IterationNode],
  [OFBlockEnum.IterationStart, IterationStartNode],
  [OFBlockEnum.Loop, LoopNode],
  [OFBlockEnum.LoopStart, LoopStartNode],
  [OFBlockEnum.VariableAssign, VariableAssignNode],
  [OFBlockEnum.End, EndNode]
])

export function listOFNodeRuntimeBindings(): OFNodeRuntimeBinding[] {
  return Array.from(RUNTIME_BINDINGS.entries()).map(([type, RuntimeNode]) => ({
    type,
    create(node, variableStore) {
      return new RuntimeNode(node, variableStore)
    }
  }))
}

export function createRuntimeNodeFromDefinition(
  node: OFNode,
  variableStore: VariableStore
): BaseNode {
  resolveOFNodeDefinition(node.data.type)
  const RuntimeNode = RUNTIME_BINDINGS.get(node.data.type)
  if (!RuntimeNode) {
    throw new Error(`Unknown OrchestraFlow runtime binding: ${node.data.type}`)
  }
  return new RuntimeNode(node, variableStore)
}
