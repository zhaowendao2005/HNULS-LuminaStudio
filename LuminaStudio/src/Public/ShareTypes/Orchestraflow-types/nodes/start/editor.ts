import type { OFNodeEditorNormalizeParams } from '../../node-definition'
import type { OFStartNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import { buildOFCommonNodeShape, normalizeOFNodeTitle } from '../../node-definition'
import {
  collectOFSelectorVariableRoots,
  normalizeOFRunnableNodeSelectorData
} from '../../selector-utils'

export const startNodeEditor = {
  createDefaultData({ title }: { title: string }): OFStartNodeData {
    return {
      title,
      desc: '',
      type: OFBlockEnum.Start,
      input: { variables: [] }
    }
  },
  normalizeData({ node }: OFNodeEditorNormalizeParams): OFStartNodeData {
    const data = node.data as Partial<OFStartNodeData>
    const normalized = {
      ...data,
      input: data.input || { variables: [] }
    } as OFStartNodeData
    normalizeOFRunnableNodeSelectorData(
      OFBlockEnum.Start,
      normalized as unknown as Record<string, unknown>,
      collectOFSelectorVariableRoots([node])
    )
    return {
      ...buildOFCommonNodeShape(data, normalizeOFNodeTitle(OFBlockEnum.Start, data.title)),
      type: OFBlockEnum.Start,
      input: normalized.input
    }
  }
}
