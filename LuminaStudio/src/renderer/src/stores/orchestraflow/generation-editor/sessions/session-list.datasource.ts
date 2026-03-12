import { OrchestflowGenerationEditorDataSource } from '../generation-editor.datasource'

export const SessionListDataSource = {
  listSessions: OrchestflowGenerationEditorDataSource.listSessions,
  createSession: OrchestflowGenerationEditorDataSource.createSession,
  deleteSession(sessionId: string) {
    return OrchestflowGenerationEditorDataSource.deleteSession({ sessionId })
  }
}
