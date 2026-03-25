import type {
  NormalChatAgentDecisionRecord,
  NormalChatAgentHelperInvocationRecord,
  NormalChatAgentNode,
  NormalChatAgentStatus,
  NormalChatAgentStatusSummary,
  NormalChatAgentToolSelection,
  NormalChatAgentTree,
  NormalChatConversationPromptMessage
} from '@preload/types'

interface CreateAgentNodeInput {
  agentId: string
  parentAgentId: string | null
  depth: number
  roleKind: NormalChatAgentNode['roleKind']
  taskKind: NormalChatAgentNode['taskKind']
  goal: string
  summary: string
  callMode: NormalChatAgentNode['callMode']
  costMode: NormalChatAgentNode['costMode']
  retryCount: number
  conversationWindow: NormalChatConversationPromptMessage[]
}

interface UpdateAgentPatch {
  retryCount?: number
  summary?: string
  status?: NormalChatAgentStatus
  finalResult?: string | null
  errorMessage?: string | null
  conversationWindow?: NormalChatConversationPromptMessage[]
}

export class NormalChatAgentTreeStore {
  private readonly tree: NormalChatAgentTree

  constructor(
    requestId: string,
    maxRecursionDepth: number,
    private readonly onChange?: (
      tree: NormalChatAgentTree,
      summary: NormalChatAgentStatusSummary
    ) => void
  ) {
    this.tree = {
      requestId,
      rootAgentId: '',
      maxRecursionDepth,
      fallbackTriggered: false,
      agents: {}
    }
  }

  createAgent(input: CreateAgentNodeInput): void {
    const now = new Date().toISOString()
    this.tree.agents[input.agentId] = {
      agentId: input.agentId,
      parentAgentId: input.parentAgentId,
      depth: input.depth,
      roleKind: input.roleKind,
      taskKind: input.taskKind,
      goal: input.goal,
      summary: input.summary,
      callMode: input.callMode,
      costMode: input.costMode,
      retryCount: input.retryCount,
      status: 'running',
      conversationWindow: input.conversationWindow,
      selectedHelpers: [],
      planHistory: [],
      helperInvocations: [],
      childAgentIds: [],
      finalResult: null,
      errorMessage: null,
      startedAt: now,
      updatedAt: now,
      completedAt: null
    }

    if (!input.parentAgentId) {
      this.tree.rootAgentId = input.agentId
    } else {
      this.tree.agents[input.parentAgentId]?.childAgentIds.push(input.agentId)
    }

    this.emitChange()
  }

  updateAgent(agentId: string, patch: UpdateAgentPatch): void {
    const agent = this.tree.agents[agentId]
    if (!agent) {
      return
    }

    Object.assign(agent, patch, {
      updatedAt: new Date().toISOString()
    })

    this.emitChange()
  }

  setSelectedHelpers(agentId: string, selectedHelpers: NormalChatAgentToolSelection[]): void {
    const agent = this.tree.agents[agentId]
    if (!agent) {
      return
    }

    const mergedHelpers = [...agent.selectedHelpers]
    selectedHelpers.forEach((nextHelper) => {
      const existingIndex = mergedHelpers.findIndex((item) => item.helperId === nextHelper.helperId)
      if (existingIndex >= 0) {
        mergedHelpers[existingIndex] = nextHelper
        return
      }
      mergedHelpers.push(nextHelper)
    })
    agent.selectedHelpers = mergedHelpers
    agent.updatedAt = new Date().toISOString()
    this.emitChange()
  }

  recordDecision(agentId: string, record: NormalChatAgentDecisionRecord): void {
    const agent = this.tree.agents[agentId]
    if (!agent) {
      return
    }

    agent.planHistory.push(record)
    agent.updatedAt = new Date().toISOString()
    this.emitChange()
  }

  startHelperInvocation(agentId: string, record: NormalChatAgentHelperInvocationRecord): void {
    const agent = this.tree.agents[agentId]
    if (!agent) {
      return
    }

    agent.helperInvocations.push(record)
    agent.updatedAt = new Date().toISOString()
    this.emitChange()
  }

  finishHelperInvocation(
    agentId: string,
    callId: string,
    patch: Partial<NormalChatAgentHelperInvocationRecord>
  ): void {
    const agent = this.tree.agents[agentId]
    if (!agent) {
      return
    }

    const target = agent.helperInvocations.find((item) => item.callId === callId)
    if (!target) {
      return
    }

    Object.assign(target, patch)
    agent.updatedAt = new Date().toISOString()
    this.emitChange()
  }

  markFallback(): void {
    this.tree.fallbackTriggered = true
    this.emitChange()
  }

  finalizeAgent(
    agentId: string,
    status: NormalChatAgentStatus,
    finalResult: string | null,
    errorMessage: string | null
  ): void {
    const agent = this.tree.agents[agentId]
    if (!agent) {
      return
    }

    const now = new Date().toISOString()
    agent.status = status
    agent.finalResult = finalResult
    agent.errorMessage = errorMessage
    agent.updatedAt = now
    agent.completedAt = now
    this.emitChange()
  }

  getSnapshot(): NormalChatAgentTree {
    return JSON.parse(JSON.stringify(this.tree)) as NormalChatAgentTree
  }

  getSummary(): NormalChatAgentStatusSummary {
    const agents = Object.values(this.tree.agents)
    return {
      requestId: this.tree.requestId,
      totalAgents: agents.length,
      runningAgents: agents.filter((agent) => agent.status === 'running').length,
      failedAgents: agents.filter((agent) => agent.status === 'failed').length,
      completedAgents: agents.filter((agent) => agent.status === 'completed').length,
      maxDepth: agents.reduce((maxDepth, agent) => Math.max(maxDepth, agent.depth), 0),
      fallbackTriggered: this.tree.fallbackTriggered
    }
  }

  private emitChange(): void {
    this.onChange?.(this.getSnapshot(), this.getSummary())
  }
}
