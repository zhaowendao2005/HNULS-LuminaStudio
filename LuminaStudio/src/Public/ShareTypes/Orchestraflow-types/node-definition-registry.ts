import type { OFNodeDefinition } from './node-definition'
import { OFBlockEnum } from './core-types'
import {
  endNodeDefinition,
  ifElseNodeDefinition,
  iterationNodeDefinition,
  iterationStartNodeDefinition,
  llmNodeDefinition,
  loopNodeDefinition,
  loopStartNodeDefinition,
  startNodeDefinition,
  variableAssignNodeDefinition
} from './builtins'

const NODE_DEFINITION_REGISTRY = new Map<OFBlockEnum, OFNodeDefinition>()

export interface OFNodeDefinitionRegistry {
  resolve(type: OFBlockEnum): OFNodeDefinition
  list(): OFNodeDefinition[]
}

function registerNodeDefinition(definition: OFNodeDefinition): void {
  if (NODE_DEFINITION_REGISTRY.has(definition.meta.type)) {
    throw new Error(`Duplicate OrchestraFlow node definition: ${definition.meta.type}`)
  }
  NODE_DEFINITION_REGISTRY.set(definition.meta.type, definition)
}

;[
  startNodeDefinition,
  llmNodeDefinition,
  ifElseNodeDefinition,
  iterationNodeDefinition,
  iterationStartNodeDefinition,
  loopNodeDefinition,
  loopStartNodeDefinition,
  variableAssignNodeDefinition,
  endNodeDefinition
].forEach(registerNodeDefinition)

export function resolveOFNodeDefinition(type: OFBlockEnum): OFNodeDefinition {
  const definition = NODE_DEFINITION_REGISTRY.get(type)
  if (!definition) {
    throw new Error(`Unknown OrchestraFlow node definition: ${type}`)
  }
  return definition
}

export function listOFNodeDefinitions(): OFNodeDefinition[] {
  return Array.from(NODE_DEFINITION_REGISTRY.values())
}

export const builtInOFNodeDefinitionRegistry: OFNodeDefinitionRegistry = {
  resolve: resolveOFNodeDefinition,
  list: listOFNodeDefinitions
}
