/**
 * 这里先放一个占位 agent。
 *
 * 当前 Generate Editor 仍然直接走最小的聊天流式调用，
 * 暂时还没有把 analysis / design / verify 拆成真正独立的 agent。
 * 这个文件的作用是先把目录骨架固定下来，后面新增真实 agent 时可以直接落到这里。
 */
export const placeholderGenerationAgent = {
  id: 'placeholder-generation-agent',
  label: 'Placeholder Generation Agent',
  description: '用于占位的 Generate Editor agent，当前不承载真实业务逻辑。'
} as const
