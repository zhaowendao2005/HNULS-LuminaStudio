import type { NormalChatActionDescriptor } from '../../shared/action.types'

export const dispatchSubAgentActionDescriptor: NormalChatActionDescriptor = {
  key: 'system.dispatch_sub_agent',
  kind: 'system',
  title: 'Dispatch Sub Agent',
  description:
    '当主 agent 需要把某个窄任务交给独立上下文专项研究时，使用这个 system action 派发一个内联 subagent。',
  defaultMode: 'fast',
  transcriptVisibility: 'hidden'
}
