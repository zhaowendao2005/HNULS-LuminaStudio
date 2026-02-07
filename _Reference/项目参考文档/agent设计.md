# DeepWiki Q&A with Code Context for Repository: langchain-ai/langchainjs
## Q1
给我简要介绍下langchain提供的所有功能 环绕如果做个基于langchain的qa或者是deepresearch
### Answer
# LangChain.js 功能介绍

## 核心功能概述

LangChain 是一个用于构建 LLM 驱动应用的框架，帮助开发者将可互操作的组件和第三方集成链接在一起，简化 AI 应用开发。 langchainjs:5-5 

### 主要应用场景

LangChain 适用于以下场景： langchainjs:27-35 

- **实时数据增强** - 轻松连接 LLM 到各种数据源和外部/内部系统
- **模型互操作性** - 灵活切换不同模型
- **快速原型开发** - 通过模块化、基于组件的架构快速构建和迭代
- **生产就绪功能** - 内置监控、评估和调试支持
- **活跃的社区生态** - 丰富的集成、模板和社区贡献
- **灵活的抽象层** - 从高级链到低级组件的多层次抽象

## LangChain 生态系统

LangChain 提供完整的工具生态： langchainjs:38-40 

- **LangSmith** - 用于构建、测试和监控 LLM 应用的统一开发平台
- **LangGraph** - 用于构建可靠处理复杂任务的 Agent 的低级编排框架

## 核心模块功能

### 1. **Chains (链)**
支持多种文档处理链：
- 问答链
- 摘要链
- 对话链
- SQL 查询链
- API 调用链
- 路由链

### 2. **Retrievers (检索器)**
提供多种高级检索策略：
- 上下文压缩检索器
- 集成检索器
- HyDE (假设文档嵌入)
- 多查询检索器
- 多向量检索器
- 父文档检索器
- 分数阈值检索器
- 时间加权检索器

### 3. **Memory (记忆)**
支持多种对话记忆类型： langchainjs:1-17 
- 缓冲记忆
- 令牌缓冲记忆
- 窗口缓冲记忆
- 实体记忆
- 摘要记忆
- 向量存储记忆

### 4. **Agents (智能体)**
提供工具调用和函数调用能力： langchainjs:1-1 
- 工具调用 Agent
- OpenAI 函数调用 Agent
- OpenAI 工具 Agent
- Agent 执行器管理执行循环

### 5. **Tools (工具)**
内置多种工具类型：
- 检索工具
- Web 浏览器工具
- SQL 工具
- 文件系统工具
- 向量存储工具
- JSON 工具
- 请求工具

### 6. **多模型提供商支持**
集成了 30+ 个 LLM 提供商：
- OpenAI、Anthropic、Google (Gemini/Vertex AI)
- Cohere、Mistral AI、Groq
- AWS Bedrock、Azure
- Ollama (本地模型)
- 以及更多...

---

## 如何构建基于 LangChain 的 QA 系统

### 方案一：基础 RetrievalQA Chain

**RetrievalQAChain** 是最基础的问答链，结合检索器和文档合并链来回答问题： langchainjs:25-56 

**核心工作流程：** langchainjs:93-117 
1. 接收用户问题
2. 使用检索器查找相关文档
3. 将文档传递给文档合并链
4. 返回答案（可选返回源文档）

**文档合并策略：** langchainjs:20-50 

支持三种策略：
- **stuff** - 将所有文档一次性传给 LLM（适合少量文档）
- **map_reduce** - 分别处理每个文档，然后合并结果（适合大量文档）
- **refine** - 迭代优化答案（适合需要精细答案的场景）

### 方案二：对话式 QA (ConversationalRetrievalQAChain)

**ConversationalRetrievalQAChain** 扩展了基础 QA 链，支持对话历史： langchainjs:22-98 

**核心特性：**
- 使用 `questionGeneratorChain` 将后续问题重新表述为独立问题
- 支持聊天历史
- 适合多轮对话场景

**典型实现步骤：**
1. 创建 history-aware 检索器（contextualize 问题）
2. 创建问答链
3. 组合成完整的 RAG 链

### 完整 RAG 流程构建

**步骤 1：文档加载与分割**
- 使用 Document Loaders 加载文档（支持文本、PDF、网页等）
- 使用 Text Splitters 将文档分割成小块

**步骤 2：向量化与存储**
- 使用 Embeddings 模型将文本转换为向量
- 存储到 Vector Store（MemoryVectorStore、Pinecone、Weaviate 等）

**步骤 3：创建检索器**
- 从 Vector Store 创建 Retriever
- 可选择使用高级检索策略（如多查询、上下文压缩等）

**步骤 4：构建 QA Chain**
- 选择合适的 QA Chain 类型（基础或对话式）
- 配置文档合并策略
- 设置 prompt 模板

---

## 如何构建基于 LangChain 的 Deep Research 系统

### 方案一：使用 Agent + 检索工具

**核心思路：** 将检索器包装成工具，让 Agent 自主决策何时检索信息

**createRetrieverTool** 函数可以将检索器转换为 Agent 工具： langchainjs:10-30 

**Agent 执行流程：** langchainjs:1-1 
1. Agent 分析问题
2. 决定调用哪些工具（可能包括检索工具、网络搜索等）
3. 获取工具执行结果
4. 基于结果进行推理
5. 重复或给出最终答案

### 方案二：多检索器路由

**MultiRetrievalQAChain** 可以根据问题内容路由到不同的检索器，适合需要从多个数据源检索的场景。

### 方案三：结合 LangGraph 构建复杂工作流

对于更高级的定制或 Agent 编排，可以使用 **LangGraph.js**： langchainjs:9-9 
- 可定制架构
- 长期记忆
- 人机协作工作流
- 已被 LinkedIn、Uber 等公司在生产环境中使用

### Deep Research 系统的关键组件

1. **多样化的工具集**
   - 检索工具（内部知识库）
   - Web 搜索工具
   - API 调用工具
   - 代码执行工具

2. **高级检索策略**
   - 多查询检索（从不同角度查询）
   - HyDE（假设文档嵌入）
   - 父文档检索（检索小块，返回大块）
   - 集成检索（结合多种检索方法）

3. **Agent 推理能力**
   - 使用支持工具调用的模型（OpenAI、Anthropic 等）
   - 配置合理的 prompt 引导 Agent 思考
   - 设置迭代次数限制

4. **记忆与上下文管理**
   - 使用 Memory 保持对话上下文
   - 向量存储记忆用于长期知识

---

## Notes

- LangChain.js 支持多种运行环境：Node.js、浏览器、Cloudflare Workers、Vercel/Next.js、Deno、Bun 等 langchainjs:43-51 

- 生产环境建议使用 **LangSmith** 进行监控和调试 langchainjs:14-15 

- 对于复杂的 Agent 系统和多步骤研究任务，推荐使用 **LangGraph.js** 而非基础的 Chain langchainjs:39-39 

- QA 系统的性能很大程度上取决于检索质量，建议根据实际场景选择合适的检索策略和 Embedding 模型

