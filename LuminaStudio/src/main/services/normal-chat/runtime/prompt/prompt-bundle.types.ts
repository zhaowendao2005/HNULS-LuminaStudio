export interface NormalChatPromptSystemSections {
  identity: string
  outputContract: string
  actionProtocol: string
  repairContract: string
}

export interface NormalChatPromptRoundSections {
  context: string
  latestActionTurnResults: string
  priorRoundMemory: string
  actionDescriptions: string
  loadedActionSpecs: string
  actionResults: string
  actionFeedback: string
  thinkingDigest?: string
  repairNotice?: string
}

export interface NormalChatPromptBundleV2 {
  systemSections: NormalChatPromptSystemSections
  roundSections: NormalChatPromptRoundSections
  compiledSystemPrompt: string
  compiledRoundPrompt: string
  promptDocument: string
}

export interface NormalChatPromptTrimSnapshot {
  originalCharCount: number
  trimmedCharCount: number
  trimmedSections: Array<{
    sectionKey: string
    reason: string
    beforeCharCount: number
    afterCharCount: number
  }>
}
