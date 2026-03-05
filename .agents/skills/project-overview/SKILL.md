---
description: 当 AI 需要了解本项目的整体架构、目录结构、技术栈、业务模块、数据库结构，或者需要快速构建项目上下文时激活此技能。适用于：(1) 首次接触本项目需要快速了解全貌；(2) 需要定位某个功能模块的代码位置；(3) 涉及数据库表结构、Schema 设计等需要了解当前数据库状态；(4) 涉及 LangChain Agent 架构、Graph/Node/Tool 扩展需要理解 Agent 子系统；(5) 需要查询项目最新文档或代码变更。
---

# LuminaStudio — Project Overview Skill

## 目的

帮助 AI 快速获取 LuminaStudio 项目的整体架构、关键代码入口、数据库表结构、LangChain Agent 子系统细节，从而在后续任务中做出准确判断。

## 模块索引

| 模块 | 文件 | 何时阅读 |
|------|------|----------|
| 信息渠道与目录结构 | `modules/info-channels.md` | 需要定位代码、了解技术栈、理清 IPC 通信路径时 |
| 数据库快照 | `modules/database-snapshot.md` | 涉及 SQLite 表结构、Schema 版本、字段含义时 |
| LangChain Agent 代码地图 | `modules/langchain-agent-map.md` | 涉及 Agent 模式、Graph/Node/Tool 扩展、Block 消息渲染时 |

## 核心行为准则

### 信息来源优先级

1. **本地源码**（最权威）— `LuminaStudio/src/` 下的代码和 README 文件
2. **本 Skill 模块**（结构化快照）— 可能滞后于最新代码，遇到不一致时以源码为准
3. **Devin 私有仓库查询**（`zhaowendao2005/HNULS-LuminaStudio`）— 需要跨模块全局搜索时使用，注意仓库索引可能有延迟
4. **DeepWiki 公共仓库查询** — 查询外部依赖文档时使用：
   - `vercel/ai`：Vercel AI SDK
   - `langchain-ai/langchainjs`：LangChain JS
   - `sqlite/sqlite`：SQLite 语法参考

### 注意事项

- **数据库是 SQLite**（better-sqlite3），不是 SurrealDB，没有 MCP 工具可直接查询数据库，需要读 `schema/` 下的 `tables.ts` 获取最新表结构
- **两套 AI 流式通信模式**：Normal 模式使用 Vercel AI SDK 直接流式；Agent 模式经由 LangchainClientBridge 到 Utility 子进程
- **LangChain Agent 架构**（Factory → Models → Nodes → Tools）是核心复杂度，修改前必须先阅读 `modules/langchain-agent-map.md`
- **Block 消息架构**：聊天消息由多种 Block 组成（TextBlock / ThinkingBlock / ToolBlock / NodeBlock / MetaBlock），前端渲染组件以 `MessageComponents-` 为前缀命名
- **database-snapshot.md 可能过时**：若发现表结构与源码不一致，以 `main/services/database-sqlite/schema/` 下源码为准