- Deep Research 系统通常需要结合多个工具和数据源，Agent 框架提供了更灵活的编排能力
### Citations
**File:** README.md (L5-5)
```markdown
LangChain is a framework for building LLM-powered applications. It helps you chain together interoperable components and third-party integrations to simplify AI application development — all while future-proofing decisions as the underlying technology evolves.
```
**File:** README.md (L9-9)
```markdown
If you're looking for more advanced customization or agent orchestration, check out [LangGraph.js](https://docs.langchain.com/oss/javascript/langgraph/overview). our framework for building agents and controllable workflows.
```
**File:** README.md (L14-15)
```markdown
To help you ship LangChain apps to production faster, check out [LangSmith](https://smith.langchain.com).
[LangSmith](https://smith.langchain.com) is a unified developer platform for building, testing, and monitoring LLM applications.
```
**File:** README.md (L27-35)
```markdown
Use LangChain for:

- **Real-time data augmentation**. Easily connect LLMs to diverse data sources and external/internal systems, drawing from LangChain’s vast library of integrations with model providers, tools, vector stores, retrievers, and more.
- **Model interoperability**. Swap models in and out as your engineering team experiments to find the best choice for your application’s needs. As the industry frontier evolves, adapt quickly — LangChain’s abstractions keep you moving without losing momentum.
- **Rapid prototyping**. Quickly build and iterate on LLM applications with LangChain's modular, component-based architecture. Test different approaches and workflows without rebuilding from scratch, accelerating your development cycle.
- **Production-ready features**. Deploy reliable applications with built-in support for monitoring, evaluation, and debugging through integrations like LangSmith. Scale with confidence using battle-tested patterns and best practices.
- **Vibrant community and ecosystem**. Leverage a rich ecosystem of integrations, templates, and community-contributed components. Benefit from continuous improvements and stay up-to-date with the latest AI developments through an active open-source community.
- **Flexible abstraction layers**. Work at the level of abstraction that suits your needs - from high-level chains for quick starts to low-level components for fine-grained control. LangChain grows with your application's complexity.

```
**File:** README.md (L38-40)
```markdown
- [LangSmith](https://www.langchain.com/langsmith) - Unified developer platform for building, testing, and monitoring LLM applications. With LangSmith, you can debug poor-performing LLM app runs, evaluate agent trajectories, gain visibility in production, and deploy agents with confidence.
- [LangGraph](https://docs.langchain.com/oss/javascript/langgraph/overview) - Build agents that can reliably handle complex tasks with LangGraph, our low-level agent orchestration framework. LangGraph offers customizable architecture, long-term memory, and human-in-the-loop workflows — and is trusted in production by companies like LinkedIn, Uber, Klarna, and GitLab.

```
**File:** README.md (L43-51)
```markdown
LangChain.js is written in TypeScript and can be used in:

- Node.js (ESM and CommonJS) - 20.x, 22.x, 24.x
- Cloudflare Workers
- Vercel / Next.js (Browser, Serverless and Edge functions)
- Supabase Edge Functions
- Browser
- Deno
- Bun
```
**File:** libs/langchain-classic/src/memory (L1-17)
```text
[{"name":"buffer_memory.ts","path":"libs/langchain-classic/src/memory/buffer_memory.ts","sha":"f7c6310a2b903f3b8ff51a1506f05d306e081e47","size":3592,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/buffer_memory.ts?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/buffer_memory.ts","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/f7c6310a2b903f3b8ff51a1506f05d306e081e47","download_url":"https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-classic/src/memory/buffer_memory.ts","type":"file","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/buffer_memory.ts?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/f7c6310a2b903f3b8ff51a1506f05d306e081e47","html":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/buffer_memory.ts"}},{"name":"buffer_token_memory.ts","path":"libs/langchain-classic/src/memory/buffer_token_memory.ts","sha":"537c0f8ca1ccc48c22450a05af0fe35c1ab4cec0","size":3836,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/buffer_token_memory.ts?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/buffer_token_memory.ts","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/537c0f8ca1ccc48c22450a05af0fe35c1ab4cec0","download_url":"https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-classic/src/memory/buffer_token_memory.ts","type":"file","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/buffer_token_memory.ts?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/537c0f8ca1ccc48c22450a05af0fe35c1ab4cec0","html":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/buffer_token_memory.ts"}},{"name":"buffer_window_memory.ts","path":"libs/langchain-classic/src/memory/buffer_window_memory.ts","sha":"218412ed0f38bddbe49a9cef721ce972cc2e6c7d","size":3223,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/buffer_window_memory.ts?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/buffer_window_memory.ts","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/218412ed0f38bddbe49a9cef721ce972cc2e6c7d","download_url":"https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-classic/src/memory/buffer_window_memory.ts","type":"file","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/buffer_window_memory.ts?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/218412ed0f38bddbe49a9cef721ce972cc2e6c7d","html":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/buffer_window_memory.ts"}},{"name":"chat_memory.ts","path":"libs/langchain-classic/src/memory/chat_memory.ts","sha":"a6c438c007ace9ca4fde9533b9b2b999952c604a","size":2115,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/chat_memory.ts?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/chat_memory.ts","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/a6c438c007ace9ca4fde9533b9b2b999952c604a","download_url":"https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-classic/src/memory/chat_memory.ts","type":"file","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/chat_memory.ts?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/a6c438c007ace9ca4fde9533b9b2b999952c604a","html":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/chat_memory.ts"}},{"name":"combined_memory.ts","path":"libs/langchain-classic/src/memory/combined_memory.ts","sha":"8cbadeb922c3f9e0eca77cdcadf2dcc325cc72d2","size":4016,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/combined_memory.ts?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/combined_memory.ts","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/8cbadeb922c3f9e0eca77cdcadf2dcc325cc72d2","download_url":"https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-classic/src/memory/combined_memory.ts","type":"file","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/combined_memory.ts?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/8cbadeb922c3f9e0eca77cdcadf2dcc325cc72d2","html":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/combined_memory.ts"}},{"name":"entity_memory.ts","path":"libs/langchain-classic/src/memory/entity_memory.ts","sha":"b71ecefca3bde155e2288418732c251d8d6056ad","size":6462,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/entity_memory.ts?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/entity_memory.ts","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/b71ecefca3bde155e2288418732c251d8d6056ad","download_url":"https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-classic/src/memory/entity_memory.ts","type":"file","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/entity_memory.ts?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/b71ecefca3bde155e2288418732c251d8d6056ad","html":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/entity_memory.ts"}},{"name":"index.ts","path":"libs/langchain-classic/src/memory/index.ts","sha":"dfdf2f32573cc4b285527dc908ee5ad6d2ca206a","size":1287,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/index.ts?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/index.ts","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/dfdf2f32573cc4b285527dc908ee5ad6d2ca206a","download_url":"https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-classic/src/memory/index.ts","type":"file","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/index.ts?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/dfdf2f32573cc4b285527dc908ee5ad6d2ca206a","html":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/index.ts"}},{"name":"prompt.ts","path":"libs/langchain-classic/src/memory/prompt.ts","sha":"7853798d863b5b9da5363d128fff770d91a2d978","size":5848,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/prompt.ts?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/prompt.ts","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/7853798d863b5b9da5363d128fff770d91a2d978","download_url":"https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-classic/src/memory/prompt.ts","type":"file","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/prompt.ts?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/7853798d863b5b9da5363d128fff770d91a2d978","html":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/prompt.ts"}},{"name":"stores","path":"libs/langchain-classic/src/memory/stores","sha":"bcf8764cfaa8acdecb266c24b9b70a74f5ae8c1e","size":0,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/stores?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-classic/src/memory/stores","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/trees/bcf8764cfaa8acdecb266c24b9b70a74f5ae8c1e","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/stores?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/trees/bcf8764cfaa8acdecb266c24b9b70a74f5ae8c1e","html":"https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-classic/src/memory/stores"}},{"name":"summary.ts","path":"libs/langchain-classic/src/memory/summary.ts","sha":"c56b31123409640d80de172cd01f276da62504cb","size":5508,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/summary.ts?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/summary.ts","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/c56b31123409640d80de172cd01f276da62504cb","download_url":"https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-classic/src/memory/summary.ts","type":"file","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/summary.ts?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/c56b31123409640d80de172cd01f276da62504cb","html":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/summary.ts"}},{"name":"summary_buffer.ts","path":"libs/langchain-classic/src/memory/summary_buffer.ts","sha":"fc0997d983f13d96fd2bb7b6040cd7ac8fb9420f","size":5533,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/summary_buffer.ts?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/summary_buffer.ts","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/fc0997d983f13d96fd2bb7b6040cd7ac8fb9420f","download_url":"https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-classic/src/memory/summary_buffer.ts","type":"file","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/summary_buffer.ts?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/fc0997d983f13d96fd2bb7b6040cd7ac8fb9420f","html":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/summary_buffer.ts"}},{"name":"tests","path":"libs/langchain-classic/src/memory/tests","sha":"93bf56bf6eeda10ceeed7d49e0cf10edfae855fd","size":0,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/tests?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-classic/src/memory/tests","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/trees/93bf56bf6eeda10ceeed7d49e0cf10edfae855fd","download_url":null,"type":"dir","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/tests?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/trees/93bf56bf6eeda10ceeed7d49e0cf10edfae855fd","html":"https://github.com/langchain-ai/langchainjs/tree/main/libs/langchain-classic/src/memory/tests"}},{"name":"vector_store.ts","path":"libs/langchain-classic/src/memory/vector_store.ts","sha":"7b3bab84abb6afcc6ae51f42b84276147ff2ea75","size":4070,"url":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/vector_store.ts?ref=main","html_url":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/vector_store.ts","git_url":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/7b3bab84abb6afcc6ae51f42b84276147ff2ea75","download_url":"https://raw.githubusercontent.com/langchain-ai/langchainjs/main/libs/langchain-classic/src/memory/vector_store.ts","type":"file","_links":{"self":"https://api.github.com/repos/langchain-ai/langchainjs/contents/libs/langchain-classic/src/memory/vector_store.ts?ref=main","git":"https://api.github.com/repos/langchain-ai/langchainjs/git/blobs/7b3bab84abb6afcc6ae51f42b84276147ff2ea75","html":"https://github.com/langchain-ai/langchainjs/blob/main/libs/langchain-classic/src/memory/vector_store.ts"}}]
```
**File:** libs/langchain-classic/src/agents/executor.ts (L1-1)
```typescript
import {
```
**File:** libs/langchain-classic/src/chains/retrieval_qa.ts (L25-56)
```typescript
/**
 * Class representing a chain for performing question-answering tasks with
 * a retrieval component.
 * @example
 * ```typescript
 * import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
 * import { ChatPromptTemplate } from "@langchain/core/prompts";
 * import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
 * import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
 *
 * const documents = [...your documents here];
 * const embeddings = ...your embeddings model;
 * const llm = ...your LLM model;
 *
 * const vectorstore = await MemoryVectorStore.fromDocuments(
 *   documents,
 *   embeddings
 * );
 * const prompt = ChatPromptTemplate.fromTemplate(`Answer the user's question: {input} based on the following context {context}`);
 *
 * const combineDocsChain = await createStuffDocumentsChain({
 *   llm,
 *   prompt,
 * });
 * const retriever = vectorstore.asRetriever();
 *
 * const retrievalChain = await createRetrievalChain({
 *   combineDocsChain,
 *   retriever,
 * });
 * ```
 */
```
**File:** libs/langchain-classic/src/chains/retrieval_qa.ts (L93-117)
```typescript
  async _call(
    values: ChainValues,
    runManager?: CallbackManagerForChainRun
  ): Promise<ChainValues> {
    if (!(this.inputKey in values)) {
      throw new Error(`Question key "${this.inputKey}" not found.`);
    }
    const question: string = values[this.inputKey];
    const docs = await this.retriever.invoke(
      question,
      runManager?.getChild("retriever")
    );
    const inputs = { question, input_documents: docs, ...values };
    const result = await this.combineDocumentsChain.call(
      inputs,
      runManager?.getChild("combine_documents")
    );
    if (this.returnSourceDocuments) {
      return {
        ...result,
        sourceDocuments: docs,
      };
    }
    return result;
  }
```
**File:** libs/langchain-classic/src/chains/question_answering/load.ts (L20-50)
```typescript
/**
 * Represents the parameters for creating a QAChain. It can be of three
 * types: "stuff", "map_reduce", or "refine".
 */
export type QAChainParams =
  | ({
      type?: "stuff";
    } & StuffQAChainParams)
  | ({
      type?: "map_reduce";
    } & MapReduceQAChainParams)
  | ({
      type?: "refine";
    } & RefineQAChainParams);

export const loadQAChain = (
  llm: BaseLanguageModelInterface,
  params: QAChainParams = { type: "stuff" }
) => {
  const { type } = params;
  if (type === "stuff") {
    return loadQAStuffChain(llm, params);
  }
  if (type === "map_reduce") {
    return loadQAMapReduceChain(llm, params);
  }
  if (type === "refine") {
    return loadQARefineChain(llm, params);
  }
  throw new Error(`Invalid _type: ${type}`);
};
```
**File:** libs/langchain-classic/src/chains/conversational_retrieval_chain.ts (L22-98)
```typescript
/**
 * Interface for the input parameters of the
 * ConversationalRetrievalQAChain class.
 */
export interface ConversationalRetrievalQAChainInput extends ChainInputs {
  retriever: BaseRetrieverInterface;
  combineDocumentsChain: BaseChain;
  questionGeneratorChain: LLMChain;
  returnSourceDocuments?: boolean;
  returnGeneratedQuestion?: boolean;
  inputKey?: string;
}

/**
 * Class for conducting conversational question-answering tasks with a
 * retrieval component. Extends the BaseChain class and implements the
 * ConversationalRetrievalQAChainInput interface.
 * @example
 * ```typescript
 * import { ChatAnthropic } from "@langchain/anthropic";
 * import {
 *   ChatPromptTemplate,
 *   MessagesPlaceholder,
 * } from "@langchain/core/prompts";
 * import { BaseMessage } from "@langchain/core/messages";
 * import { createStuffDocumentsChain } from "@langchain/classic/chains/combine_documents";
 * import { createHistoryAwareRetriever } from "@langchain/classic/chains/history_aware_retriever";
 * import { createRetrievalChain } from "@langchain/classic/chains/retrieval";
 *
 * const retriever = ...your retriever;
 * const llm = new ChatAnthropic();
 *
 * // Contextualize question
 * const contextualizeQSystemPrompt = `
 * Given a chat history and the latest user question
 * which might reference context in the chat history,
 * formulate a standalone question which can be understood
 * without the chat history. Do NOT answer the question, just
 * reformulate it if needed and otherwise return it as is.`;
 * const contextualizeQPrompt = ChatPromptTemplate.fromMessages([
 *   ["system", contextualizeQSystemPrompt],
 *   new MessagesPlaceholder("chat_history"),
 *   ["human", "{input}"],
 * ]);
 * const historyAwareRetriever = await createHistoryAwareRetriever({
 *   llm,
 *   retriever,
 *   rephrasePrompt: contextualizeQPrompt,
 * });
 *
 * // Answer question
 * const qaSystemPrompt = `
 * You are an assistant for question-answering tasks. Use
 * the following pieces of retrieved context to answer the
 * question. If you don't know the answer, just say that you
 * don't know. Use three sentences maximum and keep the answer
 * concise.
 * \n\n
 * {context}`;
 * const qaPrompt = ChatPromptTemplate.fromMessages([
 *   ["system", qaSystemPrompt],
 *   new MessagesPlaceholder("chat_history"),
 *   ["human", "{input}"],
 * ]);
 *
 * // Below we use createStuffDocuments_chain to feed all retrieved context
 * // into the LLM. Note that we can also use StuffDocumentsChain and other
 * // instances of BaseCombineDocumentsChain.
 * const questionAnswerChain = await createStuffDocumentsChain({
 *   llm,
 *   prompt: qaPrompt,
 * });
 *
 * const ragChain = await createRetrievalChain({
 *   retriever: historyAwareRetriever,
 *   combineDocsChain: questionAnswerChain,
 * });
