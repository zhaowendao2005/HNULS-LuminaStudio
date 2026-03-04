/**
 * OrchestraFlow 工作流编辑器 Mock 数据
 */
import type { OFNode, OFEdge } from './workflow-editor.types'
import { OFBlockEnum } from '@shared/Orchestraflow-types'

/**
 * 默认工作流：Start → LLM → End
 */
export function createDefaultWorkflow(): {
  nodes: OFNode[]
  edges: OFEdge[]
} {
  const nodes: OFNode[] = [
    {
      id: 'start-1',
      type: 'start',
      position: { x: 0, y: 200 },
      data: {
        title: '开始',
        desc: '工作流开始节点',
        type: OFBlockEnum.Start,
        inputs: []
      }
    },
    {
      id: 'llm-1',
      type: 'llm',
      position: { x: 350, y: 200 },
      data: {
        title: 'LLM',
        desc: '大语言模型节点',
        type: OFBlockEnum.LLM,
        model: {
          provider: 'openai',
          name: 'gpt-4'
        },
        prompt_template: [],
        context: {
          enabled: false
        }
      }
    },
    {
      id: 'end-1',
      type: 'end',
      position: { x: 700, y: 200 },
      data: {
        title: '结束',
        desc: '工作流结束节点',
        type: OFBlockEnum.End,
        outputs: []
      }
    }
  ]

  const edges: OFEdge[] = [
    {
      id: 'e-start-llm',
      source: 'start-1',
      target: 'llm-1',
      sourceHandle: 'source',
      targetHandle: 'target',
      type: 'default',
      data: {
        sourceType: OFBlockEnum.Start,
        targetType: OFBlockEnum.LLM
      }
    },
    {
      id: 'e-llm-end',
      source: 'llm-1',
      target: 'end-1',
      sourceHandle: 'source',
      targetHandle: 'target',
      type: 'default',
      data: {
        sourceType: OFBlockEnum.LLM,
        targetType: OFBlockEnum.End
      }
    }
  ]

  return { nodes, edges }
}
