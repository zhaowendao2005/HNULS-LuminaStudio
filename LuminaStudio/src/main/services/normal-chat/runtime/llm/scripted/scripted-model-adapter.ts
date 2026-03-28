import type { NormalChatModelAdapter, NormalChatScriptRoundInput } from '../model-adapter.interface'
import { routeScriptedScenario } from './scenario-router'

// WARNING: scripted flow only for runtime chain verification.
// TODO(remove-scripted-normal-chat-v1): 接入真实模型后移除这里的固定脚本场景。
export class NormalChatScriptedModelAdapter implements NormalChatModelAdapter {
  async invokeRound(input: NormalChatScriptRoundInput): Promise<unknown> {
    return routeScriptedScenario(input)
  }
}
