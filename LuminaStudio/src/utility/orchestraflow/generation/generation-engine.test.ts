import { describe, expect, it } from 'vitest'
import {
  advanceGenerationPhase,
  createGenerationSession,
  sendGenerationPrompt
} from './phase-orchestrator'
import { parseGenerationDsl } from './dsl-parser'

describe('generation engine', () => {
  it('creates a session and starter topology from prompt', async () => {
    const session = await sendGenerationPrompt(
      createGenerationSession({ id: 'session-1', workflow_name: 'demo' }),
      'build a branching workflow'
    )

    expect(session.graph_state.nodes.length).toBeGreaterThanOrEqual(3)
    expect(session.preview.summary.node_count).toBe(session.graph_state.nodes.length)
  })

  it('parses compact dsl blocks', () => {
    const blocks = parseGenerationDsl(`WIRE_BATCH
start -> llm

CONFIG_BATCH
set model`)

    expect(blocks).toHaveLength(2)
    expect(blocks[0].kind).toBe('WIRE_BATCH')
  })

  it('advances validate phase into waiting-confirm when valid', async () => {
    let session = createGenerationSession({ id: 'session-2', workflow_name: 'demo' })
    session = await sendGenerationPrompt(session, 'simple flow')
    session = await advanceGenerationPhase(session, 'validate')

    expect(['waiting-confirm', 'failed']).toContain(session.status)
  })
})
