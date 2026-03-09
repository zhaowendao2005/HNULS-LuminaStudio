import {
  buildOFCommonNodeShape,
  defineInternalStartOFNodeDefinition
} from '../node-definition'
import { ensureOFSelectableVariables, loopInnerStartVariableDefinition } from '../variable-definition'
import type { OFLoopStartNodeData, OFLoopVariableData } from '../core-types'
import { OFBlockEnum } from '../core-types'
import { omitOFEmptySelector, omitOFNullSchemaFields } from './helpers'

function buildInputs(title: string, loopVariables: OFLoopVariableData[], nodeId: string) {
  return loopInnerStartVariableDefinition.build({
    namespace: title,
    loopVariables,
    fallbackNodeId: nodeId
  })
}

export const loopStartNodeDefinition = defineInternalStartOFNodeDefinition<OFLoopStartNodeData>({
  meta: {
    type: OFBlockEnum.LoopStart,
    title: '循环开始',
    summary: '内部节点，由编译器自动注入，不对 AI 暴露。',
    category: 'internal',
    kind: 'internal-start',
    vueFlowType: 'loop-start',
    internal: true,
    ai_exposed: false
  },
  authoring: {
    contract: {
      type: OFBlockEnum.LoopStart,
      title: '循环开始',
      internal: true,
      ai_exposed: false,
      author_required_fields: [],
      compiler_injected_fields: ['data.input.variables', 'parentNode', 'extent'],
      runtime_invariants: [],
      produced_outputs: ['loop_variables[*].variable', 'index', 'loop_count'],
      notes: ['内部开始节点由编译器/系统维护，作者不应手写。']
    }
  },
  prompt: {
    sanitizePromptNode(node) {
      const data = node.data as OFLoopStartNodeData
      return {
        ...node,
        data: {
          ...data,
          input: {
            ...data.input,
            variables: (data.input?.variables || []).map((item) =>
              omitOFNullSchemaFields(omitOFEmptySelector(item, 'value_selector'))
            )
          }
        }
      }
    }
  },
  variables: {
    buildRuntimeInputVariables({ title, loopVariables, nodeId }) {
      return buildInputs(title, loopVariables || [], nodeId || title)
    },
    getSelectableVariables(node) {
      const data = node.data as OFLoopStartNodeData
      return ensureOFSelectableVariables(data.input?.variables || [])
    }
  },
  editor: {
    normalizeData({ node }) {
      const data = node.data as Partial<OFLoopStartNodeData>
      const loopVariables =
        (data.input?.variables || [])
          .filter((item) => item.variable !== 'index' && item.variable !== 'loop_count')
          .map((item) => ({
            variable: item.variable,
            label: item.label,
            type: item.type,
            item_type: item.item_type,
            description: item.description,
            required: item.required,
            value_type: 'constant' as const,
            schema: item.schema,
            item_schema: item.item_schema
          })) || []
      const parentNodeId = node.parentNode || node.id
      return {
        ...buildOFCommonNodeShape(data, '循环开始', '循环开始'),
        type: OFBlockEnum.LoopStart,
        input: {
          variables: buildInputs(node.parentNode || 'loop', loopVariables, parentNodeId)
        }
      }
    }
  }
})
