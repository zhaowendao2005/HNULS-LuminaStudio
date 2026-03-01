# 信息渠道与目录结构

## 渠道 1：关键代码入口

> 路径均相对于 `LuminaStudio/src/`

### 应用入口 & 生命周期

| 文件 | 说明 |
|------|------|
| `main/index.ts` | Electron 主入口：初始化所有 Service & IPC Handler，创建窗口，管理 app 生命周期 |

> 注意：LuminaStudio **没有独立的 AppService**，所有服务实例化和注入都在 `main/index.ts` 的 `app.whenReady()` 中完成。

### 主进程 Services（`main/services/`）

| 目录 | 说明 |
|------|------|
| `database-sqlite/` | DatabaseManager — 管理多个 SQLite 数据库实例（BaseConfig + userdata），Schema 注册/初始化/版本校验 |
| `ai-chat/` | AiChatService — **核心**，AI 对话流式处理（Normal + Agent 两种模式），消息持久化，对话/预设管理 |
| `model-config/` | ModelConfigService — 模型提供商 & 模型配置 CRUD |
| `langchain-client-bridge/` | LangchainClientBridgeService — Main ↔ Utility(langchain-client) 的桥接层，管理子进程生命周期和 IPC 消息转发 |
| `knowledge-database-bridge/` | KnowledgeDatabaseBridgeService — 与外部 KnowledgeDatabase 应用的桥接（知识库列表/检索） |
| `rerank-model/` | RerankModelService — Rerank 模型管理 |
| `user-settings/` | UserSettingsService — 用户设置持久化（LangSmith 配置等） |
| `logger/` | 日志服务（electron-log），提供 scope 日志器 |
| `base-service/` | 基础服务（window-service、sqlite-test-service） |

### 主进程 IPC Handlers（`main/ipc/`）

| 文件 | 说明 |
|------|------|
| `index.ts` | 注册所有基础 IPC Handler（window、base） |
| `ai-chat-handler.ts` | AI 对话相关 IPC（流式开始/中止、对话 CRUD、消息查询） |
| `model-config-handler.ts` | 模型配置 CRUD IPC |
| `knowledge-database-handler.ts` | 知识库桥接 IPC（列表/检索/配置） |
| `rerank-model-handler.ts` | Rerank 模型 IPC |
| `user-settings-handler.ts` | 用户设置 IPC |
| `window-handler.ts` | 窗口操作 IPC |
| `base-handler.ts` | 基础操作 IPC（文件选择、路径查询等） |

### Preload 桥接层（`preload/`）

| 目录/文件 | 说明 |
|-----------|------|
| `types/` | **跨进程类型的唯一权威来源**（按业务域拆分：`ai-chat.types.ts`、`model-config.types.ts` 等） |
| `api/` | Preload API 实现（按业务域拆分：`ai-chat-api.ts`、`model-config-api.ts` 等） |
| `bridge/` | contextBridge 聚合暴露 |
| `index.ts` | Preload 入口 |
| `index.d.ts` | 类型声明自动导出 |

### 渲染进程（`renderer/src/`）

| 目录 | 说明 |
|------|------|
| `stores/ai-chat/` | AI 对话状态管理（Pinia）— 含 `chat-message/`（消息 store + Block 解析）、`sources.store.ts`（知识来源面板）、`LangchainAgent-Config/`（Agent 配置） |
| `stores/model-config/` | 模型配置 store |
| `stores/rerank-model/` | Rerank 模型 store |
| `stores/user-config/` | 用户配置 store |
| `views/LuminaApp/` | 页面视图根目录 |
| `views/LuminaApp/Maincontent/NormalChat/` | 聊天主界面（含消息列表、输入栏、配置面板） |
| `views/LuminaApp/Maincontent/DashboardView/` | 仪表盘 |
| `views/LuminaApp/Maincontent/UserSettingView/` | 用户设置页 |
| `views/LuminaApp/Sidebar/` | 侧边栏 |
| `views/LuminaApp/TopBar/` | 顶栏 |
| `views/LuminaApp/WelcomeScreen/` | 欢迎页 |
| `components/` | 全局公共组件 |

### Utility 子进程（`utility/`）

| 目录 | 说明 |
|------|------|
| `langchain-client/` | LangChain Agent 子进程 — 含 Manager/Factory/Models/Nodes/Tools 分层架构 |
| `langchain-client/entry.ts` | 子进程入口（IPC 消息路由） |
| `langchain-client/manager/` | Agent 池管理、中断控制 |
| `langchain-client/factory/` | 运行时 Agent 组装 |
| `langchain-client/models/` | LangGraph 状态机蓝图（如 `knowledge-qa/`） |
| `langchain-client/nodes/` | 可复用业务节点（planning、summary、knowledge、pubmed） |
| `langchain-client/tools/` | LangChain Tool 包装（retrieval-tool） |
| `langchain-client/model-factory.ts` | ChatModel 工厂（根据 provider 创建 LLM 实例） |

### 公共共享（`Public/`）

| 目录 | 说明 |
|------|------|
| `ShareTypes/` | Main ↔ Utility 跨进程 IPC 消息协议类型（`langchain-client.types.ts`） |
| `Prompt/` | 共享 Prompt 模板 |

---

## 渠道 2：README 文档

