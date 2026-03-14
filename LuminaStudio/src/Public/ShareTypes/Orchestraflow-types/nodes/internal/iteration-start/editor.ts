import type { OFNodeEditorNormalizeParams } from '../../../node-definition'
import type { OFIterationStartNodeData } from '../../../core-types'
import { OFBlockEnum } from '../../../core-types'
import { buildOFCommonNodeShape } from '../../../node-definition'
import { iterationStartNodeRuntimeDefinition } from './runtime'

export const iterationStartNodeEditor = {
  normalizeData({ node }: OFNodeEditorNormalizeParams): OFIterationStartNodeData {
    const data = node.data as Partial<OFIterationStartNodeData>
    const parentNodeId = node.parentNode || node.id
    return {
      ...buildOFCommonNodeShape(data, '迭代开始', '迭代开始'),
      type: OFBlockEnum.IterationStart,
      input: {
        variables:
          iterationStartNodeRuntimeDefinition.buildRuntimeInputVariables?.({
            title: node.parentNode || 'iteration',
            nodeId: parentNodeId
          }) || []
      }
    }
  }
}
