import type { OFNodeRuntimeDefinition } from '../../node-definition'
import type { OFStartNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import { createOFPortSpec } from '../../node-definition'
import { ensureOFSelectableVariables } from '../../variable-definition'

// runtime 层只保留稳定执行契约。
export const startNodeRuntimeDefinition: OFNodeRuntimeDefinition & { kind: 'standard' } = {
  type: OFBlockEnum.Start,
  title: '开始',
  summary: '定义工作流输入变量。',
  category: 'start',
  kind: 'standard',
  vueFlowType: 'start',
  ports: [
    createOFPortSpec({ id: 'source', label: '继续', direction: 'output', channel: 'control' })
  ],
  side_effects: [{ id: 'publish-start-inputs', summary: '把开始节点输入变量写入变量存储。' }],
  output_namespace: {
    source: 'none',
    editable: false,
    summary: '开始节点不产生独立命名空间，只发布工作流输入变量。'
  },
  getSelectableVariables(node) {
    const data = node.data as OFStartNodeData
    return ensureOFSelectableVariables(data.input?.variables || [])
  }
}
