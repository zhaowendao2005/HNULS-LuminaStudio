import type { OFNodeEditorNormalizeParams } from '../../../node-definition'
import type { OFLoopStartNodeData } from '../../../core-types'
import { OFBlockEnum } from '../../../core-types'
import { buildOFCommonNodeShape } from '../../../node-definition'
import { loopStartNodeRuntimeDefinition } from './runtime'

export const loopStartNodeEditor = {
  normalizeData({ node }: OFNodeEditorNormalizeParams): OFLoopStartNodeData {
    const data = node.data as Partial<OFLoopStartNodeData>
    const loopVariables =
      (data.input?.variables || [])
        .filter((item) => item.variable !== 'index' && item.variable !== 'loop_count')
        .map((item) => ({
          variable: item.variable,
          label: item.label,
          type: item.type,
          description: item.description,
          required: item.required,
          value_type: 'constant' as const,
          schema: item.schema
        })) || []
    const parentNodeId = node.parentNode || node.id
    return {
      ...buildOFCommonNodeShape(data, '循环开始', '循环开始'),
      type: OFBlockEnum.LoopStart,
      input: {
        variables:
          loopStartNodeRuntimeDefinition.buildRuntimeInputVariables?.({
            title: node.parentNode || 'loop',
            loopVariables,
            nodeId: parentNodeId
          }) || []
      }
    }
  }
}