```
**File:** libs/langchain-classic/src/agents/toolkits/conversational_retrieval/tool.ts (L10-30)
```typescript
export function createRetrieverTool(
  retriever: BaseRetrieverInterface,
  input: Omit<DynamicStructuredToolInput, "func" | "schema">
) {
  const func = async (
    { input }: { input: string },
    runManager?: CallbackManagerForToolRun
  ) => {
    const docs = await retriever.invoke(
      input,
      runManager?.getChild("retriever")
    );
    return formatDocumentsAsString(docs);
  };
  const schema = z.object({
    input: z
      .string()
      .describe("Natural language query used as input to the retriever"),
  });
  return new DynamicStructuredTool({ ...input, func, schema });
}
```
## Q2
electron中 如何将一个模型用于langsmith监控？
### Answer
在 Electron 中将模型用于 LangSmith 监控，需要配置 LangSmith 客户端并设置相应的回调处理器。

---

## 快速配置

在 Electron 的主进程或渲染进程中，设置 LangSmith 环境变量并创建带有追踪器的模型：

```typescript
import { ChatOpenAI } from "@langchain/openai";
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

// 设置 LangSmith 环境变量
process.env.LANGCHAIN_TRACING_V2 = "true";
process.env.LANGCHAIN_API_KEY = "your-langsmith-api-key";
process.env.LANGCHAIN_PROJECT = "your-electron-app";

// 创建模型
const model = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0.7,
  callbacks: [new LangChainTracer()], // 添加 LangSmith 追踪器
});

// 使用模型，所有调用都会自动记录到 LangSmith
const response = await model.invoke([
  { role: "user", content: "Hello, how are you?" }
]);
```

---

## 详细配置步骤

### 1. 配置 LangSmith 客户端

LangChain 使用单例模式管理 LangSmith 客户端 langchainjs:6-18 ：

```typescript
import { getDefaultLangChainClientSingleton, setDefaultLangChainClientSingleton } from "@langchain/core/singletons/tracer";
import { Client } from "langsmith";

// 方式1：通过环境变量自动配置（推荐）
process.env.LANGCHAIN_API_KEY = "ls-x-your-key";
process.env.LANGCHAIN_PROJECT = "electron-app";

// 方式2：手动设置客户端
const customClient = new Client({
  apiKey: "ls-x-your-key",
  apiUrl: "https://api.smith.langchain.com",
});
setDefaultLangChainClientSingleton(customClient);
```

### 2. 使用 LangChainTracer

`LangChainTracer` 是与 LangSmith 集成的核心组件 langchainjs:72-101 ：

```typescript
import { LangChainTracer } from "@langchain/core/tracers/tracer_langchain";

const tracer = new LangChainTracer({
  projectName: "my-electron-app", // 可选，覆盖默认项目名
  exampleId: "example-123",       // 可选，关联到特定示例
});
```

### 3. 模型配置

所有 LangChain 聊天模型都支持 LangSmith 监控，通过 `getLsParams` 方法提供监控参数 langchainjs:186-193 ：

```typescript
// OpenAI 模型示例
import { ChatOpenAI } from "@langchain/openai";

const openaiModel = new ChatOpenAI({
  modelName: "gpt-4",
  temperature: 0.7,
  callbacks: [new LangChainTracer()],
});

// Anthropic 模型示例
import { ChatAnthropic } from "@langchain/anthropic";

const anthropicModel = new ChatAnthropic({
  model: "claude-3-sonnet-20240229",
  callbacks: [new LangChainTracer()],
});
```

### 4. Electron 特殊配置

在 Electron 环境中，需要注意以下几点：

#### 主进程配置
```typescript
// main.ts
import { app, BrowserWindow } from 'electron';
import { Client } from 'langsmith';

// 在应用启动时配置 LangSmith
app.whenReady().then(() => {
  // 设置环境变量
  process.env.LANGCHAIN_TRACING_V2 = "true";
  process.env.LANGCHAIN_API_KEY = "your-api-key";
  
  createMainWindow();
});
```

#### 渲染进程配置
```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('langchain', {
  // 安全地暴露 API 密钥
  getLangSmithConfig: () => ipcRenderer.invoke('get-langsmith-config'),
});
```

#### 进程间通信
```typescript
// main.ts - 处理敏感配置
ipcMain.handle('get-langsmith-config', () => {
  return {
    apiKey: process.env.LANGCHAIN_API_KEY,
    project: process.env.LANGCHAIN_PROJECT,
  };
});

// renderer.ts - 使用配置
const config = await window.langchain.getLangSmithConfig();
const model = new ChatOpenAI({
  callbacks: [new LangChainTracer({ projectName: config.project })],
});
```

### 5. 高级配置

#### 自定义元数据
```typescript
const model = new ChatOpenAI({
  callbacks: [new LangChainTracer()],
  metadata: {
    electron_version: process.versions.electron,
    node_version: process.versions.node,
    platform: process.platform,
  },
});
```

#### 批量配置
```typescript
// 为所有模型配置全局追踪器
import { CallbackManager } from "@langchain/core/callbacks/manager";

const callbackManager = CallbackManager.configure([
  new LangChainTracer(),
]);

