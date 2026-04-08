import type {
  NormalChatConversationSnapshot,
  NormalChatRequestDebugSnapshot,
  NormalChatTopicTranscriptSnapshot
} from '@preload/types'
import { NormalChatRequestEntriesRepository } from '../repositories/request-entries.repository'
import { NormalChatRequestHeadsRepository } from '../repositories/request-heads.repository'
import { TopicTranscriptProjector } from '../projectors/topic-transcript.projector'
import { RequestDetailProjector } from '../projectors/request-detail.projector'
import { AgentGraphProjector } from '../projectors/agent-graph.projector'

export class NormalChatConversationService {
  private readonly topicTranscriptProjector = new TopicTranscriptProjector()
  private readonly requestDetailProjector = new RequestDetailProjector()
  private readonly agentGraphProjector = new AgentGraphProjector()

  constructor(
    private readonly requestHeadsRepository: NormalChatRequestHeadsRepository,
    private readonly requestEntriesRepository: NormalChatRequestEntriesRepository
  ) {}

  getConversation(topicId: string): NormalChatConversationSnapshot {
    const transcript = this.getTopicTranscript(topicId)
    return {
      topicId,
      messages: transcript.messages
    }
  }

  getTopicTranscript(topicId: string): NormalChatTopicTranscriptSnapshot {
    const requestHeads = this.requestHeadsRepository.listByTopicId(topicId)
    const entries = this.requestEntriesRepository.listByTopicId(topicId)

    return this.topicTranscriptProjector.project({
      topicId,
      requestHeads,
      entries
    })
  }

  getRequestDebugSnapshot(requestId: string): NormalChatRequestDebugSnapshot {
    const head = this.requestHeadsRepository.getByRequestId(requestId)
    const entries = this.requestEntriesRepository.listByRequestId(requestId)
    const highWatermark = Math.max(0, ...entries.map((entry) => entry.seq))
    const detail = this.requestDetailProjector.project({
      head,
      requestId,
      entries
    })

    return {
      detail,
      agentGraph: this.agentGraphProjector.project(detail),
      highWatermark
    }
  }

  deleteConversationTurn(requestId: string): void {
    this.requestHeadsRepository.delete(requestId)
  }
}
