import type { NormalChatResolvedAction } from '../../actions/shared/action.types'

export function buildActionDescriptionsSection(
  resolvedActions: NormalChatResolvedAction[]
): string {
  const body =
    resolvedActions.length > 0
      ? resolvedActions
          .map(
            (action) =>
              `- ${action.actionKey}\n  kind: ${action.kind}\n  mode: ${action.mode}\n  description: ${action.definition.descriptor.description}`
          )
          .join('\n\n')
      : '(no actions enabled)'

  return ['## ActionDescriptions', body].join('\n\n')
}
