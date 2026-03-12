import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type {
  GenerationDocument,
  GenerationRuntimeStageKey,
  GenerationSessionDetail,
  GenerationSessionSummary,
  GenerationStageConfig
} from '@preload/types'

const { listSessionsMock, createSessionMock, deleteSessionMock, getSessionDetailMock } = vi.hoisted(
  () => ({
    listSessionsMock: vi.fn<() => Promise<GenerationSessionSummary[]>>(),
    createSessionMock: vi.fn<(request: { title: string }) => Promise<GenerationSessionDetail>>(),
    deleteSessionMock: vi.fn<(sessionId: string) => Promise<void>>(),
    getSessionDetailMock: vi.fn<(sessionId: string) => Promise<GenerationSessionDetail>>()
  })
)

vi.mock('./sessions/session-list.datasource', () => ({
  SessionListDataSource: {
    listSessions: listSessionsMock,
    createSession: createSessionMock,
    deleteSession: deleteSessionMock
  }
}))

vi.mock('./sessions/session-detail-cache.datasource', () => ({
  SessionDetailCacheDataSource: {
    getSessionDetail: getSessionDetailMock
  }
}))

vi.mock('./generation-editor.datasource', async () => {
  const actual = await vi.importActual<typeof import('./generation-editor.datasource')>(
    './generation-editor.datasource'
  )

  return {
    ...actual,
    OrchestflowGenerationEditorDataSource: {
      listSessions: vi.fn(),
      createSession: vi.fn(),
      deleteSession: vi.fn(),
      getSessionDetail: vi.fn(),
      updateSessionState: vi.fn(),
      saveStageConfig: vi.fn(),
      saveDocument: vi.fn(),
      sendMessage: vi.fn(),
      abortMessage: vi.fn(),
      onStream: vi.fn(() => () => {})
    }
  }
})

import { useOrchestflowGenerationEditorStore } from './generation-editor.store'

function buildStageConfig(stageKey: GenerationRuntimeStageKey): GenerationStageConfig {
  return {
    stageKey,
    providerId: null,
    modelId: null,
    sdkVendor: null,
    memoryRounds: 6,
    copilotMemoryRounds: 4,
    autoApproved: false
  }
}

function buildDocument(documentKey: GenerationRuntimeStageKey): GenerationDocument {
  return {
    documentKey,
    title: `${documentKey}-title`,
    fileName: `${documentKey}.md`,
    summary: '',
    content: ''
  }
}

function buildSessionSummary(
  id: string,
  currentStage: GenerationRuntimeStageKey = 'analysis'
): GenerationSessionSummary {
  return {
    id,
    title: `session-${id}`,
    currentStage,
    summary: `summary-${id}`,
    analysisTurnCount: 0,
    planGenerated: false,
    createdAt: '2026-03-12T00:00:00.000Z',
    updatedAt: '2026-03-12T00:00:00.000Z'
  }
}

function buildSessionDetail(
  id: string,
  currentStage: GenerationRuntimeStageKey = 'analysis'
): GenerationSessionDetail {
  return {
    ...buildSessionSummary(id, currentStage),
    stageConfigs: [
      buildStageConfig('analysis'),
      buildStageConfig('design'),
      buildStageConfig('verify')
    ],
    documents: [buildDocument('analysis'), buildDocument('design'), buildDocument('verify')],
    messages: []
  }
}

describe('generation-editor.store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('creates a default session when initialize finds no sessions', async () => {
    const created = buildSessionDetail('created-session')
    listSessionsMock.mockResolvedValue([])
    createSessionMock.mockResolvedValue(created)

    const store = useOrchestflowGenerationEditorStore()
    await store.initialize()

    expect(createSessionMock).toHaveBeenCalledWith({ title: '新建生成会话' })
    expect(store.viewStatus).toBe('ready')
    expect(store.currentSession?.id).toBe('created-session')
    expect(store.selectedSessionId).toBe('created-session')
    expect(store.resolvedSessionId).toBe('created-session')
  })

  it('keeps the current session when switching target detail fails', async () => {
    const sessionA = buildSessionSummary('session-a')
    const sessionB = buildSessionSummary('session-b', 'design')
    const detailA = buildSessionDetail('session-a')

    listSessionsMock.mockResolvedValue([sessionA, sessionB])
    getSessionDetailMock.mockImplementation(async (sessionId) => {
      if (sessionId === 'session-a') return detailA
      throw new Error('Session not found: session-b')
    })

    const store = useOrchestflowGenerationEditorStore()
    await store.initialize()
    await store.selectSession('session-b')

    expect(store.currentSession?.id).toBe('session-a')
    expect(store.selectedSessionId).toBe('session-a')
    expect(store.resolvedSessionId).toBe('session-a')
    expect(store.viewStatus).toBe('ready')
    expect(store.lastErrorMessage).toContain('session-b')
  })

  it('creates a replacement session after deleting the last session', async () => {
    const onlySession = buildSessionSummary('only-session')
    const onlyDetail = buildSessionDetail('only-session')
    const replacement = buildSessionDetail('replacement-session')

    listSessionsMock.mockResolvedValue([onlySession])
    getSessionDetailMock.mockResolvedValue(onlyDetail)
    createSessionMock.mockResolvedValue(replacement)
    deleteSessionMock.mockResolvedValue()

    const store = useOrchestflowGenerationEditorStore()
    await store.initialize()
    await store.deleteSession('only-session')

    expect(createSessionMock).toHaveBeenCalledWith({ title: '新建生成会话' })
    expect(store.currentSession?.id).toBe('replacement-session')
    expect(store.selectedSessionId).toBe('replacement-session')
    expect(store.viewStatus).toBe('ready')
  })
})
