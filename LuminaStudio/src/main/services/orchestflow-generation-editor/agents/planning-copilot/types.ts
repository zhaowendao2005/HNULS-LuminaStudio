export interface PlanningCopilotContext {
  analysisDocument: string
  userText: string
  memoryWindow: string[]
}

export interface PlanningCopilotResult {
  patchToml: string
  prompt: string
  context: string
}
