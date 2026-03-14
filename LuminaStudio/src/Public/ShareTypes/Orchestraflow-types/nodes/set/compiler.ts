import type { OFNodeCompilerParams } from '../../node-definition'
import type { OFVariableAssignNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import { resolveOFNodeOutputNamespace } from '../../node-definition'
import { VARIABLE_ASSIGN_DEFAULT_NAMESPACE, variableAssignNodeRuntimeDefinition } from './runtime'

export const variableAssignNodeCompiler = {
  compileData({
    node,
    title,
    desc,
    helpers,
    compiledId
  }: OFNodeCompilerParams): OFVariableAssignNodeData {
    const config = node.config as { rules?: OFVariableAssignNodeData['rules'] }
    const rules: OFVariableAssignNodeData['rules'] = (config.rules || []).map(
      (item: OFVariableAssignNodeData['rules'][number]) => ({
        ...item,
        source:
          item.source?.mode === 'constant'
            ? {
                ...item.source,
                constant_value: helpers.compileTemplateValue(item.source.constant_value)
              }
            : {
                mode: 'variable' as const,
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
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: variableAssignNodeRuntimeDefinition },
        {
          nodeId: compiledId,
          title,
          fallback: VARIABLE_ASSIGN_DEFAULT_NAMESPACE
        }
      ) || VARIABLE_ASSIGN_DEFAULT_NAMESPACE
    return {
      title,
      desc,
      type: OFBlockEnum.VariableAssign,
      output_namespace: outputNamespace,
      rules,
      output: {
        variables:
          variableAssignNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            rules,
            nodeId: compiledId
          }) || []
      }
    }
  }
}
