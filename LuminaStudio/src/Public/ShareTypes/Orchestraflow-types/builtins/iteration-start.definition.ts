import {
  buildOFCommonNodeShape,
  createOFPortSpec,
  defineInternalStartOFNodeDefinition,
  resolveOFNodeOutputNamespace
} from '../node-definition'
import {
  ensureOFSelectableVariables,
  iterationInnerStartVariableDefinition
} from '../variable-definition'
import type { OFIterationStartNodeData } from '../core-types'
import { OFBlockEnum } from '../core-types'
import { omitOFEmptySelector, omitOFNullSchemaFields } from './helpers'

function buildInputs(title: string, nodeId: string) {
  const namespace = resolveOFNodeOutputNamespace(iterationStartNodeDefinition, {
    title,
    fallback: nodeId || 'iteration'
  })
  return iterationInnerStartVariableDefinition.build({
    namespace: namespace || nodeId || 'iteration',
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
    spec: {
      ports: [
        createOFPortSpec({ id: 'source', label: '继续', direction: 'output', channel: 'control', internal: true }),
        createOFPortSpec({ id: 'item', label: '当前项', direction: 'output', channel: 'data', internal: true }),
        createOFPortSpec({ id: 'index', label: '索引', direction: 'output', channel: 'data', internal: true }),
        createOFPortSpec({ id: 'length', label: '长度', direction: 'output', channel: 'data', internal: true })
      ],
      system_managed_fields: ['data.input.variables', 'parentNode', 'extent'],
      side_effects: [{ id: 'publish-iteration-frame', summary: '向子图发布 item / index / length 变量。' }],
      output_namespace: {
        source: 'none',
        editable: false,
        summary: '内部 start 节点只发布迭代帧变量，不暴露独立命名空间。'
      }
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