const model = new ChatOpenAI({
  callbacks: callbackManager,
});
```

---

## Notes

- 确保 `LANGCHAIN_API_KEY` 环境变量已设置，否则追踪不会工作 langchainjs:6-18 
- 在 Electron 中，建议在主进程配置环境变量，通过 IPC 安全地传递给渲染进程
- LangSmith 会自动捕获模型的输入、输出、令牌使用量和延迟等指标
- 可以通过 `LANGCHAIN_PROJECT` 环境变量指定项目名，便于在 LangSmith 中组织追踪数据
- 对于生产环境，建议使用 `LANGCHAIN_CALLBACKS_BACKGROUND=false` 来同步发送追踪数据 langchainjs:8-14 

Wiki pages you might want to explore:
- [Overview (langchain-ai/langchainjs)](/wiki/langchain-ai/langchainjs#1)
### Citations
**File:** libs/langchain-core/src/singletons/tracer.ts (L6-18)
```typescript
export const getDefaultLangChainClientSingleton = () => {
  if (client === undefined) {
    const clientParams =
      getEnvironmentVariable("LANGCHAIN_CALLBACKS_BACKGROUND") === "false"
        ? {
            // LangSmith has its own backgrounding system
            blockOnRootRunFinalization: true,
          }
        : {};
    client = new Client(clientParams);
  }
  return client;
};
```
**File:** libs/langchain-core/src/tracers/tracer_langchain.ts (L72-101)
```typescript
export class LangChainTracer
  extends BaseTracer
  implements LangChainTracerFields
{
  name = "langchain_tracer";

  projectName?: string;

  exampleId?: string;

  client: LangSmithTracingClientInterface;

  replicas?: RunTreeConfig["replicas"];

  usesRunTreeMap = true;

  constructor(fields: LangChainTracerFields = {}) {
    super(fields);
    const { exampleId, projectName, client, replicas } = fields;

    this.projectName = projectName ?? getDefaultProjectName();
    this.replicas = replicas;
    this.exampleId = exampleId;
    this.client = client ?? getDefaultLangChainClientSingleton();

    const traceableTree = LangChainTracer.getTraceableRunTree();
    if (traceableTree) {
      this.updateFromRunTree(traceableTree);
    }
  }
```
**File:** libs/langchain-core/src/language_models/chat_models.ts (L186-193)
```typescript
export type LangSmithParams = {
  ls_provider?: string;
  ls_model_name?: string;
  ls_model_type: "chat";
  ls_temperature?: number;
  ls_max_tokens?: number;
  ls_stop?: Array<string>;
};
```
## Q3
langsmith不是一个desktop而是一个由gui的包吗
### Answer
LangSmith 是一个基于 Web 的 SaaS 平台，不是桌面应用或 GUI 包。它提供 Web 界面用于监控和调试 LLM 应用，同时通过 `langsmith` npm 包与你的代码集成。

## LangSmith 的组成

### 1. Web 平台
- 访问地址：https://smith.langchain.com
- 提供 Web GUI 用于查看追踪、评估和监控数据
- 无需安装，通过浏览器访问

### 2. SDK 集成包
```typescript
import { Client } from "langsmith";
```
`langsmith` 是一个 npm 包，用于将应用数据发送到 LangSmith 平台 langchainjs:1-2 。

## 工作方式

LangChain 通过 `Client` 实例将追踪数据发送到 LangSmith 平台 langchainjs:15-16 ：

```typescript
client = new Client(clientParams);
```

然后在 Web 界面查看和分析这些数据。

## Notes

- LangSmith 本身不是桌面应用，是 Web 服务
- `langsmith` npm 包只是客户端 SDK，用于数据上传
- 所有监控、调试和评估都在 Web 界面完成
- 通过环境变量（如 `LANGCHAIN_API_KEY`）配置连接 langchainjs:8-14 

Wiki pages you might want to explore:
- [Overview (langchain-ai/langchainjs)](/wiki/langchain-ai/langchainjs#1)
### Citations
**File:** libs/langchain-core/src/singletons/tracer.ts (L1-2)
```typescript
import { Client } from "langsmith";
import { getEnvironmentVariable } from "../utils/env.js";
```
**File:** libs/langchain-core/src/singletons/tracer.ts (L8-14)
```typescript
    const clientParams =
      getEnvironmentVariable("LANGCHAIN_CALLBACKS_BACKGROUND") === "false"
        ? {
            // LangSmith has its own backgrounding system
            blockOnRootRunFinalization: true,
          }
        : {};
```
**File:** libs/langchain-core/src/singletons/tracer.ts (L15-16)
```typescript
    client = new Client(clientParams);
  }
```
## Q4
给我拟一个mvp的 带有langsmith监控的deepresearch 其中关于rag的部分为自己写的工具 占位即可
然后大致流程是规划节点制作deg---调用工具检索和理解（使用模型）----判断是否补充资料-----回答
### Answer
# Building a LangGraph-Based Agent System with LangSmith Monitoring

## Overview

LangChain.js provides a production-ready ReAct (Reasoning + Acting) agent system built on LangGraph's `StateGraph`. The system uses multiple specialized nodes for planning, tool calling, and decision making, with built-in LangSmith monitoring support. langchainjs:120-147 

## Creating a Multi-Node Agent System

### Basic Agent Creation

You create an agent using the `createAgent()` factory function, which automatically constructs a LangGraph with multiple nodes: langchainjs:26-103 

### Core Node Architecture

The agent system consists of several node types that execute in a specific order:

**1. AgentNode (`model_request`)** - Handles model invocation and decision making: langchainjs:80-150 

**2. ToolNode (`tools`)** - Executes tool calls in parallel: langchainjs:137-180 

**3. Middleware Nodes** - For planning and custom logic (beforeAgent, beforeModel, afterModel, afterAgent): langchainjs:282-368 

### Graph Construction Flow

The `ReactAgent` constructor builds the StateGraph by connecting these nodes with edges and conditional routing: langchainjs:396-477 

**Routing Logic** - The system uses conditional edges to decide whether to call tools or end execution: langchainjs:736-787 

## Structuring Tool Calling Within Nodes

### Tool Definition and Registration

Tools are defined using the `tool()` function and passed to the agent: langchainjs:79-103 

### Tool Execution Architecture

The `ToolNode` handles tool execution with support for parallel processing, error handling, and middleware interception: langchainjs:290-395 

**Parallel Tool Execution** - In v2 mode, multiple tool calls are executed in parallel using LangGraph's `Send` primitive: langchainjs:768-786 

### Tool Call Interception with Middleware

You can wrap tool execution using the `wrapToolCall` hook for retrieval, caching, or authentication: langchainjs:417-478 

**Creating Middleware** for tool interception: langchainjs:19-150 

### Error Handling in Tool Execution

The ToolNode provides sophisticated error handling for tool invocation failures: langchainjs:106-135 

## Integrating LangSmith Monitoring

### Automatic Tracing

LangSmith monitoring is automatically enabled when you set environment variables. The agent system inherits tracing from the underlying LangGraph infrastructure: langchainjs:442-470 

**Environment Variables** - Set one of these to enable tracing:
- `LANGCHAIN_TRACING_V2=true`
- `LANGSMITH_TRACING_V2=true`
- `LANGCHAIN_TRACING=true`
- `LANGSMITH_TRACING=true`

### Streaming Events for Monitoring

The `ReactAgent` exposes `streamEvents()` for real-time monitoring of agent execution: langchainjs:1076-1125 

**Usage Example Pattern:**
```typescript
const agent = createAgent({
  model: "openai:gpt-4o",
  tools: [retrievalTool, analysisTool],
});

// Stream events for monitoring
const stream = await agent.streamEvents(
  { messages: [{ role: "user", content: "query" }] },
  { version: "v2" }
);

for await (const event of stream) {
  if (event.event === "on_chat_model_stream") {
    // Monitor model output
  } else if (event.event === "on_tool_start") {
    // Monitor tool invocation
  }
}
```

## Advanced Patterns for Planning and Decision Making

### Using Middleware for Planning Nodes

Middleware hooks provide planning capabilities at different stages: langchainjs:222-277 

**Control Flow** - Middleware can redirect execution using `jumpTo`: langchainjs:805-843 

### Model Call Wrapping for Decision Logic

The `wrapModelCall` hook allows you to intercept and modify model calls for custom decision-making: langchainjs:481-509 

**Middleware Composition** - Multiple middleware are composed with the first becoming the outermost wrapper: langchainjs:387-569 

## Complete Example Structure

Here's how the components work together:

**Multi-Node Graph Flow:**
```
START → beforeAgent → beforeModel → model_request → afterModel → Router
                           ↑                                        ↓
                           |                                    [tool_calls?]
                           |                                        ↓
                           └────────────── tools ←─────────────────┘
                                                                    ↓
                                                              [no tool_calls]
                                                                    ↓
                                                              afterAgent → END
``` langchainjs:70-81 

## Notes

- **Node Names**: The agent uses specific node names - `AGENT_NODE_NAME = "model_request"` for model calls and `TOOLS_NODE_NAME = "tools"` for tool execution
- **Parallel Execution**: Tool calls in v2 mode execute in parallel using LangGraph's `Send` primitive, improving performance for multiple tool calls
- **State Management**: The system automatically merges state from user schemas, middleware schemas, and built-in state (messages, jumpTo)
- **LangSmith Integration**: Tracing happens automatically through the LangChain callback system when environment variables are set - no additional code needed
- **Error Handling**: The ToolNode converts tool invocation errors to ToolMessages by default, allowing the model to see errors and retry with corrected arguments
- **Middleware Order**: Middleware hooks execute in the order they're provided for beforeAgent/beforeModel, and in reverse order for afterModel/afterAgent

The architecture separates concerns cleanly: AgentNode handles reasoning/decision-making, ToolNode handles action execution, and middleware nodes handle planning and custom logic. This design follows the ReAct pattern while providing extensive customization through middleware hooks.
### Citations
**File:** libs/langchain/src/agents/ReactAgent.ts (L70-81)
```typescript
/**
 * In the ReAct pattern we have three main nodes:
 * - model_request: The node that makes the model call.
 * - tools: The node that calls the tools.
 * - END: The end of the graph.
 *
 * These are the only nodes that can be jumped to from other nodes.
 */
type BaseGraphDestination =
  | typeof TOOLS_NODE_NAME
  | typeof AGENT_NODE_NAME
  | typeof END;
