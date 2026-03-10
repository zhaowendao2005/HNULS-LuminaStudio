import type { OFGenerationGraphState, OFGenerationGraphSummary } from '@shared/Orchestraflow-types'

export function buildGenerationGraphSummary(
  state: OFGenerationGraphState
): OFGenerationGraphSummary {
  const node_types: Record<string, number> = {}
  const namespaces = new Set<string>()
  for (const node of state.nodes) {
    node_types[node.data.type] = (node_types[node.data.type] || 0) + 1
    if (node.data.output_namespace) namespaces.add(node.data.output_namespace)
  }
  return {
    node_count: state.nodes.length,
    edge_count: state.edges.length,
    namespaces: Array.from(namespaces),
    node_types
  }
}
