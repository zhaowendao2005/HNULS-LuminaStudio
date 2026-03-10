import type { OFEdge, OFGenerationGraphState, OFNode } from '@shared/Orchestraflow-types'
import { createEmptyOFGenerationGraphState } from '@shared/Orchestraflow-types'

export type GenerationGraphMutation =
  | { type: 'replace'; state: OFGenerationGraphState }
  | { type: 'upsert-node'; node: OFNode }
  | { type: 'add-edge'; edge: OFEdge }
  | { type: 'remove-node'; node_id: string }

export function reduceGenerationGraphState(
  current: OFGenerationGraphState | undefined,
  mutations: GenerationGraphMutation[]
): OFGenerationGraphState {
  let state = current ? structuredClone(current) : createEmptyOFGenerationGraphState()
  for (const mutation of mutations) {
    switch (mutation.type) {
      case 'replace':
        state = structuredClone(mutation.state)
        break
      case 'upsert-node': {
        const index = state.nodes.findIndex((item) => item.id === mutation.node.id)
        if (index >= 0) state.nodes[index] = mutation.node
        else state.nodes.push(mutation.node)
        break
      }
      case 'add-edge':
        if (!state.edges.some((item) => item.id === mutation.edge.id)) {
          state.edges.push(mutation.edge)
        }
        break
      case 'remove-node':
        state.nodes = state.nodes.filter((item) => item.id !== mutation.node_id)
        state.edges = state.edges.filter(
          (item) => item.source !== mutation.node_id && item.target !== mutation.node_id
        )
        break
    }
  }
  state.version += 1
  state.node_snapshots = state.nodes.map((node) => ({
    id: node.id,
    type: node.data.type,
    title: node.data.title,
    output_namespace: node.data.output_namespace || node.id,
    node
  }))
  return state
}
