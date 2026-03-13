import {} from '@shared/Orchestraflow-types'
import type { GenerationEditorRepository } from '../../../repositories/generation-editor.repository'
import { buildDeclaredNodeSpecsPrompt } from '../../prompt-sources/declared-node-spec.source'
import { buildDslSyntaxPrompt } from '../../prompt-sources/dsl-syntax.source'
import { buildMechanismRulesPrompt } from '../../prompt-sources/mechanism-rules.source'
import { buildDeclaredNodesPrompt } from '../../prompt-sources/node-selection.source'
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
    declaredNodesText: buildDeclaredNodesPrompt(designDocument.sourceSnapshotMarkdown),
    declaredNodeSpecsText: buildDeclaredNodeSpecsPrompt(designDocument.sourceSnapshotMarkdown),
    mechanismRulesText: buildMechanismRulesPrompt(),
    dslSyntaxText: buildDslSyntaxPrompt()
  }
}
