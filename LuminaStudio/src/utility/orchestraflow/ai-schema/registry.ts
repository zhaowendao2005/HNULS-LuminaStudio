import type { OFNode } from '@shared/Orchestraflow-types'
import { OFBlockEnum } from '@shared/Orchestraflow-types'
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

/**
 * OrchestraFlow 节点暴露元数据的单一事实来源。
 *
 * 长期不变量：
 * - 运行时节点创建必须能从这里解析到每一个可执行节点。
 * - AI schema 导出必须以这里为准描述节点能力。
 * - 新节点类型在被视为“完成”之前，必须先注册到这里。
 */
export interface OFRuntimeNodeDescriptor {
  type: OFBlockEnum
  title: string
  category: 'start' | 'llm' | 'logic' | 'end' | 'internal'
  summary: string
  internal?: boolean
  ai_exposed: boolean
  runtimeCtor: RuntimeNodeConstructor
}

const RUNTIME_NODE_DESCRIPTORS: OFRuntimeNodeDescriptor[] = [
  {
    type: OFBlockEnum.Start,
    title: '开始',
    category: 'start',
    summary: '定义工作流输入变量。',
    ai_exposed: true,
    runtimeCtor: StartNode
  },
  {
    type: OFBlockEnum.LLM,
    title: 'llm',
    category: 'llm',
    summary: '调用模型，支持 prompt_template 和 structured_output。',
    ai_exposed: true,
    runtimeCtor: LLMNode
  },
  {
    type: OFBlockEnum.IfElse,
    title: '条件分支',
    category: 'logic',
    summary: '按条件选择分支 handle。',
    ai_exposed: true,
    runtimeCtor: IfElseNode
  },
  {
    type: OFBlockEnum.Iteration,
    title: '迭代',
    category: 'logic',
    summary: '对数组逐项执行子图，内部自动注入 iteration-start。',
    ai_exposed: true,
    runtimeCtor: IterationNode
  },
  {
    type: OFBlockEnum.IterationStart,
    title: '迭代开始',
    category: 'internal',
    summary: '内部节点，由编译器自动注入，不对 AI 暴露。',
    internal: true,
    ai_exposed: false,
    runtimeCtor: IterationStartNode
  },
  {
    type: OFBlockEnum.Loop,
    title: '循环',
    category: 'logic',
    summary: '执行固定次数循环子图，内部自动注入 loop-start。',
    ai_exposed: true,
    runtimeCtor: LoopNode
  },
  {
    type: OFBlockEnum.LoopStart,
    title: '循环开始',
    category: 'internal',
    summary: '内部节点，由编译器自动注入，不对 AI 暴露。',
    internal: true,
    ai_exposed: false,
    runtimeCtor: LoopStartNode
  },
  {
    type: OFBlockEnum.VariableAssign,
    title: '变量赋值',
    category: 'end',
    summary: '把变量或常量写入命名空间输出。',
    ai_exposed: true,
    runtimeCtor: VariableAssignNode
  },
  {
    type: OFBlockEnum.End,
    title: '结束',
    category: 'end',
    summary: '映射最终输出变量。',
    ai_exposed: true,
    runtimeCtor: EndNode
  }
]

export function getOFRuntimeNodeDescriptors(): OFRuntimeNodeDescriptor[] {
  return [...RUNTIME_NODE_DESCRIPTORS]
}

export function getOFRuntimeNodeDescriptor(type: OFBlockEnum): OFRuntimeNodeDescriptor {
  const descriptor = RUNTIME_NODE_DESCRIPTORS.find((item) => item.type === type)
  if (!descriptor) {
    throw new Error(`Unknown OrchestraFlow node descriptor: ${type}`)
  }
  return descriptor
}

export function createRuntimeNodeByDescriptor(
  node: OFNode,
  variableStore: VariableStore
): BaseNode {
  const RuntimeNode = getOFRuntimeNodeDescriptor(node.data.type).runtimeCtor
  return new RuntimeNode(node, variableStore)
}
