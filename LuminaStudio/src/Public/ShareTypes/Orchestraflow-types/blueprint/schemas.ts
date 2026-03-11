export const GENERATED_BLUEPRINT_WORKFLOW_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'OFBlueprintWorkflow',
  type: 'object',
  required: ['version', 'workflow', 'nodes', 'edges'],
  properties: {
    version: { const: '2.0' },
    workflow: {
      type: 'object',
      required: ['name'],
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        author: { type: 'string' }
      },
      additionalProperties: true
    },
    nodes: { type: 'array' },
    edges: { type: 'array' }
  },
  additionalProperties: false
} as const

export const GENERATED_RUNNABLE_WORKFLOW_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'OFRunnableWorkflow',
  type: 'object',
  required: ['id', 'name', 'author', 'createdAt', 'updatedAt', 'status', 'graph'],
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    author: { type: 'string' },
    createdAt: { type: 'number' },
    updatedAt: { type: 'number' },
    status: { enum: ['draft', 'published', 'archived'] },
    graph: { type: 'object' }
  },
  additionalProperties: true
} as const
