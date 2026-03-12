import type { DashboardStageCard } from '@renderer/views/LuminaApp/Maincontent/OrchestraFlowView/GenerateView/generate-view.types'

export const WorkspaceDashboardDataSourceMock = {
  buildStageCards(counts: {
    analysis: number
    design: number
    verify: number
    workflow: number
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
      },
      {
        stage: 'workflow',
        label: '未生成工作流',
        count: counts.workflow,
        color: 'bg-amber-500'
      }
    ]
  }
}
