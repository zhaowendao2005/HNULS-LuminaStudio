import { ref } from 'vue'
import { defineStore } from 'pinia'
import { WorkspaceCreateSessionDataSourceMock } from './workspace-create-session.datasource.mock'

export const useGenerationWorkspaceCreateSessionStore = defineStore(
  'of-generation-workspace-create-session',
  () => {
    const defaults = WorkspaceCreateSessionDataSourceMock.createDefaults()
    const showCreateSessionModal = ref(defaults.showCreateSessionModal)
    const newSessionName = ref(defaults.newSessionName)

    return {
      showCreateSessionModal,
      newSessionName
    }
  }
)