```
**File:** libs/langchain/src/agents/ReactAgent.ts (L120-147)
```typescript
/**
 * ReactAgent is a production-ready ReAct (Reasoning + Acting) agent that combines
 * language models with tools and middleware.
 *
 * The agent is parameterized by a single type bag `Types` that encapsulates all
 * type information:
 *
 * @typeParam Types - An {@link AgentTypeConfig} that bundles:
 *   - `Response`: The structured response type
 *   - `State`: The custom state schema type
 *   - `Context`: The context schema type
 *   - `Middleware`: The middleware array type
 *   - `Tools`: The combined tools type from agent and middleware
 *
 * @example
 * ```typescript
 * // Using the type bag pattern
 * type MyTypes = AgentTypeConfig<
 *   { name: string },  // Response
 *   typeof myState,    // State
 *   typeof myContext,  // Context
 *   typeof middleware, // Middleware
 *   typeof tools       // Tools
 * >;
 *
 * const agent: ReactAgent<MyTypes> = createAgent({ ... });
 * ```
 */
```
**File:** libs/langchain/src/agents/ReactAgent.ts (L282-368)
```typescript
    for (let i = 0; i < middleware.length; i++) {
      let beforeAgentNode: BeforeAgentNode | undefined;
      let beforeModelNode: BeforeModelNode | undefined;
      let afterModelNode: AfterModelNode | undefined;
      let afterAgentNode: AfterAgentNode | undefined;
      const m = middleware[i];
      if (middlewareNames.has(m.name)) {
        throw new Error(`Middleware ${m.name} is defined multiple times`);
      }

      middlewareNames.add(m.name);
      if (m.beforeAgent) {
        beforeAgentNode = new BeforeAgentNode(m, {
          getState: () => this.#stateManager.getState(m.name),
        });
        this.#stateManager.addNode(m, beforeAgentNode);
        const name = `${m.name}.before_agent`;
        beforeAgentNodes.push({
          index: i,
          name,
          allowed: getHookConstraint(m.beforeAgent),
        });
        allNodeWorkflows.addNode(
          name,
          beforeAgentNode,
          beforeAgentNode.nodeOptions
        );
      }
      if (m.beforeModel) {
        beforeModelNode = new BeforeModelNode(m, {
          getState: () => this.#stateManager.getState(m.name),
        });
        this.#stateManager.addNode(m, beforeModelNode);
        const name = `${m.name}.before_model`;
        beforeModelNodes.push({
          index: i,
          name,
          allowed: getHookConstraint(m.beforeModel),
        });
        allNodeWorkflows.addNode(
          name,
          beforeModelNode,
          beforeModelNode.nodeOptions
        );
      }
      if (m.afterModel) {
        afterModelNode = new AfterModelNode(m, {
          getState: () => this.#stateManager.getState(m.name),
        });
        this.#stateManager.addNode(m, afterModelNode);
        const name = `${m.name}.after_model`;
        afterModelNodes.push({
          index: i,
          name,
          allowed: getHookConstraint(m.afterModel),
        });
        allNodeWorkflows.addNode(
          name,
          afterModelNode,
          afterModelNode.nodeOptions
        );
      }
      if (m.afterAgent) {
        afterAgentNode = new AfterAgentNode(m, {
          getState: () => this.#stateManager.getState(m.name),
        });
        this.#stateManager.addNode(m, afterAgentNode);
        const name = `${m.name}.after_agent`;
        afterAgentNodes.push({
          index: i,
          name,
          allowed: getHookConstraint(m.afterAgent),
        });
        allNodeWorkflows.addNode(
          name,
          afterAgentNode,
          afterAgentNode.nodeOptions
        );
      }

      if (m.wrapModelCall) {
        wrapModelCallHookMiddleware.push([
          m,
          () => this.#stateManager.getState(m.name),
        ]);
      }
    }
