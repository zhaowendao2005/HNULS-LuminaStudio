import type { OFNodeRuntimeDefinition } from '../../node-definition'
import type { OFVariableAssignNodeData } from '../../core-types'
import { OF_VARIABLE_ASSIGN_NODE_NAME, OFBlockEnum } from '../../core-types'
import { createOFPortSpec } from '../../node-definition'
import {
  ensureOFSelectableVariables,
  variableAssignOutputVariableDefinition
} from '../../variable-definition'

function buildOutputs(namespace: string, rules: OFVariableAssignNodeData['rules'], nodeId: string) {
  return variableAssignOutputVariableDefinition.build({
    namespace,
    rules,
    fallbackNodeId: nodeId
  })
}

export const variableAssignNodeRuntimeDefinition: OFNodeRuntimeDefinition & { kind: 'standard' } = {
  type: OFBlockEnum.VariableAssign,
  title: '变量赋值',
  summary: '把变量或常量写入命名空间输出。',
  category: 'end',
  kind: 'standard',
  vueFlowType: 'variable-assign',
  ports: [
    createOFPortSpec({
      id: 'target',
      label: '进入',
      direction: 'input',
      channel: 'control',
      required: true
    }),
    createOFPortSpec({ id: 'source', label: '继续', direction: 'output', channel: 'control' }),
    createOFPortSpec({ id: 'assigned', label: '赋值结果', direction: 'output', channel: 'data' })
  ],
  system_managed_fields: ['data.output.variables'],
  side_effects: [{ id: 'assign-variables', summary: '把常量或变量引用写入当前节点输出命名空间。' }],
  output_namespace: {
    source: 'system-stable',
    editable: true,
    summary: '赋值节点输出使用稳定命名空间；旧工作流会沿用已有值，新节点默认按 nodeId 生成。'
  },
  buildRuntimeOutputVariables({ title, rules, nodeId }) {
    return buildOutputs(title, rules || [], nodeId || title)
  },
  getSelectableVariables(node) {
    const data = node.data as OFVariableAssignNodeData
    return ensureOFSelectableVariables(data.output?.variables || [])
  }
}

export const VARIABLE_ASSIGN_DEFAULT_NAMESPACE = OF_VARIABLE_ASSIGN_NODE_NAME
