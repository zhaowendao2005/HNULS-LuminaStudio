import type { OFBlockEnum } from './core-types'
import type {
  OFAuthoringNodeDefinition,
  OFNodeAuthoringToken,
  OFNodeDefinition
} from './node-definition'
import { isOFAuthoringNodeDefinition } from './node-definition'
import {
  endNodeDefinition,
  ifNodeDefinition,
  iterationNodeDefinition,
  iterationStartNodeDefinition,
  llmNodeDefinition,
  loopNodeDefinition,
  loopStartNodeDefinition,
  startNodeDefinition,
  variableAssignNodeDefinition
} from './nodes'

const NODE_DEFINITION_REGISTRY = new Map<OFBlockEnum, OFNodeDefinition>()
const AUTHORING_NODE_REGISTRY = new Map<OFNodeAuthoringToken, OFAuthoringNodeDefinition>()
const LEGACY_AUTHORING_TOKEN_REGISTRY = new Map<string, OFAuthoringNodeDefinition>()

export interface OFNodeDefinitionRegistry {
  resolve(type: OFBlockEnum): OFNodeDefinition
  list(): OFNodeDefinition[]
}

function registerNodeDefinition(definition: OFNodeDefinition): void {
  if (NODE_DEFINITION_REGISTRY.has(definition.runtime.type)) {
    throw new Error(`Duplicate OrchestraFlow node definition: ${definition.runtime.type}`)
  }

  NODE_DEFINITION_REGISTRY.set(definition.runtime.type, definition)

  if (!isOFAuthoringNodeDefinition(definition)) {
    return
  }

  if (AUTHORING_NODE_REGISTRY.has(definition.dsl.authoringToken)) {
    throw new Error(`Duplicate OrchestraFlow authoring token: ${definition.dsl.authoringToken}`)
  }

  AUTHORING_NODE_REGISTRY.set(definition.dsl.authoringToken, definition)

  for (const legacyToken of definition.dsl.legacyTokens || []) {
    LEGACY_AUTHORING_TOKEN_REGISTRY.set(legacyToken, definition)
  }
}

;[
  startNodeDefinition,
  llmNodeDefinition,
  ifNodeDefinition,
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

export function resolveOFAuthoringNodeDefinition(
  token: OFNodeAuthoringToken
): OFAuthoringNodeDefinition {
  const definition = AUTHORING_NODE_REGISTRY.get(token)
  if (!definition) {
    throw new Error(`Unknown OrchestraFlow authoring token: ${token}`)
  }
  return definition
}

export function findOFAuthoringNodeDefinition(token: string): OFAuthoringNodeDefinition | null {
  return AUTHORING_NODE_REGISTRY.get(token as OFNodeAuthoringToken) || null
}

export function findOFLegacyAuthoringNodeDefinition(
  token: string
): OFAuthoringNodeDefinition | null {
  return LEGACY_AUTHORING_TOKEN_REGISTRY.get(token) || null
}

export function listOFAuthoringNodeDefinitions(): OFAuthoringNodeDefinition[] {
  return Array.from(AUTHORING_NODE_REGISTRY.values())
}

export const builtInOFNodeDefinitionRegistry: OFNodeDefinitionRegistry = {
  resolve: resolveOFNodeDefinition,
  list: listOFNodeDefinitions
}