> 这些 README 由开发者维护，是了解各模块职责的快速入口。注意可能略滞后于最新代码。

| 路径（相对 `LuminaStudio/src/`） | 内容 |
|----------------------------------|------|
| `main/README.md` | 主进程架构、目录职责、开发规范 |
| `main/services/README.md` | Services 层设计原则 |
| `main/ipc/README.md` | IPC Handler 层设计原则 |
| `preload/README.md` | Preload 桥接层架构、API/Bridge/Types 职责 |
| `preload/api/README.md` | API 层实现规范 |
| `preload/types/README.md` | 类型定义规范 |
| `renderer/README.md` | 渲染进程架构、组件分类、状态管理 |
| `renderer/src/stores/README.md` | Pinia Store 设计原则 |
| `renderer/src/views/README.md` | Views 组织原则 |
| `utility/README.md` | Utility 子进程架构、通信规范 |
| `utility/langchain-client/README.md` | **重要** — LangChain Agent Factory 完整架构文档 |

项目根目录还有：
- `LangChain_Agent_Model_Logic.md` — LangChain Agent 核心概念与完整工作流

---

## 渠道 3：Devin 私有仓库查询

仓库：`zhaowendao2005/HNULS-LuminaStudio`

```
使用方式：mcp3_ask_question(repoName="zhaowendao2005/HNULS-LuminaStudio", question="...")
```

适用场景：
- 跨模块全局搜索
- 查询代码变更历史
- 理解复杂业务流程

> ⚠️ 仓库索引可能有延迟（提交后需要一段时间才能更新），遇到查询结果与本地代码不一致时，以本地源码为准。

---

## 渠道 4：DeepWiki 公共仓库查询

| 仓库 | 用途 | 查询方式 |
|------|------|----------|
| `vercel/ai` | Vercel AI SDK（streamText、tool calling、provider 配置） | `mcp2_ask_question` |
| `langchain-ai/langchainjs` | LangChain JS（ChatModel、Tool、LangGraph 状态机） | `mcp2_ask_question` |
| `sqlite/sqlite` | SQLite 语法参考 | `mcp2_ask_question` |

---

## 技术栈

| 技术 | 版本/说明 | 用途 |
|------|-----------|------|
| Electron | electron-vite 构建 | 桌面应用框架 |
| Vue 3 | Composition API + TypeScript | 渲染进程 UI |
| Pinia | 状态管理 | SSOT 数据状态 |
| better-sqlite3 | 同步 SQLite | 本地数据持久化（BaseConfig + userdata） |
| Vercel AI SDK (`ai` + `@ai-sdk/openai-compatible`) | 流式文本生成 | Normal 模式 AI 对话 |
| LangChain + LangGraph (`langchain` + `@langchain/*`) | Agent 框架 | Agent 模式多步推理 |
| Tailwind CSS v4 | 原子化样式 | UI 样式 |
| markdown-it | Markdown 渲染 | 消息内容渲染 |
| Zod | Schema 校验 | 结构化输出、参数验证 |
| electron-log | 日志 | 主进程日志系统 |

---

## IPC 通信架构

### 通信路径总览

```
┌─────────────┐    contextBridge     ┌──────────┐    ipcMain.handle    ┌──────────────┐
│  Renderer    │ ◄──────────────────► │ Preload  │ ◄────────────────► │    Main       │
│  (Vue/Pinia) │    window.api.*     │  (API)   │   ipcRenderer.*    │  (Services)   │
└─────────────┘                      └──────────┘                     └──────┬───────┘
                                                                             │
                                                              utilityProcess.fork()
                                                              parentPort.postMessage
                                                                             │
                                                                      ┌──────▼───────┐
                                                                      │   Utility     │
                                                                      │ (langchain-   │
                                                                      │  client)      │
                                                                      └──────────────┘
```

### Normal 模式数据流

```
Renderer(store) → Preload(ai-chat-api) → Main(AiChatService.startStream)
                                           ├─ buildModel() → Vercel AI SDK provider
                                           ├─ streamText() → 流式 token
                                           └─ event.sender.send() → Renderer(onStreamEvent)
```

### Agent 模式数据流

```
Renderer(store) → Preload(ai-chat-api) → Main(AiChatService.startAgentStream)
                                           ├─ langchainClientBridge.invokeAgent()
                                           │     └─ postMessage → Utility(langchain-client)
                                           │           ├─ Manager → Factory → LangGraph
                                           │           └─ parentPort.postMessage → events
                                           └─ bridge event listener → event.sender.send() → Renderer
```

### 事件驱动消息类型

Main → Utility（`MainToLangchainClientMessage`）：
- `process:init` / `process:shutdown`
- `agent:create` / `agent:destroy` / `agent:invoke` / `agent:abort`

Utility → Main（`LangchainClientToMainMessage`）：
- `process:ready` / `process:error`
- `agent:created` / `agent:create-failed` / `agent:destroyed`
- `invoke:start` / `invoke:text-delta` / `invoke:finish` / `invoke:error`
- `invoke:tool-start` / `invoke:tool-result`
- `invoke:node-start` / `invoke:node-result` / `invoke:node-error`
- `invoke:step-complete`

类型定义：`Public/ShareTypes/langchain-client.types.ts`
