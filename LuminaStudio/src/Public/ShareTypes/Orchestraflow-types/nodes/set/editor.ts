import type { OFNodeEditorNormalizeParams } from '../../node-definition'
import type { OFVariableAssignNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import {
  buildOFCommonNodeShape,
  normalizeOFNodeTitle,
  resolveOFNodeOutputNamespace
} from '../../node-definition'
import {
  collectOFSelectorVariableRoots,
  normalizeOFRunnableNodeSelectorData
} from '../../selector-utils'
import { VARIABLE_ASSIGN_DEFAULT_NAMESPACE, variableAssignNodeRuntimeDefinition } from './runtime'

export const variableAssignNodeEditor = {
  createDefaultData({
    nodeId,
    title
  }: {
    nodeId: string
    title: string
  }): OFVariableAssignNodeData {
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: variableAssignNodeRuntimeDefinition },
        {
          nodeId,
          fallback: VARIABLE_ASSIGN_DEFAULT_NAMESPACE
        }
      ) || VARIABLE_ASSIGN_DEFAULT_NAMESPACE
    return {
      title,
      desc: '',
      type: OFBlockEnum.VariableAssign,
      output_namespace: outputNamespace,
      rules: [],
      output: { variables: [] }
    }
  },
  normalizeData({ node }: OFNodeEditorNormalizeParams): OFVariableAssignNodeData {
    const data = node.data as Partial<OFVariableAssignNodeData>
    const title = normalizeOFNodeTitle(OFBlockEnum.VariableAssign, data.title)
    const normalized = {
      ...data,
      rules: data.rules || []
    } as OFVariableAssignNodeData
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: variableAssignNodeRuntimeDefinition },
        {
          current: data.output_namespace,
          nodeId: node.id,
          title,
          fallback: VARIABLE_ASSIGN_DEFAULT_NAMESPACE
        }
      ) || VARIABLE_ASSIGN_DEFAULT_NAMESPACE
    normalizeOFRunnableNodeSelectorData(
      OFBlockEnum.VariableAssign,
      normalized as unknown as Record<string, unknown>,
      collectOFSelectorVariableRoots([node])
    )
    return {
      ...buildOFCommonNodeShape(data, title),
      type: OFBlockEnum.VariableAssign,
      output_namespace: outputNamespace,
      rules: normalized.rules,
      output: {
        variables:
          variableAssignNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            rules: normalized.rules,
            nodeId: node.id
          }) || []
      }
    }
  }
}
