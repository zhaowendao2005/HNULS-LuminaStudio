import { buildOFCommonNodeShape, defineInternalStartOFNodeDefinition } from '../node-definition'
import {
  ensureOFSelectableVariables,
  iterationInnerStartVariableDefinition
} from '../variable-definition'
import type { OFIterationStartNodeData } from '../core-types'
import { OFBlockEnum } from '../core-types'
import { omitOFEmptySelector, omitOFNullSchemaFields } from './helpers'

function buildInputs(title: string, nodeId: string) {
  return iterationInnerStartVariableDefinition.build({
    namespace: title,
    fallbackNodeId: nodeId
  })
}

export const iterationStartNodeDefinition =
  defineInternalStartOFNodeDefinition<OFIterationStartNodeData>({
    meta: {
      type: OFBlockEnum.IterationStart,
      title: '迭代开始',
      summary: '内部节点，由编译器自动注入，不对 AI 暴露。',
      category: 'internal',
      kind: 'internal-start',
      vueFlowType: 'iteration-start',
      internal: true,
      ai_exposed: false
    },
    authoring: {
      contract: {
        type: OFBlockEnum.IterationStart,
        title: '迭代开始',
        internal: true,
        ai_exposed: false,
        author_required_fields: [],
        compiler_injected_fields: ['data.input.variables', 'parentNode', 'extent'],
        runtime_invariants: [],
        produced_outputs: ['item', 'index', 'length'],
        notes: ['内部开始节点由编译器/系统维护，作者不应手写。']
      }
    },
    prompt: {
      sanitizePromptNode(node) {
        const data = node.data as OFIterationStartNodeData
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
      buildRuntimeInputVariables({ title, nodeId }) {
        return buildInputs(title, nodeId || title)
      },
      getSelectableVariables(node) {
        const data = node.data as OFIterationStartNodeData
        return ensureOFSelectableVariables(data.input?.variables || [])
      }
    },
    editor: {
      normalizeData({ node }) {
        const data = node.data as Partial<OFIterationStartNodeData>
        const parentNodeId = node.parentNode || node.id
        return {
          ...buildOFCommonNodeShape(data, '迭代开始', '迭代开始'),
          type: OFBlockEnum.IterationStart,
          input: {
            variables: buildInputs(node.parentNode || 'iteration', parentNodeId)
          }
        }
      }
    }
  })
