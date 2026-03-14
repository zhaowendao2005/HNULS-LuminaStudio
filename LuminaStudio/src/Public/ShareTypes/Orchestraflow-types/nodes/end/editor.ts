import type { OFNodeEditorNormalizeParams } from '../../node-definition'
import type { OFEndNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import { buildOFCommonNodeShape, normalizeOFNodeTitle } from '../../node-definition'
import {
  collectOFSelectorVariableRoots,
  normalizeOFRunnableNodeSelectorData
} from '../../selector-utils'

export const endNodeEditor = {
  createDefaultData({ title }: { title: string }): OFEndNodeData {
    return {
      title,
      desc: '',
      type: OFBlockEnum.End,
      output: { variables: [] }
    }
  },
  normalizeData({ node }: OFNodeEditorNormalizeParams): OFEndNodeData {
    const data = node.data as Partial<OFEndNodeData>
    const normalized = {
      ...data,
      output: data.output || { variables: [] }
    } as OFEndNodeData
    normalizeOFRunnableNodeSelectorData(
      OFBlockEnum.End,
      normalized as unknown as Record<string, unknown>,
      collectOFSelectorVariableRoots([node])
    )
    return {
      ...buildOFCommonNodeShape(data, normalizeOFNodeTitle(OFBlockEnum.End, data.title)),
      type: OFBlockEnum.End,
      output: normalized.output
    }
  }
}
