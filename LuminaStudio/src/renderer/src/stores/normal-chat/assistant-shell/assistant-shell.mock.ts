/**
 * @deprecated Unused legacy shell mock. Kept only until the assistant-shell directory is deleted.
 */
import type { AssistantShellSnapshot } from './assistant-shell.types'

/**
 * 助手壳层 mock 数据
 * 说明：保持与你给的 React 片段一致，先把可见态完整复刻出来。
 */
export const assistantShellMock: AssistantShellSnapshot = {
  assistant: {
    id: 'default-assistant',
    name: '默认助手',
    emoji: '🤪'
  },
  modelMeta: {
    label: 'Qwen/Qwen3-Coder-30B-Instruct | 硅基流动'
  },
  systemPromptPreview: '你好，我是默认助手。你可以立刻开始跟我聊天',
  settingsOpened: false,
  activeSettingsTab: 'prompt',
  editableAssistantName: '默认助手',
  editablePromptText: '',
  settingsNavItems: [
    { id: 'model', label: '模型设置' },
    { id: 'prompt', label: '提示词设置' },
    { id: 'kb', label: '知识库设置' },
    { id: 'mcp', label: 'MCP 服务器' },
    { id: 'phrases', label: '常用短语' },
    { id: 'memory', label: '全局记忆' }
  ]
}
