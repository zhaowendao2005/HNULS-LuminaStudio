import {
  buildOFBlueprintTextContextPack,
  renderOFAgentContextPack
} from '@shared/Orchestraflow-types'
import type { GenerationEditorRepository } from '../../../repositories/generation-editor.repository'
import type { DesignBlueprintContextBundle } from './types'

export function buildDesignBlueprintContextBundle(params: {
  repository: GenerationEditorRepository
  sessionId: string
  designDocumentId: string
  memoryRounds: number
}): DesignBlueprintContextBundle {
  const designDocument = params.repository.getDesignDocumentById(params.designDocumentId)
  const recentMessages = params.repository
    .listMessages({
      sessionId: params.sessionId,
      channelKey: 'design-copilot',
      designDocumentId: params.designDocumentId
    })
    .slice(-params.memoryRounds * 2)

  const contextPack = buildOFBlueprintTextContextPack({
    snapshotMarkdown: designDocument.sourceSnapshotMarkdown,
    currentDsl: designDocument.content
  })

  return {
    snapshotMarkdown: designDocument.sourceSnapshotMarkdown,
    currentDsl: designDocument.content,
    copilotHistoryText: recentMessages.length
      ? recentMessages
          .map((message, index) => {
            return [
              `#${index + 1} [${message.role}]`,
              `status: ${message.status}`,
              message.content || '(empty)'
            ].join('\n')
          })
          .join('\n\n')
      : '(当前版本暂无 design copilot 历史消息)',
    capabilityContextText: renderOFAgentContextPack(contextPack, [
      'manifest',
      'mechanisms',
      'nodes',
      'blueprint-text-authoring'
    ])
  }
}
