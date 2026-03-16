export interface AnalysisPlannerContext {
  analysisDocument: string
  userText: string
  memoryWindow: string[]
  workflowSpec: string
}

export interface AnalysisPlannerResult {
  markdown: string
  prompt: string
  context: string
}
