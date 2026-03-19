/**
 * NormalChat 会话壳层类型
 * 说明：
 * - 这里存放聊天展示、输入框、工具栏等中间区状态
 * - 当前为 UI 复刻状态，后续可替换真实数据源
 */
export type ConversationRole = 'user' | 'assistant'

export type ConversationActionIcon =
  | 'copy'
  | 'retry'
  | 'mention'
  | 'translate'
  | 'edit'
  | 'delete'
  | 'menu'

export interface ConversationActionItem {
  id: string
  icon: ConversationActionIcon
}

export interface ConversationMessage {
  id: string
  role: ConversationRole
  author: string
  time: string
  text: string
  tokens: number
  modelLabel?: string
  errorNotice?: string
  actions: ConversationActionItem[]
}

export type ComposerToolIcon =
  | 'plus-square'
  | 'paperclip'
  | 'globe'
  | 'file-text'
  | 'hammer'
  | 'at-sign'
  | 'zap'
  | 'panel-top'
  | 'maximize'
  | 'eraser'
  | 'clock'
  | 'languages'

export interface ComposerToolItem {
  id: string
  icon: ComposerToolIcon
  side: 'left' | 'right'
}

export interface ConversationShellSnapshot {
  headerText: string
  textareaPlaceholder: string
  composerText: string
  messages: ConversationMessage[]
  tools: ComposerToolItem[]
}
