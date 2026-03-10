import {
  buildOFCommonNodeShape,
  defineStandardOFNodeDefinition,
  normalizeOFNodeTitle
} from '../node-definition'
import { ensureOFSelectableVariables } from '../variable-definition'
import type { OFEndNodeData } from '../core-types'
import { OFBlockEnum } from '../core-types'
import { omitOFEmptySelector, omitOFNullSchemaFields } from './helpers'
import {
  collectOFSelectorVariableRoots,
  normalizeOFRunnableNodeSelectorData
} from '../selector-utils'

export const endNodeDefinition = defineStandardOFNodeDefinition<OFEndNodeData>({
  meta: {
    type: OFBlockEnum.End,
    title: '结束',
    summary: '映射最终输出变量。',
    category: 'end',
    kind: 'standard',
    vueFlowType: 'end',
    ai_exposed: true
  },
  authoring: {
    contract: {
      type: OFBlockEnum.End,
      title: '结束',
      ai_exposed: true,
      author_required_fields: ['data.output.variables'],
      compiler_injected_fields: [],
      runtime_invariants: [],
      produced_outputs: ['data.output.variables[*].variable'],
      notes: ['结束节点通过 value_selector 从变量存储中提取最终输出。']
    },
    warnings_zh: ['`output.variables[*].value_selector` 可省略时直接省略，不能写空数组。'],
    selector_policies: ['结束节点输出通过 `value_selector` 从变量存储读取。'],
    omit_rules: ['可省略时不要输出空 `value_selector: []`。']
  },
  prompt: {
    sanitizePromptNode(node) {
      const data = node.data as OFEndNodeData
      return {
        ...node,
        data: {
          ...data,
          output: {
            ...data.output,
            variables: data.output.variables.map((item) =>
              omitOFEmptySelector(omitOFNullSchemaFields(item), 'value_selector')
            )
          }
        }
      }
    }
  },
  variables: {
    getSelectableVariables(node) {
      const data = node.data as OFEndNodeData
      return ensureOFSelectableVariables(data.output?.variables || [])
    }
  },
  editor: {
    createDefaultData({ title }) {
      return {
        title,
        desc: '',
        type: OFBlockEnum.End,
        output: { variables: [] }
      }
    },
    normalizeData({ node }) {
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
  },
  compiler: {
    compileData({ node, title, desc, helpers }) {
      return {
        title,
        desc,
        type: OFBlockEnum.End,
        output: {
          variables: helpers.compileVariables(node.config.output?.variables || [])
        }
      }
    }
  }
})
