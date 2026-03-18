import type { OFNodeRuntimeDefinition } from '../../node-definition'
import type { OFNode, OFVariable } from '../../core-types'
import { OFVarType } from '../../core-types'
import { createOFPortSpec } from '../../node-definition'
import { ensureOFSelectableVariables } from '../../variable-definition'
import { paperRetrievalResultSchema } from '../../../paper-retrieval.types'

/**
 * 注意：core-types.ts 里的 OFBlockEnum 目前还没有 paper-retrieval，
 * 这里先用字符串字面量占位，后续由主 agent 在保留文件补齐正式接线。
 */
const PAPER_RETRIEVAL_BLOCK_TYPE = 'paper-retrieval'
const PAPER_RETRIEVAL_DEFAULT_NAMESPACE = 'paper_retrieval'

function createPaperRetrievalOutputVariables(namespace: string): OFVariable[] {
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
      variable: 'provider',
      label: 'provider',
      type: OFVarType.String,
      required: true,
      value_ref: {
        selector: [`${namespace}.provider`],
        path: `${namespace}.provider`,
        label: 'provider',
        type: OFVarType.String
      }
    },
    {
      variable: 'total_found',
      label: 'total_found',
      type: OFVarType.Number,
      required: true,
      value_ref: {
        selector: [`${namespace}.total_found`],
        path: `${namespace}.total_found`,
        label: 'total_found',
        type: OFVarType.Number
      }
    },
    {
      variable: 'returned_count',
      label: 'returned_count',
      type: OFVarType.Number,
      required: true,
      value_ref: {
        selector: [`${namespace}.returned_count`],
        path: `${namespace}.returned_count`,
        label: 'returned_count',
        type: OFVarType.Number
      }
    },
    {
      variable: 'items',
      label: 'items',
      type: OFVarType.Array,
      required: true,
      schema: paperRetrievalResultSchema.properties.items,
      value_ref: {
        selector: [`${namespace}.items`],
        path: `${namespace}.items`,
        label: 'items',
        type: OFVarType.Array,
        schema: paperRetrievalResultSchema.properties.items
      }
    },
    {
      variable: 'latency_ms',
      label: 'latency_ms',
      type: OFVarType.Number,
      required: true,
      value_ref: {
        selector: [`${namespace}.latency_ms`],
        path: `${namespace}.latency_ms`,
        label: 'latency_ms',
        type: OFVarType.Number
      }
    },
    {
      variable: 'result',
      label: 'result',
      type: OFVarType.Object,
      required: true,
      schema: paperRetrievalResultSchema,
      value_ref: {
        selector: [`${namespace}.result`],
        path: `${namespace}.result`,
        label: 'result',
        type: OFVarType.Object,
        schema: paperRetrievalResultSchema
      }
    }
  ]
}

export const paperRetrievalNodeRuntimeDefinition: OFNodeRuntimeDefinition & { kind: 'standard' } = {
  type: PAPER_RETRIEVAL_BLOCK_TYPE as never,
  title: 'paper-retrieval',
  summary: '执行论文检索，并输出标准化论文结果。',
  category: 'llm',
  kind: 'standard',
  vueFlowType: PAPER_RETRIEVAL_BLOCK_TYPE,
  ports: [
    createOFPortSpec({
      id: 'target',
      label: '进入',
      direction: 'input',
      channel: 'control',
      required: true
    }),
    createOFPortSpec({ id: 'source', label: '继续', direction: 'output', channel: 'control' }),
    createOFPortSpec({ id: 'paper', label: '论文结果', direction: 'output', channel: 'data' })
  ],
  system_managed_fields: ['data.output.variables'],
  side_effects: [{ id: 'paper-retrieval', summary: '按 provider 执行论文检索并返回统一结果。' }],
  output_namespace: {
    source: 'system-stable',
    editable: true,
    summary: 'paper-retrieval 输出使用稳定命名空间，默认按 nodeId 生成。'
  },
  buildRuntimeOutputVariables({ title }) {
    return createPaperRetrievalOutputVariables(title || PAPER_RETRIEVAL_DEFAULT_NAMESPACE)
  },
  getSelectableVariables(node: OFNode) {
    const data = (node.data || {}) as { output?: { variables?: OFVariable[] } }
    return ensureOFSelectableVariables(data.output?.variables || [])
  }
}

export {
  PAPER_RETRIEVAL_BLOCK_TYPE,
  PAPER_RETRIEVAL_DEFAULT_NAMESPACE,
  createPaperRetrievalOutputVariables
}
