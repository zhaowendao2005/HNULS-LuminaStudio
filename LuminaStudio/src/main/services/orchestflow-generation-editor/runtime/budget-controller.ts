export class GenerationBudgetController {
  private spentTokens = 0

  constructor(private readonly maxIterations: number) {}

  add(tokens: number): number {
    this.spentTokens += Math.max(0, tokens)
    return this.spentTokens
  }

  getSpentTokens(): number {
    return this.spentTokens
  }

  getMaxIterations(): number {
    return this.maxIterations
  }
}
