import type { OFNodeRuntimeDefinition } from '../../node-definition'
import type { OFEndNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import { createOFPortSpec } from '../../node-definition'
import { ensureOFSelectableVariables } from '../../variable-definition'

export const endNodeRuntimeDefinition: OFNodeRuntimeDefinition & { kind: 'standard' } = {
  type: OFBlockEnum.End,
  title: '结束',
  summary: '映射最终输出变量。',
  category: 'end',
  kind: 'standard',
  vueFlowType: 'end',
  ports: [
    createOFPortSpec({
      id: 'target',
      label: '进入',
      direction: 'input',
      channel: 'control',
      required: true
    }),
    createOFPortSpec({ id: 'result', label: '最终输出', direction: 'output', channel: 'data' })
  ],
  side_effects: [
    { id: 'materialize-final-output', summary: '从变量存储读取 selector 并生成最终输出。' }
  ],
  output_namespace: {
    source: 'none',
    editable: false,
    summary: '结束节点不创建独立输出命名空间，只消费上游变量形成最终结果。'
  },
  getSelectableVariables(node) {
    const data = node.data as OFEndNodeData
    return ensureOFSelectableVariables(data.output?.variables || [])
  }
}
