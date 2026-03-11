import {
  buildOFCommonNodeShape,
  createOFPortSpec,
  defineStandardOFNodeDefinition,
  normalizeOFNodeTitle,
  resolveOFNodeOutputNamespace
} from '../node-definition'
import {
  ensureOFSelectableVariables,
  variableAssignOutputVariableDefinition
} from '../variable-definition'
import type { OFVariableAssignNodeData } from '../core-types'
import { OF_VARIABLE_ASSIGN_NODE_NAME, OFBlockEnum } from '../core-types'
import { omitOFEmptySelector, omitOFNullSchemaFields } from './helpers'
import {
  collectOFSelectorVariableRoots,
  normalizeOFRunnableNodeSelectorData
} from '../selector-utils'

function buildOutputs(namespace: string, rules: OFVariableAssignNodeData['rules'], nodeId: string) {
  return variableAssignOutputVariableDefinition.build({
    namespace,
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
    spec: {
      ports: [
        createOFPortSpec({ id: 'target', label: '进入', direction: 'input', channel: 'control', required: true }),
        createOFPortSpec({ id: 'source', label: '继续', direction: 'output', channel: 'control' }),
        createOFPortSpec({ id: 'assigned', label: '赋值结果', direction: 'output', channel: 'data' })
      ],
      system_managed_fields: ['data.output.variables'],
      side_effects: [{ id: 'assign-variables', summary: '把常量或变量引用写入当前节点输出命名空间。' }],
      output_namespace: {
        source: 'system-stable',
        editable: true,
        summary: '赋值节点输出使用稳定命名空间；旧工作流会沿用已有值，新节点默认按 nodeId 生成。'
      }
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
      createDefaultData({ nodeId, title }) {
        const outputNamespace =
          resolveOFNodeOutputNamespace(variableAssignNodeDefinition, {
            nodeId,
            fallback: OF_VARIABLE_ASSIGN_NODE_NAME
          }) || OF_VARIABLE_ASSIGN_NODE_NAME
        return {
          title,
          desc: '',
          type: OFBlockEnum.VariableAssign,
          output_namespace: outputNamespace,
          rules: [],
          output: { variables: [] }
        }
      },
      normalizeData({ node }) {
        const data = node.data as Partial<OFVariableAssignNodeData>
        const title = normalizeOFNodeTitle(OFBlockEnum.VariableAssign, data.title)
        const normalized = {
          ...data,
          rules: data.rules || []
        } as OFVariableAssignNodeData
        const outputNamespace =
          resolveOFNodeOutputNamespace(variableAssignNodeDefinition, {
            current: data.output_namespace,
            nodeId: node.id,
            title,
            fallback: OF_VARIABLE_ASSIGN_NODE_NAME
          }) || OF_VARIABLE_ASSIGN_NODE_NAME
        normalizeOFRunnableNodeSelectorData(
          OFBlockEnum.VariableAssign,
          normalized as unknown as Record<string, unknown>,
          collectOFSelectorVariableRoots([node])
        )
        return {
          ...buildOFCommonNodeShape(data, title),
          type: OFBlockEnum.VariableAssign,
          output_namespace: outputNamespace,
          rules: normalized.rules,
          output: {
            variables: buildOutputs(outputNamespace, normalized.rules || [], node.id)
          }
        }
      }
    },
    compiler: {
      compileData({ node, title, desc, helpers, compiledId }) {
        const rules = (node.config.rules || []).map(
          (item: OFVariableAssignNodeData['rules'][number]) => ({
            ...item,
            source:
              item.source?.mode === 'constant'
                ? item.source
                : {
                    mode: 'variable',
                    ref: {
                      ...(item.source?.mode === 'variable' ? item.source.ref : {}),
                      selector: helpers.compileSelectorField(
                        item.source?.mode === 'variable'
                          ? item.source.ref.selector
                          : item.source_selector
                      )
                    }
                  }
          })
        )
        return {
          title,
          desc,
          type: OFBlockEnum.VariableAssign,
          output_namespace:
            resolveOFNodeOutputNamespace(variableAssignNodeDefinition, {
              nodeId: compiledId,
              title,
              fallback: OF_VARIABLE_ASSIGN_NODE_NAME
            }) || OF_VARIABLE_ASSIGN_NODE_NAME,
          rules,
          output: {
            variables: buildOutputs(
              resolveOFNodeOutputNamespace(variableAssignNodeDefinition, {
                nodeId: compiledId,
                title,
                fallback: OF_VARIABLE_ASSIGN_NODE_NAME
              }) || OF_VARIABLE_ASSIGN_NODE_NAME,
              rules,
              compiledId
            )
          }
        }
      }
    }
  })
