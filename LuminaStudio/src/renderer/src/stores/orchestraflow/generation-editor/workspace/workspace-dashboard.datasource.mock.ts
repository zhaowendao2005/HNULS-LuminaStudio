import type { DashboardStageCard } from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/GenerateView/generate-view.types'

export const WorkspaceDashboardDataSourceMock = {
  /** WORKFLOW_TEMPLATE_BUSINESS_ONLY: 早期工作流模板探索残留。当前 agent 路线只保留 analysis / design / verify 三阶段统计。 */
  buildStageCards(counts: {
    analysis: number
    design: number
    verify: number
  }): DashboardStageCard[] {
    return [
      {
        stage: 'analysis',
        label: '未完成需求分析',
        count: counts.analysis,
        color: 'bg-cyan-500'
      },
      {
        stage: 'design',
        label: '未完成设计',
        count: counts.design,
        color: 'bg-emerald-500'
      },
      {
        stage: 'verify',
        label: '未完成校验',
        count: counts.verify,
        color: 'bg-violet-500'
      }
    ]
  }
}
