# LangChain Agent 子系统代码地图

> 本文档映射 LuminaStudio 中 LangChain Agent 子系统的核心代码模块，帮助快速定位和理解 Agent 架构。
> 详细架构文档：`utility/langchain-client/README.md`
> 核心概念文档：`LuminaStudio/LangChain_Agent_Model_Logic.md`

## 一、架构总览

LangChain Agent 运行在独立的 Electron **Utility Process** 中，与 Main 进程通过 `parentPort.postMessage` / `on('message')` 通信。

### 分层架构

```
┌─ Main 进程 ──────────────────────────────────────────────────┐
│  AiChatService                                                │
│    └─ LangchainClientBridgeService                           │
│         └─ utilityProcess.fork('langchain-client/entry.ts')  │
└──────────────────────────────────────────────────────────────┘
         ▲ postMessage / on('message')
         ▼
┌─ Utility 进程（langchain-client）────────────────────────────┐
│                                                               │
│  entry.ts ─── IPC 消息路由                                    │
│    │                                                          │
│  Manager ─── Agent 池管理 + 中断控制                          │
│    │                                                          │
│  Factory ─── 运行时组装 Agent（LLM + Graph + Tools）          │
│    │                                                          │
│  Models ─── LangGraph 状态机蓝图定义                          │
│    │         └─ knowledge-qa（知识问答图）                     │
│    │                                                          │
│  Nodes ─── 可复用业务节点                                     │
│    │    ├─ structure-planning（规划节点）                      │
│    │    ├─ structure-summary（总结与判断节点）                  │
│    │    ├─ utils-knowledge（知识库检索节点）                   │
│    │    └─ utils-pubmed（PubMed 检索节点）                    │
│    │                                                          │
│  Tools ─── LangChain Tool 包装                                │
│    │    └─ retrieval-tool（知识库检索工具）                    │
│    │                                                          │
│  model-factory.ts ─── ChatModel 工厂（根据 provider 配置     │
│                        创建 ChatOpenAI 实例）                  │
└───────────────────────────────────────────────────────────────┘
```

---

## 二、核心代码模块

> 路径均相对于 `LuminaStudio/src/`

### 2.1 Bridge 层（Main 进程）

| 文件 | 职责 |
|------|------|
| `main/services/langchain-client-bridge/langchain-client-bridge-service.ts` | 管理 Utility 子进程生命周期（fork/kill），转发 Main ↔ Utility 消息，Agent CRUD 和 invoke 代理 |
| `main/services/ai-chat/ai-chat-service.ts` | 调用 bridge 的 `startAgentStream()`，处理 Agent 事件流并转发到 Renderer |

### 2.2 Utility 入口 & Manager

| 文件 | 职责 |
|------|------|
| `utility/langchain-client/entry.ts` | 子进程入口，监听 `parentPort.on('message')`，路由到 Manager |
| `utility/langchain-client/manager/agent-manager.ts` | Agent 池（Map<agentId, Agent>），处理 create/destroy/invoke/abort |
| `utility/langchain-client/manager/types.ts` | Manager 内部类型 |

### 2.3 Factory（运行时组装）

| 文件 | 职责 |
|------|------|
| `utility/langchain-client/factory/agent-factory.ts` | 根据 config 组装完整 Agent：创建 LLM 实例 → 选择 Model(Graph) → 绑定 Tools → 返回可 invoke 的 Agent |

### 2.4 Models（LangGraph 状态机蓝图）

| 文件 | 职责 |
|------|------|
| `utility/langchain-client/models/index.ts` | Model 注册表（modelId → Graph Builder），包含 `default` 和 `knowledge-qa` |
| `utility/langchain-client/models/types.ts` | Model 相关类型（GraphState、ModelDefinition） |
| `utility/langchain-client/models/knowledge-qa/graph.ts` | **knowledge-qa** Graph 定义：规划→检索→总结→循环判断 |
| `utility/langchain-client/models/knowledge-qa/config.ts` | knowledge-qa 的配置 Schema |

> **扩展新 Model**：在 `models/` 下新建目录，定义 Graph，在 `models/index.ts` 注册。

### 2.5 Nodes（可复用业务节点）

| 目录 | NodeKind | 职责 |
|------|----------|------|
| `nodes/structure-planning/` | `planning` / `retrieval_plan` | 规划节点：分析用户问题，生成检索计划（queries + k） |
| `nodes/structure-summary/` | `summary` / `retrieval_summary` | 总结与判断节点：综合检索结果，决定是否回环或输出最终答案 |
| `nodes/utils-knowledge/` | `knowledge_retrieval` | 知识库检索节点：执行向量检索，返回相关文档片段 |
| `nodes/utils-pubmed/` | `pubmed_search` | PubMed 检索节点：调用 PubMed API 搜索学术文献 |
| `nodes/index.ts` | — | 节点注册/导出 |
| `nodes/types.ts` | — | 节点通用类型（NodeContext、NodeResult） |

