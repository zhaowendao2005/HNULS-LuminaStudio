import type { OFNodeEditorNormalizeParams } from '../../node-definition'
import type { OFIfElseNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import { buildOFCommonNodeShape, normalizeOFNodeTitle } from '../../node-definition'
import {
  collectOFSelectorVariableRoots,
  normalizeOFRunnableNodeSelectorData
} from '../../selector-utils'

export const ifNodeEditor = {
  createDefaultData({ title }: { title: string }): OFIfElseNodeData {
    return {
      title,
      desc: '',
      type: OFBlockEnum.IfElse,
      cases: [
        {
          id: `case_if_${Date.now()}`,
          kind: 'if',
          label: 'IF',
          handleId: 'if',
          conditions: [
            {
              id: `condition_${Date.now()}`,
              variable_selector: [],
              operator: 'is'
            }
          ]
        }
      ],
      elseCase: {
        handleId: 'else',
        label: 'ELSE'
      }
    }
  },
  normalizeData({ node }: OFNodeEditorNormalizeParams): OFIfElseNodeData {
    const data = node.data as Partial<OFIfElseNodeData>
    const normalized = {
      ...data,
      cases: data.cases || [],
      elseCase: data.elseCase || {
        handleId: 'else',
        label: 'ELSE'
      }
    } as OFIfElseNodeData
    normalizeOFRunnableNodeSelectorData(
      OFBlockEnum.IfElse,
      normalized as unknown as Record<string, unknown>,
      collectOFSelectorVariableRoots([node])
    )
    return {
      ...buildOFCommonNodeShape(data, normalizeOFNodeTitle(OFBlockEnum.IfElse, data.title)),
      type: OFBlockEnum.IfElse,
      cases: normalized.cases,
      elseCase: normalized.elseCase
    }
  }
}
