import { describe, expect, it } from 'vitest'
import { getGenerationPlanningBlock } from './generation-editor.types'

describe('generation-editor.types', () => {
  it('does not expose planning block when meta mode is continue', () => {
    const block = getGenerationPlanningBlock({
      metaJson: JSON.stringify({
        vendor: 'openai',
        protocol: 'openai-response',
        agentId: 'analysis-planner-agent',
        mode: 'continue',
        planningBlock: {
          kind: 'analysis-planning',
          version: '2.0',
          agentId: 'analysis-planner-agent',
          trigger: 'auto',
          status: 'draft',
          analysisMarkdown: '# 需求分析\n## 摘要\n- 继续澄清',
          designMarkdown: '# 设计交接\n## 候选节点\n- 暂无'
        }
      })
    })

    expect(block).toBeNull()
  })

  it('exposes planning block when meta mode is planning', () => {
    const block = getGenerationPlanningBlock({
      metaJson: JSON.stringify({
        vendor: 'openai',
        protocol: 'openai-response',
        agentId: 'analysis-planner-agent',
        mode: 'planning',
        planningBlock: {
          kind: 'analysis-planning',
          version: '2.0',
          agentId: 'analysis-planner-agent',
          trigger: 'explicit',
          status: 'ready',
          analysisMarkdown: '# 需求分析\n## 摘要\n- 已可规划',
          designMarkdown: '# 设计交接\n## 候选节点\n- start：接收输入'
        }
      })
    })

    expect(block?.status).toBe('ready')
    expect(block?.trigger).toBe('explicit')
  })
})
