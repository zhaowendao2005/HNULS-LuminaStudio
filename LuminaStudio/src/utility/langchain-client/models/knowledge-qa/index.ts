import type { AgentModelDefinition } from '../types'
import { KNOWLEDGE_QA_SYSTEM_PROMPT } from './prompt'
import { buildKnowledgeQaGraph } from './graph'

export const knowledgeQaModel: AgentModelDefinition = {
  id: 'knowledge-qa',
  name: '知识库问答助手',
  description: '基于知识库检索的问答模型（LangGraph 版本）。',
  systemPrompt: KNOWLEDGE_QA_SYSTEM_PROMPT,
  buildGraph: buildKnowledgeQaGraph
}
