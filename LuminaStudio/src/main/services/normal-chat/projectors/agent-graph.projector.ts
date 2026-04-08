import type { NormalChatAgentGraphSnapshot, NormalChatRequestDetailSnapshot } from '@preload/types'

/**
 * AgentGraphProjector
 *
 * 当前先在 main 侧生成最小可用的 agent 图结构，避免再反向依赖 renderer 的 runtime-trace 工具。
 * 后续如果要接 canvas / drawer，可以在这里继续扩充 planHistory、helperInvocations、timeline。
 */
export class AgentGraphProjector {
  project(input: NormalChatRequestDetailSnapshot): NormalChatAgentGraphSnapshot {
    if (input.agentRuns.length === 0) {
      return { tree: null, summary: null }
    }

    const agents = Object.fromEntries(
      input.agentRuns.map((run) => [
        run.id,
        {
          agentId: run.id,
          depth: run.depth,
          roleKind: run.roleKind,
          taskKind: run.templateId,
          goal: run.goal,
          summary: run.finalText ?? run.goal,
          finalResult: run.finalText,
          status: run.status === 'succeeded' ? 'completed' : run.status,
          retryCount: Math.max(0, run.reactCount - 1),
          errorMessage: run.errorMessage,
          childAgentIds: input.agentRuns
            .filter((candidate) => candidate.parentAgentRunId === run.id)
            .map((candidate) => candidate.id),
          planHistory: [],
          helperInvocations: []
        }
      ])
    )

    const rootAgent =
      input.agentRuns.find((run) => run.parentAgentRunId === null) ?? input.agentRuns[0]
    const tree = {
      requestId: input.requestId,
      rootAgentId: rootAgent?.id ?? '',
      fallbackTriggered: Boolean(input.head?.status === 'failed'),
      agents
    }

    const values = Object.values(tree.agents)
    return {
      tree,
      summary: {
        requestId: input.requestId,
        totalAgents: values.length,
        runningAgents: values.filter((agent) => agent.status === 'running').length,
        failedAgents: values.filter((agent) => agent.status === 'failed').length,
        completedAgents: values.filter((agent) => agent.status === 'completed').length,
        maxDepth: values.reduce((maxDepth, agent) => Math.max(maxDepth, agent.depth), 0),
        fallbackTriggered: tree.fallbackTriggered
      }
    }
  }
}