> **节点命名约定**：`structure-*` 为结构性节点（负责决策/编排），`utils-*` 为工具性节点（执行具体操作）。

> **扩展新 Node**：在 `nodes/` 下新建目录，实现节点函数，导出到 `nodes/index.ts`。还需关联相应的 skill（`structure-utils-node-creator`）。

### 2.6 Tools（LangChain Tool 包装）

| 文件 | 职责 |
|------|------|
| `tools/index.ts` | Tool 注册/创建工厂（根据 config 动态创建 Tool 列表） |
| `tools/retrieval-tool.ts` | `knowledge_search` Tool 实现：调用知识库 API 执行向量检索 |

> **扩展新 Tool**：在 `tools/` 下新建文件，在 `tools/index.ts` 注册。

### 2.7 ChatModel 工厂

| 文件 | 职责 |
|------|------|
| `utility/langchain-client/model-factory.ts` | 根据 provider config（baseUrl、apiKey）创建 `ChatOpenAI` 实例，支持 OpenAI-compatible 协议 |

---

## 三、IPC 消息协议

类型定义：`Public/ShareTypes/langchain-client.types.ts`

### Main → Utility（`MainToLangchainClientMessage`）

| type | 说明 | 关键字段 |
|------|------|----------|
| `process:init` | 初始化子进程（传入 knowledgeApiUrl、langsmith 配置） | `knowledgeApiUrl`, `langsmith?` |
| `process:shutdown` | 关闭子进程 | — |
| `agent:create` | 创建 Agent 实例 | `agentId`, `config: LangchainClientAgentCreateConfig` |
| `agent:destroy` | 销毁 Agent | `agentId` |
| `agent:invoke` | 调用 Agent | `agentId`, `requestId`, `input`, `history?`, `retrieval?` |
| `agent:abort` | 中止调用 | `requestId` |

### Utility → Main（`LangchainClientToMainMessage`）

| type | 说明 | 关键字段 |
|------|------|----------|
| `process:ready` | 子进程就绪 | — |
| `process:error` | 进程级错误 | `message`, `details?` |
| `agent:created` | Agent 创建成功 | `agentId` |
| `agent:create-failed` | 创建失败 | `agentId`, `error` |
| `invoke:start` | 调用开始 | `requestId`, `agentId` |
| `invoke:text-delta` | 流式文本片段 | `requestId`, `delta` |
| `invoke:tool-start` | Tool 开始执行 | `requestId`, `payload: ToolCallPayload` |
| `invoke:tool-result` | Tool 执行结果 | `requestId`, `payload: ToolResultPayload` |
| `invoke:node-start` | Node 开始执行 | `requestId`, `payload: NodeStartPayload` |
| `invoke:node-result` | Node 执行结果 | `requestId`, `payload: NodeResultPayload` |
| `invoke:node-error` | Node 执行错误 | `requestId`, `payload: NodeErrorPayload` |
| `invoke:step-complete` | Graph 步骤完成 | `requestId`, `stepIndex`, `nodeNames?` |
| `invoke:finish` | 调用完成 | `requestId`, `finishReason`, `fullText` |
| `invoke:error` | 调用级错误 | `requestId`, `message`, `stack?` |

---

## 四、Block 消息架构

Agent 模式的消息通过 **Block** 结构组织，存储在 `messages.content_json` 中。

### Block 类型

| Block 类型 | 说明 | 前端渲染组件 |
|------------|------|-------------|
| `TextBlock` | 纯文本（流式 delta 拼接） | `MessageComponents-Text.vue` |
| `ThinkingBlock` | 思维链（thinking steps） | `MessageComponents-Thinking.vue` |
| `ToolBlock` | 工具调用 & 结果 | `MessageComponents-ToolCall.vue` |
| `NodeBlock` | 语义节点（含 nodeKind + uiHint） | 根据 nodeKind 路由到对应组件 |
| `MetaBlock` | 元信息（usage 统计等） | `MessageComponents-Usage.vue` |

### NodeKind → 渲染组件映射

