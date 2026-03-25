export const pubmedSearchSchemaPrompt = `
{
  // 固定写 "pubmed-search"
  "helperId": "pubmed-search",
  // PubMed 检索关键词，必须是适合论文检索的英文或英文+术语短语
  "query": "string",
  // 返回条数，1~10 之间
  "topK": 5,
  // relevance 或 pub_date
  "sort": "relevance",
  // 可选，YYYY/MM/DD 或 YYYY-MM-DD
  "startDate": null,
  // 可选，YYYY/MM/DD 或 YYYY-MM-DD
  "endDate": null
}
`.trim()
