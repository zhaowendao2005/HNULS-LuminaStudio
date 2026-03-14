import { describe, expect, it } from 'vitest'
import type {
  GenerationDocument,
  GenerationMessage,
  GenerationPlanningDocument,
  GenerationStageConfig
} from '@preload/types'
import {
  applyStreamEventToChannelMessages,
  createChannelStreamLocalState
} from './generation-editor.domain-helpers'
import type { GenerateSessionDetailViewModel } from './generation-editor.types'

function buildStageConfig(stageKey: 'analysis' | 'design' | 'verify'): GenerationStageConfig {
  return {
    stageKey,
    providerId: null,
    modelId: null,
    sdkVendor: null,
    memoryRounds: 6,
    copilotMemoryRounds: 4,
    autoApproved: false,
    activePlanningDocumentId: null,
    activeDesignDocumentId: stageKey === 'design' ? 'design-1' : null
  }
}

function buildDocument(documentKey: 'analysis' | 'design' | 'verify'): GenerationDocument {
  return {
    documentKey,
    title: `${documentKey}-doc`,
    fileName: `${documentKey}.md`,
    summary: '',
    content: ''
  }
}

function buildPlanningDocument(): GenerationPlanningDocument {
  return {
    id: 'planning-1',
    sessionId: 'session-1',
    stageKey: 'analysis',
    sourceMessageId: 'message-1',
    title: 'planning',
    sourceMarkdown: '# planning',
    content: '# planning',
    sections: {
      'analysis-summary': '',
      'analysis-goals': '',
      'analysis-success-criteria': '',
      'analysis-constraints': '',
      'analysis-prohibitions': '',
      'analysis-open-questions': '',
      'analysis-readiness-signals': '',
      'design-declared-nodes': '',
      'design-input-contract': '',
      'design-output-contract': '',
      'design-open-questions': '',
      'design-blueprint-guidance': ''
    },
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z'
  }
}

function buildOptimisticAssistantMessage(): GenerationMessage {
  return {
    id: 'optimistic-assistant',
    sessionId: 'session-1',
    channelKey: 'design-copilot',
    designDocumentId: 'design-1',
    requestId: null,
    role: 'assistant',
    content: '',
    status: 'streaming',
    providerId: 'provider-a',
    modelId: 'model-a',
    error: null,
    usageJson: null,
    metaJson: null,
    rawResponseText: null,
    rawTraceJson: null,
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z'
  }
}

function buildSessionDetail(message: GenerationMessage): GenerateSessionDetailViewModel {
  return {
    id: 'session-1',
    title: 'session',
    currentStage: 'design',
    summary: '',
    analysisTurnCount: 0,
    planGenerated: false,
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z',
    stageConfigs: {
      analysis: buildStageConfig('analysis'),
      design: buildStageConfig('design'),
      verify: buildStageConfig('verify')
    },
    documents: {
      analysis: buildDocument('analysis'),
      design: buildDocument('design'),
      verify: buildDocument('verify')
    },
    planningDocuments: {
      'planning-1': buildPlanningDocument()
    },
    designDocuments: {
      'design-1': {
        id: 'design-1',
        sessionId: 'session-1',
        planningDocumentId: 'planning-1',
        planningSourceMessageId: 'message-1',
        title: 'design',
        version: 1,
        status: 'draft',
        sourceSnapshotMarkdown: '# planning',
        contentFormat: 'of-blueprint-section-v1',
        content: '',
        summary: '',
        diagnosticsJson: null,
        latestGenerationMessageId: null,
        derivedTargetType: null,
        derivedTargetId: null,
        derivedStatus: null,
        createdAt: '2026-03-14T00:00:00.000Z',
        updatedAt: '2026-03-14T00:00:00.000Z'
      }
    },
    messagesByChannel: {
      'analysis-discussion': [],
      'analysis-copilot': [],
      'design-copilot': [message],
      'verify-copilot': []
    }
  }
}

describe('generation-editor.domain-helpers', () => {
  it('binds stream-start to optimistic assistant before sendMessage resolves', () => {
    const message = buildOptimisticAssistantMessage()
    const detail = buildSessionDetail(message)
    const localState = createChannelStreamLocalState()

    const handledStart = applyStreamEventToChannelMessages({
      detail,
      channelKey: 'design-copilot',
      event: {
        type: 'stream-start',
        requestId: 'request-1',
        sessionId: 'session-1',
        channelKey: 'design-copilot',
        messageId: 'persisted-message-1'
      },
      localState
    })

    const handledDelta = applyStreamEventToChannelMessages({
      detail,
      channelKey: 'design-copilot',
      event: {
        type: 'text-delta',
        requestId: 'request-1',
        sessionId: 'session-1',
        channelKey: 'design-copilot',
        messageId: 'persisted-message-1',
        delta: 'partial blueprint'
      },
      localState
    })

    expect(handledStart).toBe(true)
    expect(handledDelta).toBe(true)
    expect(message.id).toBe('optimistic-assistant')
    expect(message.requestId).toBe('request-1')
    expect(message.content).toBe('partial blueprint')
    expect(localState.streamMessageIdByRequest['request-1']).toBe('optimistic-assistant')
  })
})
