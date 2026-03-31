/**
 * @deprecated Unused legacy shell mock. Kept only until the conversation-shell directory is deleted.
 */
import type { ConversationShellSnapshot } from './conversation-shell.types'

/**
 * 会话壳层 mock
 * 说明：按截图和片段还原可见状态，便于先把 UI 走通。
 */
export const conversationShellMock: ConversationShellSnapshot = {
  headerText:
    'prompt = "Structure and diagnosis report in strict structured format. User title: <<Extraction.user>>. Error Log Analysis: <<log_analyzer.result. Experi insights. <<expert_refinement.result>>"',
  textareaPlaceholder: '在这里输入消息，按 Enter 发送',
  composerText: '',
  messages: [
    {
      id: 'm-user-1',
      role: 'user',
      author: '用户',
      time: '03/18 17:58',
      text: 'hi',
      tokens: 1,
      actions: []
    },
    {
      id: 'm-assistant-1',
      role: 'assistant',
      author: 'gemini-3-flash-preview | Sonetto',
      time: '03/18 17:58',
      text: '分组克下模型 gemini-3-flash-preview 无可用渠道（distributor）（request id: 2026031817585563794702NGQqntSO）\n服务不可用，请稍后再试',
      tokens: 0,
      errorNotice: '详情',
      actions: [
        { id: 'a-copy-1', icon: 'copy' },
        { id: 'a-retry-1', icon: 'retry' },
        { id: 'a-mention-1', icon: 'mention' },
        { id: 'a-translate-1', icon: 'translate' },
        { id: 'a-edit-1', icon: 'edit' },
        { id: 'a-delete-1', icon: 'delete' },
        { id: 'a-menu-1', icon: 'menu' }
      ]
    },
    {
      id: 'm-user-2',
      role: 'user',
      author: '用户',
      time: '03/18 17:59',
      text: 'nih',
      tokens: 1,
      actions: []
    },
    {
      id: 'm-assistant-2',
      role: 'assistant',
      author: 'GPT-5.4 | api.yescode.cloud',
      time: '03/18 17:59',
      text: '你好，请继续提供需要修复的 DSL 诊断信息。',
      tokens: 118,
      actions: [
        { id: 'a-copy-2', icon: 'copy' },
        { id: 'a-retry-2', icon: 'retry' },
        { id: 'a-mention-2', icon: 'mention' },
        { id: 'a-translate-2', icon: 'translate' },
        { id: 'a-edit-2', icon: 'edit' },
        { id: 'a-delete-2', icon: 'delete' },
        { id: 'a-menu-2', icon: 'menu' }
      ]
    }
  ],
  tools: [
    { id: 'tool-plus-square', icon: 'plus-square', side: 'left' },
    { id: 'tool-paperclip', icon: 'paperclip', side: 'left' },
    { id: 'tool-globe', icon: 'globe', side: 'left' },
    { id: 'tool-file-text', icon: 'file-text', side: 'left' },
    { id: 'tool-hammer', icon: 'hammer', side: 'left' },
    { id: 'tool-at-sign', icon: 'at-sign', side: 'left' },
    { id: 'tool-zap', icon: 'zap', side: 'left' },
    { id: 'tool-panel-top', icon: 'panel-top', side: 'left' },
    { id: 'tool-maximize', icon: 'maximize', side: 'left' },
    { id: 'tool-eraser', icon: 'eraser', side: 'left' },
    { id: 'tool-clock', icon: 'clock', side: 'left' },
    { id: 'tool-languages', icon: 'languages', side: 'right' }
  ]
}