| NodeKind | 渲染组件 | 说明 |
|----------|---------|------|
| `knowledge_retrieval` | `MessageComponents-KnowledgeSearch.vue` | 知识库检索结果（含详情弹窗 `MessageComponents-KnowledgeSearch-DetailDialog.vue`） |
| `pubmed_search` | `MessageComponents-PubmedSearch.vue` | PubMed 搜索结果 |
| `retrieval_plan` / `planning` | `MessageComponents-RetrievalPlan.vue` | 检索规划展示 |
| `retrieval_summary` / `summary` | `MessageComponents-RetrievalSummary.vue` | 检索总结展示 |
| `tool` | `MessageComponents-ToolCall.vue` | 通用工具调用 |
| `final_answer` | `MessageComponents-Text.vue` | 最终答案（复用文本组件） |

### 渲染组件位置

```
renderer/src/views/LuminaApp/Maincontent/NormalChat/
  NormalChat-Maincontent/ChatMain-Message/
    index.vue                                    ← 消息列表主组件（Block 路由）
    MessageComponents-Text.vue                   ← 文本 Block
    MessageComponents-Thinking.vue               ← 思维链 Block
    MessageComponents-ToolCall.vue               ← 工具调用 Block
    MessageComponents-KnowledgeSearch.vue         ← 知识库检索 Block
    MessageComponents-KnowledgeSearch-DetailDialog.vue ← 检索详情弹窗
    MessageComponents-PubmedSearch.vue            ← PubMed 搜索 Block
    MessageComponents-RetrievalPlan.vue           ← 检索规划 Block
    MessageComponents-RetrievalSummary.vue        ← 检索总结 Block
    MessageComponents-ActionButtons.vue           ← 消息操作按钮
    MessageComponents-Usage.vue                   ← Token 使用统计
    MessageComponents-Test.vue                    ← 测试组件
```

---

## 五、AiChatService 双模式架构

`main/services/ai-chat/ai-chat-service.ts` 是 AI 对话的核心 Service，支持两种模式：

### Normal 模式（Vercel AI SDK）

```
startStream() {
  1. 获取 provider 配置 → buildModel()（创建 Vercel AI SDK provider）
  2. 构建消息上下文 → buildMessages()（系统 prompt + 历史 + 用户输入）
  3. streamText()（Vercel AI SDK 流式生成）
  4. 监听 stream 事件 → event.sender.send() → Renderer
  5. 持久化消息到 SQLite
}
```

### Agent 模式（LangChain）

```
startAgentStream() {
  1. 获取 provider 配置
  2. langchainClientBridge.createAgent()（创建 Agent 实例）
  3. langchainClientBridge.invokeAgent()（触发 Agent 调用）
  4. 监听 bridge 事件流（text-delta / node-start / node-result / tool-* / finish）
  5. 转换为 Renderer 事件 → event.sender.send()
  6. 持久化消息（text + reasoning + content_json）
}
```

### 模式切换

由 Renderer 端 `useAiChatStore` 中的 `agentMode` 标志控制，通过 IPC 传递到 `AiChatService`。

---

## 六、Devin 查询词指引

以下查询词可用于 Devin 私有仓库（`zhaowendao2005/HNULS-LuminaStudio`）深度搜索：

| 场景 | 推荐查询词 |
|------|-----------|
| Agent 创建流程 | "How does the agent creation flow work from AiChatService through LangchainClientBridge to the Utility process?" |
| LangGraph 状态机 | "How is the knowledge-qa LangGraph state machine defined and what are its nodes and edges?" |
| Node 扩展 | "How to add a new node to the LangChain Agent system? What files need to be modified?" |
| Tool 扩展 | "How to add a new tool to the LangChain Agent? Show the registration and implementation pattern." |
| Block 消息解析 | "How are Block messages (TextBlock, NodeBlock, ToolBlock) parsed and rendered in the frontend?" |
| 流式通信 | "How does the streaming communication work between Main process and Utility process for Agent mode?" |
| 消息持久化 | "How are AI chat messages persisted to SQLite, especially the content_json field for agent mode?" |
| Model Config | "How does ModelConfigService manage providers and models, and how is the config passed to the Agent?" |
| 知识库检索 | "How does the knowledge retrieval work in LuminaStudio, from the KnowledgeDatabaseBridge to the retrieval tool?" |

---

## 七、相关 Skill

以下 Skill 与 Agent 子系统紧密相关，涉及具体扩展操作时应参考：

| Skill | 用途 |
|-------|------|
| `model-graph-creator` | 创建/编辑 LangGraph Model（Graph 蓝图） |
| `structure-utils-node-creator` | 创建新的 Structure/Utils Node |
| `message-components-creator` | 创建/重构消息渲染组件（MessageComponents-*） |
