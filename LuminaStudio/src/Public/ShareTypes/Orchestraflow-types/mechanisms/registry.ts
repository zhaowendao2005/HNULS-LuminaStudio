import type { OFMechanismDefinition, OFMechanismRegistry } from './types'
import { OF_MECHANISM_DEFINITIONS } from './definitions'

const MECHANISM_REGISTRY = new Map<string, OFMechanismDefinition>()

function registerMechanismDefinition(definition: OFMechanismDefinition): void {
  if (MECHANISM_REGISTRY.has(definition.id)) {
    throw new Error(`Duplicate OrchestraFlow mechanism definition: ${definition.id}`)
  }
  MECHANISM_REGISTRY.set(definition.id, definition)
}

OF_MECHANISM_DEFINITIONS.forEach(registerMechanismDefinition)

export function resolveOFMechanismDefinition(id: string): OFMechanismDefinition {
  const definition = MECHANISM_REGISTRY.get(id)
  if (!definition) {
    throw new Error(`Unknown OrchestraFlow mechanism definition: ${id}`)
  }
  return definition
}

export function listOFMechanismDefinitions(): OFMechanismDefinition[] {
  return Array.from(MECHANISM_REGISTRY.values())
}

export const builtInOFMechanismRegistry: OFMechanismRegistry = {
  resolve: resolveOFMechanismDefinition,
  list: listOFMechanismDefinitions
}
