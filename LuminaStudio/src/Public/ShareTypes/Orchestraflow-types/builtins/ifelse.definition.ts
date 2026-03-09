import {
  buildOFCommonNodeShape,
  defineStandardOFNodeDefinition,
  normalizeOFNodeTitle
} from '../node-definition'
import type { OFIfElseNodeData } from '../core-types'
import { OFBlockEnum } from '../core-types'
import { omitOFField } from './helpers'

export const ifElseNodeDefinition = defineStandardOFNodeDefinition<OFIfElseNodeData>({
  meta: {
    type: OFBlockEnum.IfElse,
    title: '条件分支',
    summary: '按条件选择分支 handle。',
    category: 'logic',
    kind: 'standard',
    vueFlowType: 'ifelse',
    ai_exposed: true
  },
  authoring: {
    contract: {
      type: OFBlockEnum.IfElse,
      title: '条件分支',
      ai_exposed: true,
      author_required_fields: ['data.cases', 'data.elseCase'],
      compiler_injected_fields: [],
      runtime_invariants: [
        {
          id: 'ifelse-edge-source-handle-match-branch',
          level: 'error',
          scope: 'edge',
          summary: 'IfElse 出边的 sourceHandle 必须匹配 case.handleId 或 elseCase.handleId。'
        }
      ],
      produced_outputs: ['matchedHandleId', 'matchedLabel', 'caseEvaluations'],
      notes: ['IfElse 节点通过 control.selectedSourceHandleIds 驱动后续边选择。']
    },
    warnings_zh: [
      '仅当 `compare_source_mode=variable` 时才写 `compare_selector`，且 selector 必须非空。',
      '不要为普通分支条件补空 `compare_selector: []` 占位。'
    ],
    selector_policies: ['所有条件 selector 必须是至少 1 段的非空字符串数组。'],
    omit_rules: ['仅在 `compare_source_mode=variable` 时输出 `compare_selector`。']
  },
  prompt: {
    sanitizePromptNode(node) {
      const data = node.data as OFIfElseNodeData
      return {
        ...node,
        data: {
          ...data,
          cases: data.cases.map((item) => ({
            ...item,
            conditions: item.conditions.map((condition) =>
              condition.compare_source_mode === 'variable'
                ? condition
                : omitOFField(condition, 'compare_selector')
            )
          }))
        }
      }
    }
  },
  variables: {
    getSelectableVariables() {
      return []
    }
  },
  editor: {
    createDefaultData({ title }) {
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
    normalizeData({ node }) {
      const data = node.data as Partial<OFIfElseNodeData>
      return {
        ...buildOFCommonNodeShape(data, normalizeOFNodeTitle(OFBlockEnum.IfElse, data.title)),
        type: OFBlockEnum.IfElse,
        cases: data.cases || [],
        elseCase: data.elseCase || {
          handleId: 'else',
          label: 'ELSE'
        }
      }
    }
  },
  compiler: {
    compileData({ node, title, desc, helpers }) {
      return {
        title,
        desc,
        type: OFBlockEnum.IfElse,
        cases: (node.config.cases || []).map((item: any) => ({
          ...item,
          conditions: helpers.compileConditions(item.conditions || [])
        })),
        elseCase: node.config.elseCase || {
          handleId: 'else',
          label: 'ELSE'
        }
      }
    }
  }
})
