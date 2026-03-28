import type { NormalChatActionDescriptor } from '../../shared/action.types'

export const getActionSpecActionDescriptor: NormalChatActionDescriptor = {
  key: 'system.get_action_spec',
  kind: 'system',
  title: 'Get Action Spec',
  description:
    '当某个 slow mode action 只暴露了功能简介，但当前轮确实要调用它时，先用这个 system action 拉取该 action 的完整 schema 和强约束 prompt。',
  defaultMode: 'fast'
}
