import type { OFNodeRuntimeDefinition } from '../../../node-definition'
import type { OFIterationStartNodeData } from '../../../core-types'
import { OFBlockEnum } from '../../../core-types'
import { createOFPortSpec } from '../../../node-definition'
import {
  ensureOFSelectableVariables,
  iterationInnerStartVariableDefinition
} from '../../../variable-definition'

function buildInputs(title: string, nodeId: string) {
  return iterationInnerStartVariableDefinition.build({
    namespace: nodeId || title || 'iteration',
    fallbackNodeId: nodeId
  })
}

export const iterationStartNodeRuntimeDefinition: OFNodeRuntimeDefinition & {
  kind: 'internal-start'
  internal: true
} = {
  type: OFBlockEnum.IterationStart,
  title: '迭代开始',
  summary: '内部节点，由编译器自动注入，不对 AI 暴露。',
  category: 'internal',
  kind: 'internal-start',
  vueFlowType: 'iteration-start',
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
      id: 'item',
      label: '当前项',
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
      id: 'length',
      label: '长度',
      direction: 'output',
      channel: 'data',
      internal: true
    })
  ],
  system_managed_fields: ['data.input.variables', 'parentNode', 'extent'],
  side_effects: [
    { id: 'publish-iteration-frame', summary: '向子图发布 item / index / length 变量。' }
  ],
  output_namespace: {
    source: 'none',
    editable: false,
    summary: '内部 start 节点只发布迭代帧变量，不暴露独立命名空间。'
  },
  buildRuntimeInputVariables({ title, nodeId }) {
    return buildInputs(title, nodeId || title)
  },
  getSelectableVariables(node) {
    const data = node.data as OFIterationStartNodeData
    return ensureOFSelectableVariables(data.input?.variables || [])
  }
}
