import type { OFNodeRuntimeDefinition } from '../../node-definition'
import type { OFNode, OFVariable } from '../../core-types'
import { OFVarType } from '../../core-types'
import { createOFPortSpec } from '../../node-definition'
import { ensureOFSelectableVariables } from '../../variable-definition'
import { knowledgeRetrievalResultSchema } from '../../../knowledge-retrieval.types'

/**
 * 注意：core-types.ts 里的 OFBlockEnum 目前还没有 knowledge-retrieval，
 * 这里先用字符串字面量承接，等主 agent 在保留文件补齐正式枚举后即可无缝接线。
 */
const KNOWLEDGE_RETRIEVAL_BLOCK_TYPE = 'knowledge-retrieval'
const KNOWLEDGE_RETRIEVAL_DEFAULT_NAMESPACE = 'knowledge_retrieval'

function createKnowledgeRetrievalOutputVariables(namespace: string): OFVariable[] {
  return [
    {
      variable: 'query',
      label: 'query',
      type: OFVarType.String,
      required: true,
      value_ref: {
        selector: [`${namespace}.query`],
        path: `${namespace}.query`,
        label: 'query',
        type: OFVarType.String
      }
    },
    {
      variable: 'total_scopes',
      label: 'total_scopes',
      type: OFVarType.Number,
      required: true,
      value_ref: {
        selector: [`${namespace}.total_scopes`],
        path: `${namespace}.total_scopes`,
        label: 'total_scopes',
        type: OFVarType.Number
      }
    },
    {
      variable: 'total_hits',
      label: 'total_hits',
      type: OFVarType.Number,
      required: true,
      value_ref: {
        selector: [`${namespace}.total_hits`],
        path: `${namespace}.total_hits`,
        label: 'total_hits',
        type: OFVarType.Number
      }
    },
    {
      variable: 'partial_failure',
      label: 'partial_failure',
      type: OFVarType.Boolean,
      required: true,
      value_ref: {
        selector: [`${namespace}.partial_failure`],
        path: `${namespace}.partial_failure`,
        label: 'partial_failure',
        type: OFVarType.Boolean
      }
    },
    {
      variable: 'items',
      label: 'items',
      type: OFVarType.Array,
      required: true,
      schema: knowledgeRetrievalResultSchema.properties.items,
      value_ref: {
        selector: [`${namespace}.items`],
        path: `${namespace}.items`,
        label: 'items',
        type: OFVarType.Array,
        schema: knowledgeRetrievalResultSchema.properties.items
      }
    },
    {
      variable: 'result',
      label: 'result',
      type: OFVarType.Object,
      required: true,
      schema: knowledgeRetrievalResultSchema,
      value_ref: {
        selector: [`${namespace}.result`],
        path: `${namespace}.result`,
        label: 'result',
        type: OFVarType.Object,
        schema: knowledgeRetrievalResultSchema
      }
    }
  ]
}

export const knowledgeRetrievalNodeRuntimeDefinition: OFNodeRuntimeDefinition & {
  kind: 'standard'
} = {
  type: KNOWLEDGE_RETRIEVAL_BLOCK_TYPE as never,
  title: 'knowledge-retrieval',
  summary: '执行知识库检索，并输出标准化结果对象。',
  category: 'llm',
  kind: 'standard',
  vueFlowType: KNOWLEDGE_RETRIEVAL_BLOCK_TYPE,
  ports: [
    createOFPortSpec({
      id: 'target',
      label: '进入',
      direction: 'input',
      channel: 'control',
      required: true
    }),
    createOFPortSpec({ id: 'source', label: '继续', direction: 'output', channel: 'control' }),
    createOFPortSpec({ id: 'knowledge', label: '知识结果', direction: 'output', channel: 'data' })
  ],
  system_managed_fields: ['data.output.variables'],
  side_effects: [{ id: 'knowledge-retrieval', summary: '按 scope 执行检索并返回统一知识结果。' }],
  output_namespace: {
    source: 'system-stable',
    editable: true,
    summary: 'knowledge-retrieval 输出使用稳定命名空间，默认按 nodeId 生成。'
  },
  buildRuntimeOutputVariables({ title }) {
    return createKnowledgeRetrievalOutputVariables(title || KNOWLEDGE_RETRIEVAL_DEFAULT_NAMESPACE)
  },
  getSelectableVariables(node: OFNode) {
    const data = (node.data || {}) as { output?: { variables?: OFVariable[] } }
    return ensureOFSelectableVariables(data.output?.variables || [])
  }
}

export {
  KNOWLEDGE_RETRIEVAL_BLOCK_TYPE,
  KNOWLEDGE_RETRIEVAL_DEFAULT_NAMESPACE,
  createKnowledgeRetrievalOutputVariables
}
