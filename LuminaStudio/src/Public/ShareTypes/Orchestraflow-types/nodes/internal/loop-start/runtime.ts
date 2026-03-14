import type { OFNodeRuntimeDefinition } from '../../../node-definition'
import type { OFLoopStartNodeData, OFLoopVariableData } from '../../../core-types'
import { OFBlockEnum } from '../../../core-types'
import { createOFPortSpec } from '../../../node-definition'
import {
  ensureOFSelectableVariables,
  loopInnerStartVariableDefinition
} from '../../../variable-definition'

function buildInputs(title: string, loopVariables: OFLoopVariableData[], nodeId: string) {
  return loopInnerStartVariableDefinition.build({
    namespace: nodeId || title || 'loop',
    loopVariables,
    fallbackNodeId: nodeId
  })
}

export const loopStartNodeRuntimeDefinition: OFNodeRuntimeDefinition & {
  kind: 'internal-start'
  internal: true
} = {
  type: OFBlockEnum.LoopStart,
  title: '循环开始',
  summary: '内部节点，由编译器自动注入，不对 AI 暴露。',
  category: 'internal',
  kind: 'internal-start',
  vueFlowType: 'loop-start',
  internal: true,
  ports: [
    createOFPortSpec({
      id: 'source',
      label: '继续',
      direction: 'output',
      channel: 'control',
      internal: true
    }),
    createOFPortSpec({
      id: 'loop_variables',
      label: '循环变量',
      direction: 'output',
      channel: 'data',
      internal: true
    }),
    createOFPortSpec({
      id: 'index',
      label: '索引',
      direction: 'output',
      channel: 'data',
      internal: true
    }),
    createOFPortSpec({
      id: 'loop_count',
      label: '次数',
      direction: 'output',
      channel: 'data',
      internal: true
    })
  ],
  system_managed_fields: ['data.input.variables', 'parentNode', 'extent'],
  side_effects: [
    { id: 'publish-loop-frame', summary: '向子图发布 loop 变量、index 和 loop_count。' }
  ],
  output_namespace: {
    source: 'none',
    editable: false,
    summary: '内部 start 节点只发布循环帧变量，不暴露独立命名空间。'
  },
  buildRuntimeInputVariables({ title, loopVariables, nodeId }) {
    return buildInputs(title, loopVariables || [], nodeId || title)
  },
  getSelectableVariables(node) {
    const data = node.data as OFLoopStartNodeData
    return ensureOFSelectableVariables(data.input?.variables || [])
  }
}
