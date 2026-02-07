import type {
  LangchainClientAgentCreateConfig,
  LangchainClientLangsmithConfig
} from '@shared/langchain-client.types'

/**
 * LangchainClient MVP 临时配置
 *
 * 说明：
 * - MVP 阶段先在这里手动填写需要从前端获取的数据。
 * - 注意：这里可能包含敏感信息（API Key），请谨慎提交到版本库。
 */

export interface LangchainClientDevConfig {
  /** 是否启用 MVP（默认关闭） */
  enabled: boolean

  /** KnowledgeDatabase api-server baseUrl，例如：http://127.0.0.1:3721 */
  knowledgeApiUrl: string

  /** 可选：LangSmith 配置（用于调试追踪） */
  langsmith?: LangchainClientLangsmithConfig

  /** Agent 实例 ID（主进程侧管理） */
  agentId: string

  /** Agent 创建配置（包含 provider / model / retrieval 等） */
  agentConfig: LangchainClientAgentCreateConfig

  /** 启动后是否自动发起一次 invoke（用于快速验证链路） */
  autoInvoke?: {
    input: string
  }
}

export const LANGCHAIN_CLIENT_DEV_CONFIG: LangchainClientDevConfig = {
  enabled: false,
  knowledgeApiUrl: 'http://127.0.0.1:3721',
  // langsmith: {
  //   apiKey: 'ls-xxx',
  //   project: 'LuminaStudio-Dev'
  // },
  agentId: 'mvp-agent',
  agentConfig: {
    provider: {
      // OpenAI-compatible baseUrl（工具侧会自动 normalize 到 /v1）
      baseUrl: 'https://api.openai.com',
      apiKey: 'FILL_ME',
      defaultHeaders: undefined
    },
    modelId: 'gpt-4o-mini',
    systemPrompt: undefined,
    retrieval: {
      knowledgeBaseId: 1,
      tableName: 'documents',
      k: 5
    }
  },
  autoInvoke: {
    input: '请从知识库中检索并回答：LuminaStudio 的 utility process 通信规范是什么？'
  }
}
