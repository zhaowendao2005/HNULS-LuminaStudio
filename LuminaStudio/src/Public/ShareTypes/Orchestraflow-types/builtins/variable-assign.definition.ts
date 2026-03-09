import {
  buildOFCommonNodeShape,
  defineStandardOFNodeDefinition,
  normalizeOFNodeTitle
} from '../node-definition'
import {
  ensureOFSelectableVariables,
  variableAssignOutputVariableDefinition
} from '../variable-definition'
import type { OFVariableAssignNodeData } from '../core-types'
import { OFBlockEnum } from '../core-types'
import { omitOFEmptySelector, omitOFNullSchemaFields } from './helpers'

function buildOutputs(title: string, rules: OFVariableAssignNodeData['rules'], nodeId: string) {
  return variableAssignOutputVariableDefinition.build({
    namespace: title,
    rules,
    fallbackNodeId: nodeId
  })
}

export const variableAssignNodeDefinition =
  defineStandardOFNodeDefinition<OFVariableAssignNodeData>({
    meta: {
      type: OFBlockEnum.VariableAssign,
      title: '变量赋值',
      summary: '把变量或常量写入命名空间输出。',
      category: 'end',
      kind: 'standard',
      vueFlowType: 'variable-assign',
      ai_exposed: true
    },
    authoring: {
      contract: {
        type: OFBlockEnum.VariableAssign,
        title: '变量赋值',
        ai_exposed: true,
        author_required_fields: ['data.rules'],
      compiler_injected_fields: ['data.output.variables'],
      runtime_invariants: [],
      produced_outputs: ['rules[*].target_variable'],
      notes: ['变量赋值节点输出变量由规则目标变量自动派生。']
      },
      system_managed_fields: ['data.output.variables'],
      selector_policies: ['`rules[*].source_selector` 仅在 `source_mode=variable` 时出现。'],
      output_policies: ['输出变量按 `target_variable` 自动派生。'],
      omit_rules: ['`source_mode=constant` 时省略 `source_selector`。']
    },
    prompt: {
      sanitizePromptNode(node) {
        const data = node.data as OFVariableAssignNodeData
        return {
          ...node,
          data: {
            ...data,
            rules: data.rules.map((item) =>
              item.source_mode === 'variable' ? omitOFEmptySelector(item, 'source_selector') : item
            ),
            output: {
              ...data.output,
              variables: data.output.variables.map((item) => omitOFNullSchemaFields(item))
            }
          }
        }
      }
    },
    variables: {
      buildRuntimeOutputVariables({ title, rules, nodeId }) {
        return buildOutputs(title, rules || [], nodeId || title)
      },
      getSelectableVariables(node) {
        const data = node.data as OFVariableAssignNodeData
        return ensureOFSelectableVariables(data.output?.variables || [])
      }
    },
    editor: {
      createDefaultData({ title }) {
        return {
          title,
          desc: '',
          type: OFBlockEnum.VariableAssign,
          rules: [],
          output: { variables: [] }
        }
      },
      normalizeData({ node }) {
        const data = node.data as Partial<OFVariableAssignNodeData>
        const title = normalizeOFNodeTitle(OFBlockEnum.VariableAssign, data.title)
        return {
          ...buildOFCommonNodeShape(data, title),
          type: OFBlockEnum.VariableAssign,
          rules: data.rules || [],
          output: {
            variables: buildOutputs(title, data.rules || [], node.id)
          }
        }
      }
    },
    compiler: {
      compileData({ node, title, desc, helpers, compiledId }) {
        const rules = (node.config.rules || []).map((item: any) => ({
          ...item,
          source_selector: helpers.compileSelectorField(item.source_selector)
        }))
        return {
          title,
          desc,
          type: OFBlockEnum.VariableAssign,
          rules,
          output: {
            variables: buildOutputs(title, rules, compiledId)
          }
        }
      }
    }
  })
