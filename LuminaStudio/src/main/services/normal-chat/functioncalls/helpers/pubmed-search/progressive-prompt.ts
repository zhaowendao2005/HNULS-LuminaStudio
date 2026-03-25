export const pubmedSearchProgressivePrompt = `
请先把用户问题改写成适合 PubMed 的论文检索式，再填写 query。
如果用户强调“最新研究”或“近年进展”，优先使用 pub_date 并补 startDate。
如果用户只要高质量经典证据，可以继续使用 relevance。
不要把中文自然语言整段直接塞进 query，尽量抽成疾病 / 机制 / 干预 / 人群 等英文关键词。
`.trim()
