/**
 * PubMed Search 工具描述符
 * 
 * 给 LLM 看的工具元数据（Planning 节点会把这些拼成 prompt）
 * 
 * 替代：src/utility/langchain-client/nodes/utils-pubmed/index.ts 内嵌文本
 */

import type { UtilNodeDescriptor } from './knowledge-retrieval.node.prompt'

export const PUBMED_SEARCH_DESCRIPTOR: UtilNodeDescriptor = {
  id: 'pubmed_search',
  name: 'PubMed 文献检索',
  description:
    '从 NCBI PubMed 数据库检索生物医学文献。返回学术论文的标题、作者、摘要、DOI、发表日期等结构化信息。适合需要查找生物学、医学、临床研究相关的学术文献、综述、元分析的场景。',
  inputDescription:
    'query: 检索词（支持 PubMed 查询语法，如 MeSH 术语、布尔运算符）; retMax: 返回结果数上限（可选，默认 5，最大 20）',
  outputDescription:
    'JSON: { tool_name, status, search_params: { query, ret_max, total_found }, items: [{ uid, title, authors, abstract, doi, pub_date, source, ... }] }'
}
