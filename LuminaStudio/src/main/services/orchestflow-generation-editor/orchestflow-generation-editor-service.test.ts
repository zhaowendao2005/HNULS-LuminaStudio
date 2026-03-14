import { beforeEach, describe, expect, it, vi } from 'vitest'
import type Database from 'better-sqlite3'
import type { GenerationDesignDocument } from '@preload/types'
import type { DatabaseManager } from '../database-sqlite'
import type { ModelConfigService } from '../model-config'
import { OrchestflowGenerationEditorService } from './orchestflow-generation-editor-service'
import { orchestraflowWorkflowService } from '../orchestraflow/orchestraflow-workflow-service'

vi.mock('../logger', () => ({
  logger: {
    scope: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    })
  }
}))

vi.mock('../orchestraflow/orchestraflow-workflow-service', () => ({
  orchestraflowWorkflowService: {
    createFromWorkflow: vi.fn()
  }
}))

const VALID_DSL = `OFT/1
[workflow]
name = "section-demo"
author = "tester"

[node.start]
type = "start"
inputs = [{"variable":"user_query","schema":{"type":"string","default":"hello"}}]

[node.llm_main]
type = "llm"
model = "openai/gpt-4.1-mini"
prompt = """
请总结输入。
"""
struct = "answer:string"

[node.end]
type = "end"
outputs = [{"variable":"result","schema":{"type":"string"},"source":{"mode":"ref","ref":"@llm_main.structured_output.answer"}}]

[graph]
edges = ["start.source -> llm_main.target", "llm_main.source -> end.target"]`

function buildDesignDocument(content: string): GenerationDesignDocument {
  return {
    id: 'design-1',
    sessionId: 'session-1',
    planningDocumentId: 'planning-1',
    planningSourceMessageId: 'message-1',
    title: '规划设计 V1',
    version: 1,
    status: 'valid',
    sourceSnapshotMarkdown: '# snapshot',
    contentFormat: 'of-blueprint-section-v1',
    content,
    summary: '规划设计稿 DSL 已通过解析与编译校验。',
    diagnosticsJson: null,
    latestGenerationMessageId: null,
    derivedTargetType: null,
    derivedTargetId: null,
    derivedStatus: null,
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z'
  }
}

function createService(): OrchestflowGenerationEditorService {
  const databaseManagerStub: Pick<DatabaseManager, 'getDatabase'> = {
    getDatabase: () => ({}) as unknown as Database.Database
  }

  return new OrchestflowGenerationEditorService(
    databaseManagerStub as DatabaseManager,
    {} as ModelConfigService
  )
}

describe('OrchestflowGenerationEditorService.compileDesignDocumentToWorkflow', () => {
  const createFromWorkflowMock = vi.mocked(orchestraflowWorkflowService.createFromWorkflow)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new workflow from valid DSL and persists derived target info', async () => {
    const service = createService()
    const designDocument = buildDesignDocument(VALID_DSL)
    const savedDesignDocument: GenerationDesignDocument = {
      ...designDocument,
      derivedTargetType: 'workflow',
      derivedTargetId: 'workflow-compiled-1',
      derivedStatus: 'compiled'
    }
    const repositoryMock = {
      getDesignDocumentById: vi.fn().mockReturnValue(designDocument),
      saveDesignDocument: vi.fn().mockReturnValue(savedDesignDocument)
    }
    Object.defineProperty(service, 'repository', {
      value: repositoryMock,
      configurable: true
    })
    createFromWorkflowMock.mockResolvedValue({
      id: 'workflow-compiled-1',
      name: 'section-demo',
      description: undefined,
      author: 'tester',
      createdAt: 1,
      updatedAt: 1,
      status: 'draft',
      graph: { nodes: [], edges: [] }
    })

    const result = await service.compileDesignDocumentToWorkflow({
      sessionId: 'session-1',
      designDocumentId: 'design-1'
    })

    expect(createFromWorkflowMock).toHaveBeenCalledTimes(1)
    expect(repositoryMock.saveDesignDocument).toHaveBeenCalledWith({
      sessionId: 'session-1',
      document: expect.objectContaining({
        id: 'design-1',
        derivedTargetType: 'workflow',
        derivedTargetId: 'workflow-compiled-1',
        derivedStatus: 'compiled',
        status: 'valid'
      })
    })
    expect(result).toEqual({
      designDocument: savedDesignDocument,
      workflowId: 'workflow-compiled-1'
    })
  })

  it('throws and does not persist workflow when DSL is invalid', async () => {
    const service = createService()
    const repositoryMock = {
      getDesignDocumentById: vi.fn().mockReturnValue(buildDesignDocument('OFT/1\n[workflow]\n')),
      saveDesignDocument: vi.fn()
    }
    Object.defineProperty(service, 'repository', {
      value: repositoryMock,
      configurable: true
    })

    await expect(
      service.compileDesignDocumentToWorkflow({
        sessionId: 'session-1',
        designDocumentId: 'design-1'
      })
    ).rejects.toThrow(/未通过编译校验/)

    expect(createFromWorkflowMock).not.toHaveBeenCalled()
    expect(repositoryMock.saveDesignDocument).not.toHaveBeenCalled()
  })
})
