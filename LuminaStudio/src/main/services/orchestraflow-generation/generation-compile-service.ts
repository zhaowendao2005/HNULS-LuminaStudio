import type { OFGenerationSession } from '@shared/Orchestraflow-types'
import { compileGenerationSessionToWorkflow } from '@utility/orchestraflow/generation/compile-session-to-workflow'
import { OrchestraflowWorkflowService } from '@main/services/orchestraflow/orchestraflow-workflow-service'
import { logger } from '@main/services/logger'

const log = logger.scope('OFGenerationCompileService')

export class GenerationCompileService {
  constructor(private readonly workflowService: OrchestraflowWorkflowService) {}

  async confirmGenerationSession(
    session: OFGenerationSession
  ): Promise<{ session: OFGenerationSession; workflowId: string }> {
    if (!session.validation.ok) {
      throw new Error('Generation session validation must pass before confirm.')
    }
    const workflow = compileGenerationSessionToWorkflow(session)
    let saved = session.compiled_workflow_id
      ? await this.workflowService.update(session.compiled_workflow_id, workflow)
      : null

    if (!saved) {
      const created = await this.workflowService.create({
        name: workflow.name,
        description: workflow.description,
        author: workflow.author
      })
      saved = await this.workflowService.update(created.id, workflow)
    }

    if (!saved) {
      throw new Error('Failed to persist compiled workflow.')
    }

    log.info('Generation session compiled', { sessionId: session.id, workflowId: saved.id })
    return {
      session: {
        ...session,
        status: 'confirmed',
        compiled_workflow_id: saved.id,
        updated_at: Math.floor(Date.now() / 1000)
      },
      workflowId: saved.id
    }
  }
}
