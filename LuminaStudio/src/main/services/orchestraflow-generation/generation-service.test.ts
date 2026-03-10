import { describe, expect, it } from 'vitest'
import { GenerationSessionRepository } from './generation-session-repository'

describe('generation repository', () => {
  it('constructs repository', () => {
    const repo = new GenerationSessionRepository()
    expect(repo).toBeTruthy()
  })
})
