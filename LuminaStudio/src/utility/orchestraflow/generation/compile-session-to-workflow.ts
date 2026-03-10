import type { OFGenerationSession, OFWorkflow } from '@shared/Orchestraflow-types'

export function compileGenerationSessionToWorkflow(session: OFGenerationSession): OFWorkflow {
  return {
    id: session.id,
    name: session.workflow_name,
    description: session.description,
    author: 'LuminaStudio Generation',
    createdAt: session.created_at,
    updatedAt: Math.floor(Date.now() / 1000),
    status: 'draft',
    graph: {
      nodes: session.graph_state.nodes,
      edges: session.graph_state.edges
    }
  }
}
