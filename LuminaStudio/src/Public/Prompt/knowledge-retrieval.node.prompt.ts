/**
 * Knowledge Retrieval 工具描述符
 *
 * 给 LLM 看的工具元数据（Planning 节点会把这些拼成 prompt）
 *
 * 替代：src/utility/langchain-client/nodes/utils-knowledge/index.ts 内嵌文本
 */

/**
 * 工具节点描述符类型（本地定义，与 utility/nodes/types 保持一致）
 */
export interface UtilNodeDescriptor {
  id: string
  name: string
  description: string
  inputDescription: string
  outputDescription: string
}

export const KNOWLEDGE_RETRIEVAL_DESCRIPTOR: UtilNodeDescriptor = {
  id: 'knowledge_retrieval',
  name: '知识库检索',
  description:
    '从本地知识库中检索与查询相关的文档片段。支持向量检索、语义重排、多文档范围检索。适合需要从已导入的私有文档、笔记、论文中查找相关内容的场景。',
  inputDescription: 'query: 检索查询文本（自然语言）; k: 返回结果数（可选，默认由系统配置决定）',
  outputDescription:
    'JSON: { query, totalScopes, scopes: [{ knowledgeBaseId, tableName, hits: [{ content, file_name, distance, rerank_score, ... }] }] }'
}