```
**File:** libs/langchain/src/agents/ReactAgent.ts (L396-477)
```typescript
     * Add Edges
     */
    // Determine the entry node (runs once at start): before_agent -> before_model -> model_request
    let entryNode: string;
    if (beforeAgentNodes.length > 0) {
      entryNode = beforeAgentNodes[0].name;
    } else if (beforeModelNodes.length > 0) {
      entryNode = beforeModelNodes[0].name;
    } else {
      entryNode = AGENT_NODE_NAME;
    }

    // Determine the loop entry node (beginning of agent loop, excludes before_agent)
    // This is where tools will loop back to for the next iteration
    const loopEntryNode =
      beforeModelNodes.length > 0 ? beforeModelNodes[0].name : AGENT_NODE_NAME;

    // Determine the exit node (runs once at end): after_agent or END
    const exitNode =
      afterAgentNodes.length > 0
        ? afterAgentNodes[afterAgentNodes.length - 1].name
        : END;

    allNodeWorkflows.addEdge(START, entryNode);

    /**
     * Determine if we have tools available for routing.
     * This includes both registered client tools AND dynamic tools via middleware.
     */
    const hasToolsAvailable =
      clientTools.length > 0 || hasWrapToolCallMiddleware;

    // Connect beforeAgent nodes (run once at start)
    for (let i = 0; i < beforeAgentNodes.length; i++) {
      const node = beforeAgentNodes[i];
      const current = node.name;
      const isLast = i === beforeAgentNodes.length - 1;
      const nextDefault = isLast ? loopEntryNode : beforeAgentNodes[i + 1].name;

      if (node.allowed && node.allowed.length > 0) {
        const allowedMapped = node.allowed
          .map((t) => parseJumpToTarget(t))
          .filter((dest) => dest !== TOOLS_NODE_NAME || hasToolsAvailable);
        // Replace END with exitNode (which could be an afterAgent node)
        const destinations = Array.from(
          new Set([
            nextDefault,
            ...allowedMapped.map((dest) => (dest === END ? exitNode : dest)),
          ])
        ) as BaseGraphDestination[];

        allNodeWorkflows.addConditionalEdges(
          current,
          this.#createBeforeAgentRouter(
            clientTools,
            nextDefault,
            exitNode,
            hasToolsAvailable
          ),
          destinations
        );
      } else {
        allNodeWorkflows.addEdge(current, nextDefault);
      }
    }

    // Connect beforeModel nodes; add conditional routing ONLY if allowed jumps are specified
    for (let i = 0; i < beforeModelNodes.length; i++) {
      const node = beforeModelNodes[i];
      const current = node.name;
      const isLast = i === beforeModelNodes.length - 1;
      const nextDefault = isLast
        ? AGENT_NODE_NAME
        : beforeModelNodes[i + 1].name;

      if (node.allowed && node.allowed.length > 0) {
        const allowedMapped = node.allowed
          .map((t) => parseJumpToTarget(t))
          .filter((dest) => dest !== TOOLS_NODE_NAME || hasToolsAvailable);
        const destinations = Array.from(
          new Set([nextDefault, ...allowedMapped])
        ) as BaseGraphDestination[];
```
**File:** libs/langchain/src/agents/ReactAgent.ts (L736-787)
```typescript
   */
  #createModelRouter(exitNode: string | typeof END = END) {
    /**
     * determine if the agent should continue or not
     */
    return (state: Record<string, unknown>) => {
      const builtInState = state as unknown as BuiltInState;
      const messages = builtInState.messages;
      const lastMessage = messages.at(-1);

      if (
        !AIMessage.isInstance(lastMessage) ||
        !lastMessage.tool_calls ||
        lastMessage.tool_calls.length === 0
      ) {
        return exitNode;
      }

      // Check if all tool calls are for structured response extraction
      const hasOnlyStructuredResponseCalls = lastMessage.tool_calls.every(
        (toolCall) => toolCall.name.startsWith("extract-")
      );

      if (hasOnlyStructuredResponseCalls) {
        // If all tool calls are for structured response extraction, go to exit node
        // The AgentNode will handle these internally and return the structured response
        return exitNode;
      }

      /**
       * The tool node processes a single message.
       */
      if (this.#toolBehaviorVersion === "v1") {
        return TOOLS_NODE_NAME;
      }

      /**
       * Route to tools node (filter out any structured response tool calls)
       */
      const regularToolCalls = lastMessage.tool_calls.filter(
        (toolCall) => !toolCall.name.startsWith("extract-")
      );

      if (regularToolCalls.length === 0) {
        return exitNode;
      }

      return regularToolCalls.map(
        (toolCall) =>
          new Send(TOOLS_NODE_NAME, { ...state, lg_tool_call: toolCall })
      );
    };
```
**File:** libs/langchain/src/agents/ReactAgent.ts (L805-843)
```typescript
  #createAfterModelRouter(
    toolClasses: (ClientTool | ServerTool)[],
    allowJump: boolean,
    exitNode: string | typeof END,
    hasToolsAvailable: boolean = toolClasses.length > 0
  ) {
    const hasStructuredResponse = Boolean(this.options.responseFormat);

    return (state: Record<string, unknown>) => {
      const builtInState = state as unknown as Omit<BuiltInState, "jumpTo"> & {
        jumpTo?: JumpTo;
      };
      // First, check if we just processed a structured response
      // If so, ignore any existing jumpTo and go to exitNode
      const messages = builtInState.messages;
      const lastMessage = messages.at(-1);
      if (
        AIMessage.isInstance(lastMessage) &&
        (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0)
      ) {
        return exitNode;
      }

      // Check if jumpTo is set in the state and allowed
      if (allowJump && builtInState.jumpTo) {
        const destination = parseJumpToTarget(builtInState.jumpTo);
        if (destination === END) {
          return exitNode;
        }
        if (destination === TOOLS_NODE_NAME) {
          // If trying to jump to tools but no tools are available, go to exitNode
          if (!hasToolsAvailable) {
            return exitNode;
          }
          return new Send(TOOLS_NODE_NAME, { ...state, jumpTo: undefined });
        }
        // destination === "model_request"
        return new Send(AGENT_NODE_NAME, { ...state, jumpTo: undefined });
      }
```
**File:** libs/langchain/src/agents/ReactAgent.ts (L1076-1125)
```typescript
   *   tools: [calculator, webSearch],
   *   responseFormat: z.object({
   *     weather: z.string(),
   *   }),
   * });
   *
   * const result = await agent.invoke({
   *   messages: [{ role: "human", content: "What's the weather in Paris?" }]
   * });
   *
   * console.log(result.structuredResponse.weather); // outputs: "It's sunny and 75°F."
   * ```
   */
  async invoke(
    state: InvokeStateParameter<Types>,
    config?: InvokeConfiguration<
      InferContextInput<
        Types["Context"] extends AnyAnnotationRoot | InteropZodObject
          ? Types["Context"]
          : AnyAnnotationRoot
      > &
        InferMiddlewareContextInputs<Types["Middleware"]>
    >
  ) {
    type FullState = MergedAgentState<Types>;
    const initializedState = await this.#initializeMiddlewareStates(
      state,
      config as RunnableConfig
    );

    return this.#graph.invoke(
      initializedState,
      config as unknown as InferContextInput<
        Types["Context"] extends AnyAnnotationRoot | InteropZodObject
          ? Types["Context"]
          : AnyAnnotationRoot
      > &
        InferMiddlewareContextInputs<Types["Middleware"]>
    ) as Promise<FullState>;
  }

  /**
   * Executes the agent with streaming, returning an async iterable of state updates as they occur.
   *
   * This method runs the agent's workflow similar to `invoke`, but instead of waiting for
   * completion, it streams high-level state updates in real-time. This allows you to:
   * - Display intermediate results to users as they're generated
   * - Monitor the agent's progress through each step
   * - React to state changes as nodes complete
   *
```
**File:** libs/langchain/src/agents/index.ts (L26-103)
```typescript
/**
 * Creates a production-ready ReAct (Reasoning + Acting) agent that combines language models with tools
 * and middleware to create systems that can reason about tasks, decide which tools to use, and iteratively
 * work towards solutions.
 *
 * The agent follows the ReAct pattern, interleaving reasoning steps with tool calls to iteratively
 * work towards solutions. It can handle multiple tool calls in sequence or parallel, maintain state
 * across interactions, and provide auditable decision processes.
 *
 * ## Core Components
 *
 * ### Model
 * The reasoning engine can be specified as:
 * - **String identifier**: `"openai:gpt-4o"` for simple setup
 * - **Model instance**: Configured model object for full control
 * - **Dynamic function**: Select models at runtime based on state
 *
 * ### Tools
 * Tools give agents the ability to take actions:
 * - Pass an array of tools created with the `tool` function
 * - Or provide a configured `ToolNode` for custom error handling
 *
 * ### Prompt
 * Shape how your agent approaches tasks:
 * - String for simple instructions
 * - SystemMessage for structured prompts
 * - Function for dynamic prompts based on state
 *
 * ### Middleware
 * Middleware allows you to extend the agent's behavior:
 * - Add pre/post-model processing for context injection or validation
 * - Add dynamic control flows, e.g. terminate invocation or retries
 * - Add human-in-the-loop capabilities
 * - Add tool calls to the agent
 * - Add tool results to the agent
 *
 * ## Advanced Features
 *
 * - **Structured Output**: Use `responseFormat` with a Zod schema to get typed responses
 * - **Memory**: Extend the state schema to remember information across interactions
 * - **Streaming**: Get real-time updates as the agent processes
 *
 * @param options - Configuration options for the agent
 * @param options.llm - The language model as an instance of a chat model
 * @param options.model - The language model as a string identifier, see more in {@link https://docs.langchain.com/oss/javascript/langchain/models#basic-usage | Models}.
 * @param options.tools - Array of tools or configured ToolNode
 * @param options.prompt - System instructions (string, SystemMessage, or function)
 * @param options.responseFormat - Zod schema for structured output
 * @param options.stateSchema - Custom state schema for memory
 * @param options.middleware - Array of middleware for extending agent behavior, see more in {@link https://docs.langchain.com/oss/javascript/langchain/middleware | Middleware}.
 *
 * @returns A ReactAgent instance with `invoke` and `stream` methods
 *
 * @example Basic agent with tools
 * ```ts
 * import { createAgent, tool } from "langchain";
 * import { z } from "zod";
 *
 * const search = tool(
 *   ({ query }) => `Results for: ${query}`,
 *   {
 *     name: "search",
 *     description: "Search for information",
 *     schema: z.object({
 *       query: z.string().describe("The search query"),
 *     })
 *   }
 * );
 *
 * const agent = createAgent({
 *   llm: "openai:gpt-4o",
 *   tools: [search],
 * });
 *
 * const result = await agent.invoke({
 *   messages: [{ role: "user", content: "Search for ReAct agents" }],
 * });
 * ```
```
**File:** libs/langchain/src/agents/nodes/AgentNode.ts (L80-150)
```typescript
/**
 * The name of the agent node in the state graph.
 */
export const AGENT_NODE_NAME = "model_request";

export interface AgentNodeOptions<
  StructuredResponseFormat extends Record<string, unknown> = Record<
    string,
    unknown
  >,
  StateSchema extends AnyAnnotationRoot | InteropZodObject = AnyAnnotationRoot,
  ContextSchema extends
    | AnyAnnotationRoot
    | InteropZodObject = AnyAnnotationRoot,
> extends Pick<
    CreateAgentParams<StructuredResponseFormat, StateSchema, ContextSchema>,
    "model" | "includeAgentName" | "name" | "responseFormat" | "middleware"
  > {
  toolClasses: (ClientTool | ServerTool)[];
  shouldReturnDirect: Set<string>;
  signal?: AbortSignal;
  systemMessage: SystemMessage;
  wrapModelCallHookMiddleware?: [
    AgentMiddleware,
    () => Record<string, unknown>,
  ][];
}

interface NativeResponseFormat {
  type: "native";
  strategy: ProviderStrategy;
}

interface ToolResponseFormat {
  type: "tool";
  tools: Record<string, ToolStrategy>;
}

type ResponseFormat = NativeResponseFormat | ToolResponseFormat;

export class AgentNode<
  StructuredResponseFormat extends Record<string, unknown> = Record<
    string,
    unknown
  >,
  ContextSchema extends
    | AnyAnnotationRoot
    | InteropZodObject = AnyAnnotationRoot,
> extends RunnableCallable<
  InternalAgentState<StructuredResponseFormat>,
  | (
      | { messages: BaseMessage[] }
      | { structuredResponse: StructuredResponseFormat }
    )
  | Command
> {
  #options: AgentNodeOptions<StructuredResponseFormat, ContextSchema>;
  #systemMessage: SystemMessage;
  #currentSystemMessage: SystemMessage;

  constructor(
    options: AgentNodeOptions<StructuredResponseFormat, ContextSchema>
  ) {
    super({
      name: options.name ?? "model",
      func: (input, config) => this.#run(input, config as RunnableConfig),
    });

    this.#options = options;
    this.#systemMessage = options.systemMessage;
  }
```
**File:** libs/langchain/src/agents/nodes/AgentNode.ts (L387-569)
```typescript
    const wrapperMiddleware = this.#options.wrapModelCallHookMiddleware ?? [];
    let wrappedHandler: (
      request: ModelRequest<
        InternalAgentState<StructuredResponseFormat>,
        unknown
      >
    ) => Promise<InternalModelResponse<StructuredResponseFormat>> = baseHandler;

    /**
     * Build composed handler from last to first so first middleware becomes outermost
     */
    for (let i = wrapperMiddleware.length - 1; i >= 0; i--) {
      const [middleware, getMiddlewareState] = wrapperMiddleware[i];
      if (middleware.wrapModelCall) {
        const innerHandler = wrappedHandler;
        const currentMiddleware = middleware;
        const currentGetState = getMiddlewareState;

        wrappedHandler = async (
          request: ModelRequest<
            InternalAgentState<StructuredResponseFormat>,
            unknown
          >
        ): Promise<InternalModelResponse<StructuredResponseFormat>> => {
          /**
           * Merge context with default context of middleware
           */
          const context = currentMiddleware.contextSchema
            ? interopParse(
                currentMiddleware.contextSchema,
                lgConfig?.context || {}
              )
            : lgConfig?.context;

          /**
           * Create runtime
           */
          const runtime: Runtime<unknown> = Object.freeze({
            context,
            writer: lgConfig.writer,
            interrupt: lgConfig.interrupt,
            signal: lgConfig.signal,
          });

          /**
           * Create the request with state and runtime
           */
          const requestWithStateAndRuntime: ModelRequest<
            InternalAgentState<StructuredResponseFormat>,
            unknown
          > = {
            ...request,
            state: {
              ...(middleware.stateSchema
                ? interopParse(
                    toPartialZodObject(middleware.stateSchema),
                    state
                  )
                : {}),
              ...currentGetState(),
              messages: state.messages,
            } as InternalAgentState<StructuredResponseFormat>,
            runtime,
          };

          /**
           * Create handler that validates tools and calls the inner handler
           */
          const handlerWithValidation = async (
            req: ModelRequest<
              InternalAgentState<StructuredResponseFormat>,
              unknown
            >
          ): Promise<InternalModelResponse<StructuredResponseFormat>> => {
            /**
             * Verify that the user didn't add any new tools.
             * We can't allow this as the ToolNode is already initiated with given tools.
             */
            const modifiedTools = req.tools ?? [];
            const newTools = modifiedTools.filter(
              (tool) =>
                isClientTool(tool) &&
                !this.#options.toolClasses.some((t) => t.name === tool.name)
            );
            if (newTools.length > 0) {
              throw new Error(
                `You have added a new tool in "wrapModelCall" hook of middleware "${
                  currentMiddleware.name
                }": ${newTools
                  .map((tool) => tool.name)
                  .join(", ")}. This is not supported.`
              );
            }

            /**
             * Verify that user has not added or modified a tool with the same name.
             * We can't allow this as the ToolNode is already initiated with given tools.
             */
            const invalidTools = modifiedTools.filter(
              (tool) =>
                isClientTool(tool) &&
                this.#options.toolClasses.every((t) => t !== tool)
            );
            if (invalidTools.length > 0) {
              throw new Error(
                `You have modified a tool in "wrapModelCall" hook of middleware "${
                  currentMiddleware.name
                }": ${invalidTools
                  .map((tool) => tool.name)
                  .join(", ")}. This is not supported.`
              );
            }

            let normalizedReq = req;
            const hasSystemPromptChanged =
              req.systemPrompt !== this.#currentSystemMessage.text;
            const hasSystemMessageChanged =
              req.systemMessage !== this.#currentSystemMessage;
            if (hasSystemPromptChanged && hasSystemMessageChanged) {
              throw new Error(
                "Cannot change both systemPrompt and systemMessage in the same request."
              );
            }

            /**
             * Check if systemPrompt is a string was changed, if so create a new SystemMessage
             */
            if (hasSystemPromptChanged) {
              this.#currentSystemMessage = new SystemMessage({
                content: [{ type: "text", text: req.systemPrompt }],
              });
              normalizedReq = {
                ...req,
                systemPrompt: this.#currentSystemMessage.text,
                systemMessage: this.#currentSystemMessage,
              };
            }
            /**
             * If the systemMessage was changed, update the current system message
             */
            if (hasSystemMessageChanged) {
              this.#currentSystemMessage = new SystemMessage({
                ...req.systemMessage,
              });
              normalizedReq = {
                ...req,
                systemPrompt: this.#currentSystemMessage.text,
                systemMessage: this.#currentSystemMessage,
              };
            }

            return innerHandler(normalizedReq);
          };

          // Call middleware's wrapModelCall with the validation handler
          if (!currentMiddleware.wrapModelCall) {
            return handlerWithValidation(requestWithStateAndRuntime);
          }

          try {
            const middlewareResponse = await currentMiddleware.wrapModelCall(
              requestWithStateAndRuntime,
              handlerWithValidation as WrapModelCallHandler
            );

            /**
             * Validate that this specific middleware returned a valid AIMessage
             */
            if (!isInternalModelResponse(middlewareResponse)) {
              throw new Error(
                `Invalid response from "wrapModelCall" in middleware "${
                  currentMiddleware.name
                }": expected AIMessage, got ${typeof middlewareResponse}`
              );
            }

            return middlewareResponse;
          } catch (error) {
            throw MiddlewareError.wrap(error, currentMiddleware.name);
          }
        };
      }
    }
