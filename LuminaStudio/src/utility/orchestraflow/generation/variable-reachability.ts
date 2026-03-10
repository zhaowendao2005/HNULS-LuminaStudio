import type { OFGenerationGraphState, OFVariable } from '@shared/Orchestraflow-types'

export interface OFGenerationReachabilityGroup {
  node_id: string
  title: string
  variables: OFVariable[]
}

export function buildGenerationVariableReachability(
  state: OFGenerationGraphState
): OFGenerationReachabilityGroup[] {
  return state.nodes.map((node) => ({
    node_id: node.id,
    title: node.data.title,
    variables: 'output' in node.data && node.data.output ? node.data.output.variables || [] : []
  }))
}
