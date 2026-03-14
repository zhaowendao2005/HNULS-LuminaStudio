import type { OFNodeRuntimeDefinition } from '../../node-definition'
import { OFBlockEnum } from '../../core-types'
import { createOFPortSpec } from '../../node-definition'

export const ifNodeRuntimeDefinition: OFNodeRuntimeDefinition & { kind: 'standard' } = {
  type: OFBlockEnum.IfElse,
  title: '条件分支',
  summary: '按条件选择分支 handle。',
  category: 'logic',
  kind: 'standard',
  vueFlowType: 'ifelse',
  ports: [
    createOFPortSpec({
      id: 'target',
      label: '进入',
      direction: 'input',
      channel: 'control',
      required: true
    }),
    createOFPortSpec({ id: 'if', label: 'IF', direction: 'output', channel: 'control' }),
    createOFPortSpec({ id: 'else', label: 'ELSE', direction: 'output', channel: 'control' })
  ],
  side_effects: [{ id: 'select-branch-handle', summary: '根据条件计算命中的分支 handle。' }],
  output_namespace: {
    source: 'none',
    editable: false,
    summary: '条件分支节点本身不产生稳定数据命名空间，只决定控制流走向。'
  },
  runtime_invariants: [
    {
      id: 'ifelse-edge-source-handle-match-branch',
      level: 'error',
      scope: 'edge',
      summary: 'IfElse 出边的 sourceHandle 必须匹配 case.handleId 或 elseCase.handleId。'
    }
  ],
  getSelectableVariables() {
    return []
  }
}
