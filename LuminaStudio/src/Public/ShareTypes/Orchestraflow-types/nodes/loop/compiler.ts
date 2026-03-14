import type { OFNodeCompilerParams } from '../../node-definition'
import type { OFLoopNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import { resolveOFNodeOutputNamespace } from '../../node-definition'
import { loopNodeRuntimeDefinition } from './runtime'

export const loopNodeCompiler = {
  compileData({ node, compiledId, title, desc, helpers }: OFNodeCompilerParams): OFLoopNodeData {
    const config = node.config as {
      loop_count?: number
      loop_count_ref?: { selector?: string[] }
      loop_count_selector?: string[]
      loop_variables?: unknown[]
      break_conditions?: unknown[]
      logical_operator?: OFLoopNodeData['logical_operator']
    }
    const loopVariables = helpers.compileLoopVariables(config.loop_variables || [])
    const compiledSubgraph = helpers.compileContainerSubgraph(
      node,
      compiledId,
      title,
      OFBlockEnum.Loop,
      loopVariables
    )
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: loopNodeRuntimeDefinition },
        {
          nodeId: compiledId,
          title,
          fallback: 'loop'
        }
      ) || 'loop'
    return {
      title,
      desc,
      type: OFBlockEnum.Loop,
      output_namespace: outputNamespace,
      width: 650,
      height: 417,
      loop_count: Number(config.loop_count || 1),
      loop_count_ref:
        config.loop_count_ref?.selector || config.loop_count_selector
          ? {
              ...(config.loop_count_ref || {}),
              selector: helpers.compileSelectorField(
                config.loop_count_ref?.selector || config.loop_count_selector
              )
            }
          : undefined,
      loop_count_selector: helpers.compileSelectorField(
        config.loop_count_ref?.selector || config.loop_count_selector
      ),
      loop_variables: loopVariables,
      break_conditions: helpers.compileConditions(config.break_conditions || []),
      logical_operator: config.logical_operator || 'and',
      start_node_id: `${compiledId}-loop-start`,
      subgraph: compiledSubgraph.graph,
      output: {
        variables:
          loopNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            loopVariables,
            nodeId: compiledId
          }) || []
      }
    }
  }
}