```
**File:** libs/langchain/src/agents/nodes/ToolNode.ts (L106-135)
```typescript
/**
 * Default error handler for tool errors.
 *
 * This is applied to errors from baseHandler (tool execution).
 * For errors from wrapToolCall middleware, those are handled separately
 * and will bubble up by default.
 *
 * Catches all tool execution errors and converts them to ToolMessage.
 * This allows the LLM to see the error and potentially retry with different arguments.
 */
function defaultHandleToolErrors(
  error: unknown,
  toolCall: ToolCall
): ToolMessage | undefined {
  if (error instanceof ToolInvocationError) {
    return new ToolMessage({
      content: error.message,
      tool_call_id: toolCall.id!,
      name: toolCall.name,
    });
  }
  /**
   * Catch all other tool errors and convert to ToolMessage
   */
  return new ToolMessage({
    content: `${error}\n Please fix your mistakes.`,
    tool_call_id: toolCall.id!,
    name: toolCall.name,
  });
}
```
**File:** libs/langchain/src/agents/nodes/ToolNode.ts (L137-180)
```typescript
/**
 * `ToolNode` is a built-in LangGraph component that handles tool calls within an agent's workflow.
 * It works seamlessly with `createAgent`, offering advanced tool execution control, built
 * in parallelism, and error handling.
 *
 * @example
 * ```ts
 * import { ToolNode, tool, AIMessage } from "langchain";
 * import { z } from "zod/v3";
 *
 * const getWeather = tool((input) => {
 *   if (["sf", "san francisco"].includes(input.location.toLowerCase())) {
 *     return "It's 60 degrees and foggy.";
 *   } else {
 *     return "It's 90 degrees and sunny.";
 *   }
 * }, {
 *   name: "get_weather",
 *   description: "Call to get the current weather.",
 *   schema: z.object({
 *     location: z.string().describe("Location to get the weather for."),
 *   }),
 * });
 *
 * const tools = [getWeather];
 * const toolNode = new ToolNode(tools);
 *
 * const messageWithSingleToolCall = new AIMessage({
 *   content: "",
 *   tool_calls: [
 *     {
 *       name: "get_weather",
 *       args: { location: "sf" },
 *       id: "tool_call_id",
 *       type: "tool_call",
 *     }
 *   ]
 * })
 *
 * await toolNode.invoke({ messages: [messageWithSingleToolCall] });
 * // Returns tool invocation responses as:
 * // { messages: ToolMessage[] }
 * ```
 */
