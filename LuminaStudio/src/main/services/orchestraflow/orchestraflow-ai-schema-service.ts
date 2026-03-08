/**
 * OrchestraFlow AI Schema Service
 *
 * 代码即文档：
 * - 该服务导出给 AI 使用的可运行工作流 bundle。
 * - 调用方应把 bundle 交给 AI，让其直接生成可落盘持久化的 JSON。
 */
import type { OFAISchemaBundle } from '@shared/Orchestraflow-types'
import { buildOrchestraflowAISchemaBundle } from '@utility/orchestraflow/ai-schema'

export class OrchestraflowAISchemaService {
  getBundle(): OFAISchemaBundle {
    return buildOrchestraflowAISchemaBundle()
  }
}

export const orchestraflowAISchemaService = new OrchestraflowAISchemaService()
