import type { NormalChatResolvedAction } from '../../actions/shared/action.types'

export function buildLoadedActionSpecsSection(loadedActions: NormalChatResolvedAction[]): string {
  const body =
    loadedActions.length > 0
      ? loadedActions
          .map(
            (action) =>
              `### ${action.actionKey}\n\nSchema:\n${JSON.stringify(action.definition.schema, null, 2)}\n\nPrompt:\n${action.definition.prompt}`
          )
          .join('\n\n')
      : '(no loaded action specs)'

  return ['## LoadedActionSpecs', body].join('\n\n')
}
