export class EphemeralGenerationMemory {
  private readonly memoryBySession = new Map<string, string[]>()

  read(sessionId: string, limit: number): string[] {
    return (this.memoryBySession.get(sessionId) || []).slice(-limit)
  }

  push(sessionId: string, entry: string): void {
    const current = this.memoryBySession.get(sessionId) || []
    current.push(entry)
    this.memoryBySession.set(sessionId, current.slice(-20))
  }
}
