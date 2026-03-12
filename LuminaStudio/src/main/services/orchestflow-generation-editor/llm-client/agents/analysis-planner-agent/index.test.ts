import { describe, expect, it, vi } from 'vitest'

vi.mock(
  '@main/services/logger',
  () => ({
    logger: {
      scope: () => ({
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
      })
    }
  }),
  { virtual: true }
)

vi.mock(
  '@shared/Orchestraflow-types',
  () => ({
    buildOFRequirementContextPack: vi.fn(() => ({})),
    renderOFAgentContextPack: vi.fn(() => ''),
    OFRequirementDocument: {}
  }),
  { virtual: true }
)

import { buildPlanningProgressState } from './index'

describe('analysis-planner-agent progress gating', () => {
  it('does not show planning block for continue payloads', () => {
    const progress = buildPlanningProgressState(`
mode: continue
trigger: auto
planningStatus: draft
---
# 需求分析
## 摘要
- 继续补充信息

# 设计交接
## 候选节点
- 暂无
`)

    expect(progress.shouldShowPlanningBlock).toBe(false)
  })

  it('shows planning block for planning payloads', () => {
    const progress = buildPlanningProgressState(`
mode: planning
trigger: explicit
planningStatus: ready
---
# 需求分析
## 摘要
- 已经可以开始规划

# 设计交接
## 候选节点
- start：接收输入
    `)

    expect(progress.shouldShowPlanningBlock).toBe(true)
    expect(progress.activeSection).toBeTruthy()
  })

  it('keeps root markdown body when planning payload contains full sections', () => {
    const progress = buildPlanningProgressState(`
mode: planning
trigger: auto
planningStatus: draft
---
# 需求分析
## 摘要
- 用户希望获得一个尽可能详细的工作流规划方案。

## 目标
- 产出一份结构完整的 handoff。

# 设计交接
## 候选节点
- start：接收输入
`)

    expect(progress.analysisMarkdown).toContain('## 摘要')
    expect(progress.analysisMarkdown).toContain('工作流规划方案')
    expect(progress.designMarkdown).toContain('## 候选节点')
  })
})
