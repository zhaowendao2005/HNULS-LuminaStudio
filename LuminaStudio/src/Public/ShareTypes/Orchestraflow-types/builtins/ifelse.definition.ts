import {
  buildOFCommonNodeShape,
  defineStandardOFNodeDefinition,
  normalizeOFNodeTitle
} from '../node-definition'
import type { OFIfElseNodeData } from '../core-types'
import { OFBlockEnum } from '../core-types'
import { omitOFField } from './helpers'
import {
  collectOFSelectorVariableRoots,
  normalizeOFRunnableNodeSelectorData
} from '../selector-utils'
import type { OFIfElseElseCase } from '../core-types'

export const ifElseNodeDefinition = defineStandardOFNodeDefinition<OFIfElseNodeData>({
  meta: {
    type: OFBlockEnum.IfElse,
    title: '条件分支',
    summary: '按条件选择分支 handle。',
    category: 'logic',
    kind: 'standard',
    vueFlowType: 'ifelse',
    ai_exposed: true,
    output_namespace: {
      strategy: 'stable-id',
      default_prefix: 'ifelse',
      system_managed: true
    },
    ports: [
      { id: 'target', kind: 'control-in', label: 'In', stable: true },
      { id: 'if', kind: 'control-out', label: 'If', stable: true, branch_key: 'if' },
      { id: 'else', kind: 'control-out', label: 'Else', stable: true, branch_key: 'else' }
    ],
    sideEffects: ['branch-control']
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
      '每个 condition 都必须始终提供左值 `variable_selector`；`compare_selector` 绝不能替代它。',
      '`variable_path` / `compare_path` 只是 selector 的可读路径文本，不能替代真正的 selector。',
      '开始节点 object 输入的嵌套字段请写成分段 selector，例如 `["content_package","config","process_mode"]`，不要写成 `["content_package.config.process_mode"]`。',
      '仅当 `compare_source_mode=variable` 时才写 `compare_selector`，且 selector 必须非空。',
      '不要为普通分支条件补空 `compare_selector: []` 占位。'
    ],
    selector_policies: [
      '每个 condition 的左值必须使用 `variable_selector`，且必须是至少 1 段的非空字符串数组。',
      '`variable_path` 仅作为由 `variable_selector` 派生的展示文本。',
      '开始节点 object 输入字段应使用分段 selector，而不是把整个点路径塞进 selector[0]。'
    ],
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
  },
  compiler: {
    compileData({ node, title, desc, helpers }) {
      return {
        title,
        desc,
        type: OFBlockEnum.IfElse,
        cases: ((node.config.cases as OFIfElseNodeData['cases'] | undefined) || []).map(
          (item: OFIfElseNodeData['cases'][number]) => ({
            ...item,
            conditions: helpers.compileConditions(item.conditions || [])
          })
        ),
        elseCase: (node.config.elseCase as OFIfElseElseCase | undefined) || {
          handleId: 'else',
          label: 'ELSE'
        }
      }
    }
  }
})
