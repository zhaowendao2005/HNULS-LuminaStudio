import { listOFAuthoringNodeDefinitions } from '@shared/Orchestraflow-types'

export function buildCompressedNodePrompt(): string {
  return listOFAuthoringNodeDefinitions()
    .map((definition) =>
      [
        `${definition.authoring.token}: ${definition.authoring.description.summary}`,
        definition.authoring.mainPrompt,
        `error-guidance: ${definition.authoring.errorGuidance.join(' / ')}`
      ].join('\n')
    )
    .join('\n\n')
}
