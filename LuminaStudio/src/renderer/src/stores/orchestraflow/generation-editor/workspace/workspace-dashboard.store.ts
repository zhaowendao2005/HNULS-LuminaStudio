import { computed } from 'vue'
import { defineStore } from 'pinia'
import { storeToRefs } from 'pinia'
import { WorkspaceDashboardDataSourceMock } from './workspace-dashboard.datasource.mock'
import { useGenerationSessionListStore } from '../sessions/session-list.store'

export const useGenerationWorkspaceDashboardStore = defineStore(
  'of-generation-workspace-dashboard',
  () => {
    const sessionListStore = useGenerationSessionListStore()
    const { sessions, selectedSessionSummary } = storeToRefs(sessionListStore)

    const dashboardStageCards = computed(() => {
      return WorkspaceDashboardDataSourceMock.buildStageCards({
        analysis: sessions.value.filter((item) => item.currentStage === 'analysis').length,
        design: sessions.value.filter((item) => item.currentStage === 'design').length,
        verify: sessions.value.filter((item) => item.currentStage === 'verify').length,
        workflow: sessions.value.filter((item) => item.currentStage === 'workflow').length
      })
    })

    const plannedSessionsCount = computed(() => {
      return sessions.value.filter((item) => item.planGenerated).length
    })

    const currentSessionStageLabel = computed(() => {
      const current = selectedSessionSummary.value
      if (!current) return '未完成需求分析'
      if (current.currentStage === 'analysis') return '未完成需求分析'
      if (current.currentStage === 'design') return '未完成设计'
      if (current.currentStage === 'verify') return '未完成校验'
      return '未生成工作流'
    })

    return {
      dashboardStageCards,
      plannedSessionsCount,
      currentSessionStageLabel
    }
  }
)
