import { describe, expect, it, vi } from 'vitest'
import type { GenerationDesignDocument } from '@preload/types'
import type { GenerationEditorRepository } from '../../../repositories/generation-editor.repository'
import { buildDesignBlueprintContextBundle } from './context-builder'
import { buildDesignBlueprintPromptMessages } from './prompt'

function buildDesignDocument(): GenerationDesignDocument {
  return {
    id: 'design-1',
    sessionId: 'session-1',
    planningDocumentId: 'planning-1',
    planningSourceMessageId: 'message-1',
    title: '规划设计 V1',
    version: 1,
    status: 'invalid',
    sourceSnapshotMarkdown: `# 需求分析
## 摘要
- 旧摘要
## 摘要
- 保留最新摘要
## 目标
- 生成最终答复

# 设计交接
## 节点声明
- llm：生成正文
- end：收口输出
## 蓝图要求
- 输出最终结果
#1 [assistant]
status: final
OFT/1
[node.end]
outputs = [{"variable":"legacy_result","schema":{"type":"string"},"source":{"mode":"ref","ref":"@writer.answer"}}]
## DSL 语法与格式
inputs = [{"variable":"legacy_query","schema":{"type":"string"}}]`,
    contentFormat: 'of-blueprint-section-v1',
    content: `OFT/1
[workflow]
name = "legacy"

[node.start]
type = "start"
inputs = [{"variable":"legacy_query","schema":{"type":"string"}}]

[node.end]
type = "end"
outputs = [{"variable":"legacy_result","schema":{"type":"string"},"source":{"mode":"ref","ref":"@start.legacy_query"}}]

# 历史 assistant 片段
vars = ["x:type=string"]
result <- @writer.answer`,
    summary: '规划设计稿 DSL 存在 2 条校验错误。',
    diagnosticsJson: JSON.stringify([
      {
        code: 'missing-workflow-name',
        message: 'workflow.name 必须是非空字符串。',
        path: 'workflow.name',
        line: 2,
        column: 1,
        endLine: 2,
        endColumn: 10,
        severity: 'error'
      },
      {
        code: 'invalid-edge-spec',
        message: '无法解析 edge 语句。',
        path: 'edges[0]',
        line: 12,
        column: 1,
        endLine: 12,
        endColumn: 20,
        severity: 'error'
      }
    ]),
    latestGenerationMessageId: null,
    derivedTargetType: null,
    derivedTargetId: null,
    derivedStatus: 'compile-failed',
    createdAt: '2026-03-14T00:00:00.000Z',
    updatedAt: '2026-03-14T00:00:00.000Z'
  }
}

describe('design-blueprint-agent context builder', () => {
  it('sanitizes snapshot summary and does not read design-copilot history', () => {
    const repository = {
      getDesignDocumentById: vi.fn().mockReturnValue(buildDesignDocument()),
      listMessages: vi.fn()
    } as unknown as GenerationEditorRepository

    const context = buildDesignBlueprintContextBundle({
      repository,
      designDocumentId: 'design-1'
    })

    expect(repository.listMessages).not.toHaveBeenCalled()
    expect(context.planningSnapshotSummaryText).toContain('保留最新摘要')
    expect(context.planningSnapshotSummaryText).toContain('## 节点声明')
    expect(context.planningSnapshotSummaryText).toContain('- llm：生成正文')
    expect(context.planningSnapshotSummaryText).not.toContain('旧摘要')
    expect(context.planningSnapshotSummaryText).not.toContain('#1 [assistant]')
    expect(context.planningSnapshotSummaryText).not.toContain('OFT/1')
    expect(context.planningSnapshotSummaryText).not.toContain('outputs =')
    expect(context.planningSnapshotSummaryText).not.toContain('## DSL 语法与格式')

    expect(context.designDocumentStateSummaryText).toContain('- status: invalid')
    expect(context.designDocumentStateSummaryText).toContain('- contentFormat: of-blueprint-section-v1')
    expect(context.designDocumentStateSummaryText).toContain('- lastCompilePassed: no')
    expect(context.designDocumentStateSummaryText).toContain('missing-workflow-name')
    expect(context.designDocumentStateSummaryText).not.toContain('vars = ["x:type=string"]')

    expect(context.canonicalPromptSourceText).toContain('## 声明节点 Spec')
    expect(context.canonicalPromptSourceText).toContain('## DSL 语法与格式')
    expect(context.canonicalPromptSourceText).not.toContain('[input.')
    expect(context.canonicalPromptSourceText).not.toContain('<- @')
    expect(context.canonicalPromptSourceText).not.toContain('name:type=value')
    expect(context.canonicalPromptSourceText).not.toContain('item_schema')
    expect(context.canonicalPromptSourceText).not.toContain('value_selector')
    expect(context.canonicalPromptSourceText).not.toContain('value_ref')
  })

  it('builds prompt messages with only summary inputs and canonical contract', () => {
    const repository = {
      getDesignDocumentById: vi.fn().mockReturnValue(buildDesignDocument()),
      listMessages: vi.fn()
    } as unknown as GenerationEditorRepository
    const context = buildDesignBlueprintContextBundle({
      repository,
      designDocumentId: 'design-1'
    })

    const messages = buildDesignBlueprintPromptMessages({
      designDocumentId: 'design-1',
      generationMode: 'regenerate',
      context,
      userMessage: '请改成批处理版本。'
    })

    expect(messages).toHaveLength(2)
    expect(messages[0].content).toContain('不要回显历史 prompt、历史 assistant DSL、历史错误示例。')
    expect(messages[1].content).toContain('## Canonical Authoring Contract')
    expect(messages[1].content).toContain('## 当前需求分析规划稿摘要')
    expect(messages[1].content).toContain('## 当前版本状态摘要')
    expect(messages[1].content).toContain('## 当前用户输入')
    expect(messages[1].content).not.toContain('## 当前版本已有 DSL 正文')
    expect(messages[1].content).not.toContain('## 当前版本 design copilot 最近对话')
    expect(messages[1].content).not.toContain('[input.')
    expect(messages[1].content).not.toContain('<- @')
    expect(messages[1].content).not.toContain('name:type=value')
    expect(messages[1].content).not.toContain('item_schema')
    expect(messages[1].content).not.toContain('value_selector')
    expect(messages[1].content).not.toContain('value_ref')
    expect(messages[1].content).not.toContain('vars = ["x:type=string"]')
  })
})
