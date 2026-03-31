/**
 * @deprecated Unused legacy shell datasource. This directory is not wired into the current normal-chat renderer flow.
 */
import type { AssistantShellSnapshot } from './assistant-shell.types'

function createDefaultSnapshot(): AssistantShellSnapshot {
  return {
    assistant: {
      id: '',
      name: 'Assistant',
      emoji: 'AI'
    },
    modelMeta: {
      label: 'No model selected'
    },
    systemPromptPreview: '',
    settingsOpened: false,
    activeSettingsTab: 'model',
    editableAssistantName: '',
    editablePromptText: '',
    settingsNavItems: [
      { id: 'model', label: 'Model' },
      { id: 'prompt', label: 'Prompt' },
      { id: 'kb', label: 'KB' },
      { id: 'mcp', label: 'MCP' },
      { id: 'phrases', label: 'Phrases' },
      { id: 'memory', label: 'Memory' }
    ]
  }
}

export class AssistantShellDatasource {
  async loadSnapshot(): Promise<AssistantShellSnapshot> {
    return createDefaultSnapshot()
  }

  async saveSnapshot(_snapshot: AssistantShellSnapshot): Promise<void> {
    // Reserved for future persistence.
  }
}
