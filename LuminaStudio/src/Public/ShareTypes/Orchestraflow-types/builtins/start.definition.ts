import {
  buildOFCommonNodeShape,
  defineStandardOFNodeDefinition,
  normalizeOFNodeTitle
} from '../node-definition'
import { ensureOFSelectableVariables, startInputVariableDefinition } from '../variable-definition'
import type { OFStartNodeData } from '../core-types'
import { OFBlockEnum } from '../core-types'
import { omitOFEmptySelector } from './helpers'
import {
  collectOFSelectorVariableRoots,
  normalizeOFRunnableNodeSelectorData
} from '../selector-utils'

export const startNodeDefinition = defineStandardOFNodeDefinition<OFStartNodeData>({
  meta: {
    type: OFBlockEnum.Start,
    title: '开始',
    summary: '定义工作流输入变量。',
    category: 'start',
    kind: 'standard',
    vueFlowType: 'start',
    ai_exposed: true,
    output_namespace: {
      strategy: 'system',
      default_prefix: 'start',
      system_managed: true
    },
    ports: [
      { id: 'source', kind: 'control-out', label: 'Next', stable: true },
      { id: 'output', kind: 'data-out', label: 'Input variables', stable: true, multiple: true }
    ],
    sideEffects: []
  },
  authoring: {
    contract: {
      type: OFBlockEnum.Start,
      title: '开始',
      ai_exposed: true,
      author_required_fields: ['data.input.variables'],
      compiler_injected_fields: [],
      runtime_invariants: [],
      produced_outputs: ['input.variables[*].variable'],
      notes: ['开始节点把输入变量原样写入变量存储。']
    },
    warnings_zh: [
      '如果声明运行前需要填写的输入变量，优先补 `default`，让导入后的工作流可以直接运行。',
      '`default` 是运行前预填值，不是 `value_selector`；两者不要混淆。',
      '`array` / `object` 类型的 `default` 必须写成真实 JSON 值，不要写成字符串化 JSON。'
    ],
    defaults: startInputVariableDefinition.authoring_defaults || [],
    omit_rules: ['可省略时不要输出空 `value_selector: []`。'],
    residual_notes_zh: ['开始节点输入变量会直接暴露给 run panel 作为预填输入。']
  },
  prompt: {
    sanitizePromptNode(node) {
      const data = node.data as OFStartNodeData
      return {
        ...node,
        data: {
          ...data,
          input: {
            ...data.input,
            variables: data.input.variables.map((item) =>
              omitOFEmptySelector(item, 'value_selector')
            )
          }
        }
      }
    }
  },
  variables: {
    getSelectableVariables(node) {
      const data = node.data as OFStartNodeData
      return ensureOFSelectableVariables(data.input?.variables || [])
    }
  },
  editor: {
    createDefaultData({ title }) {
      return {
        title,
        desc: '',
        type: OFBlockEnum.Start,
        input: { variables: [] }
      }
    },
    normalizeData({ node }) {
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
  },
  compiler: {
    compileData({ node, title, desc, helpers }) {
      return {
        title,
        desc,
        type: OFBlockEnum.Start,
        input: {
          variables: helpers.compileVariables(
            ((node.config.input as OFStartNodeData['input'] | undefined)?.variables ||
              []) as unknown[]
          )
        }
      }
    }
  }
})