```
**File:** libs/langchain/src/agents/nodes/ToolNode.ts (L290-395)
```typescript
  protected async runTool(
    call: ToolCall,
    config: RunnableConfig,
    state: AgentBuiltInState
  ): Promise<ToolMessage | Command> {
    /**
     * Build runtime from LangGraph config
     */
    const lgConfig = config as LangGraphRunnableConfig;
    const runtime = {
      context: lgConfig?.context,
      writer: lgConfig?.writer,
      interrupt: lgConfig?.interrupt,
      signal: lgConfig?.signal,
    };

    /**
     * Find the tool instance to include in the request.
     * For dynamically registered tools, this may be undefined.
     */
    const registeredTool = this.tools.find((t) => t.name === call.name);

    /**
     * Define the base handler that executes the tool.
     * When wrapToolCall middleware is present, this handler does NOT catch errors
     * so the middleware can handle them.
     * When no middleware, errors are caught and handled here.
     *
     * The handler now accepts an overridden tool from the request, allowing
     * middleware to provide tool implementations for dynamically registered tools.
     */
    const baseHandler = async (
      request: ToolCallRequest
    ): Promise<ToolMessage | Command> => {
      const { toolCall, tool: requestTool } = request;

      /**
       * Use the tool from the request (which may be overridden via spread syntax)
       * or fall back to finding it in registered tools.
       * This allows middleware to provide dynamic tool implementations.
       */
      const tool =
        requestTool ?? this.tools.find((t) => t.name === toolCall.name);

      if (tool === undefined) {
        /**
         * Tool not found - return a graceful error message rather than throwing.
         * This allows the LLM to see the error and potentially retry.
         */
        const availableTools = this.tools.map((t) => t.name);
        return new ToolMessage({
          content: getInvalidToolError(toolCall.name, availableTools),
          tool_call_id: toolCall.id!,
          name: toolCall.name,
          status: "error",
        });
      }

      /**
       * Cast tool to a common invokable type.
       * The tool can be from registered tools (StructuredToolInterface | DynamicTool | RunnableToolLike)
       * or from middleware override (ClientTool | ServerTool).
       */
      const invokableTool = tool as
        | StructuredToolInterface
        | DynamicTool
        | RunnableToolLike;

      try {
        const output = await invokableTool.invoke(
          { ...toolCall, type: "tool_call" },
          {
            ...config,
            /**
             * extend to match ToolRuntime
             */
            config,
            toolCallId: toolCall.id!,
            state: config.configurable?.__pregel_scratchpad?.currentTaskInput,
            signal: mergeAbortSignals(this.signal, config.signal),
          }
        );

        if (ToolMessage.isInstance(output) || isCommand(output)) {
          return output as ToolMessage | Command;
        }

        return new ToolMessage({
          name: invokableTool.name,
          content: typeof output === "string" ? output : JSON.stringify(output),
          tool_call_id: toolCall.id!,
        });
      } catch (e: unknown) {
        /**
         * Handle errors from tool execution (not from wrapToolCall)
         * If tool invocation fails due to input parsing error, throw a {@link ToolInvocationError}
         */
        if (e instanceof ToolInputParsingException) {
          throw new ToolInvocationError(e, toolCall);
        }
        /**
         * Re-throw to be handled by caller
         */
        throw e;
      }
    };
```
**File:** libs/langchain/src/agents/middleware/types.ts (L222-277)
```typescript
/**
 * Handler function type for the beforeAgent hook.
 * Called once at the start of agent invocation before any model calls or tool executions.
 *
 * @param state - The current agent state (includes both middleware state and built-in state)
 * @param runtime - The runtime context containing metadata, signal, writer, interrupt, etc.
 * @returns A middleware result containing partial state updates or undefined to pass through
 */
type BeforeAgentHandler<TSchema, TContext> = (
  state: TSchema,
  runtime: Runtime<TContext>
) => PromiseOrValue<MiddlewareResult<Partial<TSchema>>>;

/**
 * Hook type for the beforeAgent lifecycle event.
 * Can be either a handler function or an object with a handler and optional jump targets.
 * This hook is called once at the start of the agent invocation.
 */
export type BeforeAgentHook<
  TSchema extends StateDefinitionInit | undefined = undefined,
  TContext = unknown,
> =
  | BeforeAgentHandler<NormalizedSchemaInput<TSchema>, TContext>
  | {
      hook: BeforeAgentHandler<NormalizedSchemaInput<TSchema>, TContext>;
      canJumpTo?: JumpToTarget[];
    };

/**
 * Handler function type for the beforeModel hook.
 * Called before the model is invoked and before the wrapModelCall hook.
 *
 * @param state - The current agent state (includes both middleware state and built-in state)
 * @param runtime - The runtime context containing metadata, signal, writer, interrupt, etc.
 * @returns A middleware result containing partial state updates or undefined to pass through
 */
type BeforeModelHandler<TSchema, TContext> = (
  state: TSchema,
  runtime: Runtime<TContext>
) => PromiseOrValue<MiddlewareResult<Partial<TSchema>>>;

/**
 * Hook type for the beforeModel lifecycle event.
 * Can be either a handler function or an object with a handler and optional jump targets.
 * This hook is called before each model invocation.
 */
export type BeforeModelHook<
  TSchema extends StateDefinitionInit | undefined = undefined,
  TContext = unknown,
> =
  | BeforeModelHandler<NormalizedSchemaInput<TSchema>, TContext>
  | {
      hook: BeforeModelHandler<NormalizedSchemaInput<TSchema>, TContext>;
      canJumpTo?: JumpToTarget[];
    };

```
**File:** libs/langchain/src/agents/middleware/types.ts (L417-478)
```typescript
  /**
   * Wraps tool execution with custom logic. This allows you to:
   * - Modify tool call parameters before execution
   * - Handle errors and retry with different parameters
   * - Post-process tool results
   * - Implement caching, logging, authentication, or other cross-cutting concerns
   * - Return Command objects for advanced control flow
   *
   * The handler receives a ToolCallRequest containing the tool call, state, and runtime,
   * along with a handler function to execute the actual tool.
   *
   * @param request - The tool call request containing toolCall, state, and runtime.
   * @param handler - The function that executes the tool. Call this with a ToolCallRequest to get the result.
   * @returns The tool result as a ToolMessage or a Command for advanced control flow.
   *
   * @example
   * ```ts
   * wrapToolCall: async (request, handler) => {
   *   console.log(`Calling tool: ${request.tool.name}`);
   *   console.log(`Tool description: ${request.tool.description}`);
   *
   *   try {
   *     // Execute the tool
   *     const result = await handler(request);
   *     console.log(`Tool ${request.tool.name} succeeded`);
   *     return result;
   *   } catch (error) {
   *     console.error(`Tool ${request.tool.name} failed:`, error);
   *     // Could return a custom error message or retry
   *     throw error;
   *   }
   * }
   * ```
   *
   * @example Authentication
   * ```ts
   * wrapToolCall: async (request, handler) => {
   *   // Check if user is authorized for this tool
   *   if (!request.runtime.context.isAuthorized(request.tool.name)) {
   *     return new ToolMessage({
   *       content: "Unauthorized to call this tool",
   *       tool_call_id: request.toolCall.id,
   *     });
   *   }
   *   return handler(request);
   * }
   * ```
   *
   * @example Caching
   * ```ts
   * const cache = new Map();
   * wrapToolCall: async (request, handler) => {
   *   const cacheKey = `${request.tool.name}:${JSON.stringify(request.toolCall.args)}`;
   *   if (cache.has(cacheKey)) {
   *     return cache.get(cacheKey);
   *   }
   *   const result = await handler(request);
   *   cache.set(cacheKey, result);
   *   return result;
   * }
   * ```
   */
```
**File:** libs/langchain/src/agents/middleware/types.ts (L481-509)
```typescript
  /**
   * Wraps the model invocation with custom logic. This allows you to:
   * - Modify the request before calling the model
   * - Handle errors and retry with different parameters
   * - Post-process the response
   * - Implement custom caching, logging, or other cross-cutting concerns
   *
   * @param request - The model request containing model, messages, systemPrompt, tools, state, and runtime.
   * @param handler - The function that invokes the model. Call this with a ModelRequest to get the response.
   * @returns The response from the model (or a modified version).
   *
   * @example
   * ```ts
   * wrapModelCall: async (request, handler) => {
   *   // Modify request before calling
   *   const modifiedRequest = { ...request, systemPrompt: "You are helpful" };
   *
   *   try {
   *     // Call the model
   *     return await handler(modifiedRequest);
   *   } catch (error) {
   *     // Handle errors and retry with fallback
   *     const fallbackRequest = { ...request, model: fallbackModel };
   *     return await handler(fallbackRequest);
   *   }
   * }
   * ```
   */
  wrapModelCall?: WrapModelCallHook<TSchema, TFullContext>;
```
**File:** libs/langchain/src/agents/middleware.ts (L19-150)
```typescript
/**
 * Creates a middleware instance with automatic schema inference.
 *
 * @param config - Middleware configuration
 * @param config.name - The name of the middleware
 * @param config.stateSchema - The schema of the middleware state
 * @param config.contextSchema - The schema of the middleware context
 * @param config.wrapModelCall - The function to wrap model invocation
 * @param config.wrapToolCall - The function to wrap tool invocation
 * @param config.beforeModel - The function to run before the model call
 * @param config.afterModel - The function to run after the model call
 * @param config.beforeAgent - The function to run before the agent execution starts
 * @param config.afterAgent - The function to run after the agent execution completes
 * @returns A middleware instance
 *
 * @example Using Zod schema
 * ```ts
 * const authMiddleware = createMiddleware({
 *   name: "AuthMiddleware",
 *   stateSchema: z.object({
 *     isAuthenticated: z.boolean().default(false),
 *   }),
 *   contextSchema: z.object({
 *     userId: z.string(),
 *   }),
 *   beforeModel: async (state, runtime, controls) => {
 *     if (!state.isAuthenticated) {
 *       return controls.terminate(new Error("Not authenticated"));
 *     }
 *   },
 * });
 * ```
 *
 * @example Using StateSchema
 * ```ts
 * import { StateSchema, ReducedValue } from "@langchain/langgraph";
 *
 * const historyMiddleware = createMiddleware({
 *   name: "HistoryMiddleware",
 *   stateSchema: new StateSchema({
 *     count: z.number().default(0),
 *     history: new ReducedValue(
 *       z.array(z.string()).default(() => []),
 *       { inputSchema: z.string(), reducer: (current, next) => [...current, next] }
 *     ),
 *   }),
 *   beforeModel: async (state, runtime) => {
 *     return { count: state.count + 1 };
 *   },
 * });
 * ```
 */
export function createMiddleware<
  TSchema extends StateDefinitionInit | undefined = undefined,
  TContextSchema extends InteropZodObject | undefined = undefined,
  const TTools extends readonly (ClientTool | ServerTool)[] = readonly (
    | ClientTool
    | ServerTool
  )[],
>(config: {
  /**
   * The name of the middleware
   */
  name: string;
  /**
   * The schema of the middleware state. Middleware state is persisted between multiple invocations. It can be either:
   * - A Zod object (InteropZodObject)
   * - A StateSchema from LangGraph (supports ReducedValue, UntrackedValue)
   * - An AnnotationRoot
   * - Undefined
   */
  stateSchema?: TSchema;
  /**
   * The schema of the middleware context. Middleware context is read-only and not persisted between multiple invocations. It can be either:
   * - A Zod object
   * - A Zod optional object
   * - A Zod default object
   * - Undefined
   */
  contextSchema?: TContextSchema;
  /**
   * Additional tools registered by the middleware.
   */
  tools?: TTools;
  /**
   * Wraps tool execution with custom logic. This allows you to:
   * - Modify tool call parameters before execution
   * - Handle errors and retry with different parameters
   * - Post-process tool results
   * - Implement caching, logging, authentication, or other cross-cutting concerns
   * - Return Command objects for advanced control flow
   *
   * The handler receives a ToolCallRequest containing the tool call, state, and runtime,
   * along with a handler function to execute the actual tool.
   *
   * @param request - The tool call request containing toolCall, state, and runtime.
   * @param handler - The function that executes the tool. Call this with a ToolCallRequest to get the result.
   * @returns The tool result as a ToolMessage or a Command for advanced control flow.
   *
   * @example
   * ```ts
   * wrapToolCall: async (request, handler) => {
   *   console.log(`Calling tool: ${request.tool.name}`);
   *   console.log(`Tool description: ${request.tool.description}`);
   *
   *   try {
   *     // Execute the tool
   *     const result = await handler(request);
   *     console.log(`Tool ${request.tool.name} succeeded`);
   *     return result;
   *   } catch (error) {
   *     console.error(`Tool ${request.tool.name} failed:`, error);
   *     // Could return a custom error message or retry
   *     throw error;
   *   }
   * }
   * ```
   *
   * @example Authentication
   * ```ts
   * wrapToolCall: async (request, handler) => {
   *   // Check if user is authorized for this tool
   *   if (!request.runtime.context.isAuthorized(request.tool.name)) {
   *     return new ToolMessage({
   *       content: "Unauthorized to call this tool",
   *       tool_call_id: request.toolCall.id,
   *     });
   *   }
   *   return handler(request);
   * }
   * ```
   */
```
**File:** libs/langchain-core/src/callbacks/manager.ts (L442-470)
```typescript
                this.runId,
                this._parentRunId,
                this.tags,
                kwargs
              );
            } catch (err) {
              const logFunction = handler.raiseError
                ? console.error
                : console.warn;
              logFunction(
                `Error in handler ${handler.constructor.name}, handleChainEnd: ${err}`
              );
              if (handler.raiseError) {
                throw err;
              }
            }
          }
        }, handler.awaitHandlers)
      )
    );
  }

  async handleAgentAction(action: AgentAction): Promise<void> {
    await Promise.all(
      this.handlers.map((handler) =>
        consumeCallback(async () => {
          if (!handler.ignoreAgent) {
            try {
              await handler.handleAgentAction?.(
```