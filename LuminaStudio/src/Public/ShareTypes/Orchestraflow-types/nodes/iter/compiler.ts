import type { OFNodeCompilerParams } from '../../node-definition'
import type { OFIterationNodeData } from '../../core-types'
import { OFBlockEnum } from '../../core-types'
import { resolveOFNodeOutputNamespace } from '../../node-definition'
import { iterationNodeRuntimeDefinition } from './runtime'

export const iterationNodeCompiler = {
  compileData({
    node,
    compiledId,
    title,
    desc,
    helpers
  }: OFNodeCompilerParams): OFIterationNodeData {
    const config = node.config as {
      iterator_ref?: { selector?: string[] }
      iterator_selector?: string[]
      output_ref?: { selector?: string[] }
      output_selector?: string[]
      branch_output_selectors?: unknown[]
      parallel_mode?: OFIterationNodeData['parallel_mode']
      parallel_nums?: number
      error_handle_mode?: OFIterationNodeData['error_handle_mode']
      flatten_output?: boolean
    }
    const compiledSubgraph = helpers.compileContainerSubgraph(
      node,
      compiledId,
      title,
      OFBlockEnum.Iteration
    )
    const outputNamespace =
      resolveOFNodeOutputNamespace(
        { runtime: iterationNodeRuntimeDefinition },
        {
          nodeId: compiledId,
          title,
          fallback: 'iteration'
        }
      ) || 'iteration'
    return {
      title,
      desc,
      type: OFBlockEnum.Iteration,
      output_namespace: outputNamespace,
      width: 650,
      height: 417,
      iterator_ref: {
        selector: helpers.compileSelectorField(
          config.iterator_ref?.selector || config.iterator_selector
        )
      },
      iterator_selector: helpers.compileSelectorField(
        config.iterator_ref?.selector || config.iterator_selector
      ),
      output_ref: {
        selector: helpers.compileSelectorField(
          config.output_ref?.selector || config.output_selector
        )
      },
      output_selector: helpers.compileSelectorField(
        config.output_ref?.selector || config.output_selector
      ),
      branch_output_refs: helpers.compileIterationBranchOutputSelectors(
        config.branch_output_selectors || []
      ),
      branch_output_selectors:
        (config.branch_output_selectors as OFIterationNodeData['branch_output_selectors']) || [],
      start_node_id: `${compiledId}-iteration-start`,
      subgraph: compiledSubgraph.graph,
      parallel_mode: config.parallel_mode || 'sequential',
      parallel_nums: Number(config.parallel_nums || 1),
      error_handle_mode: config.error_handle_mode || 'terminated',
      flatten_output: config.flatten_output ?? true,
      output: {
        variables:
          iterationNodeRuntimeDefinition.buildRuntimeOutputVariables?.({
            title: outputNamespace,
            nodeId: compiledId
          }) || []
      }
    }
  }
}
