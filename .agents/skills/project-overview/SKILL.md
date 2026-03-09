---
description: 当 AI 需要了解本项目的整体架构、目录结构、技术栈、业务模块、数据库结构，或者需要快速构建项目上下文时激活此技能。此技能同时承担“项目总索引入口”的角色：帮助后续 agent 先判断问题落在哪个业务域、哪一层是处理层、哪一层只是透传层，并给出最小阅读路径与检索锚点。适用于：(1) 首次接触本项目需要快速了解全貌；(2) 需要定位某个功能模块的代码位置；(3) 涉及数据库表结构、Schema 设计等需要了解当前数据库状态；(4) 涉及 LangChain Agent 架构、Graph/Node/Tool 扩展需要理解 Agent 子系统；(5) 需要查询项目最新文档或代码变更；(6) 需要为后续任务建立可靠的“从粗到细”的检索路线。
---

# LuminaStudio — 项目总览技能

## 目的

帮助 AI 快速获取 LuminaStudio 项目的整体架构、关键代码入口、数据库表结构、LangChain Agent 子系统细节，并建立一套稳定的项目索引方式：

- 先判断任务属于哪个业务域
- 再判断应该先看处理层还是透传层
- 最后再收窄到具体文件、类型名、组件名、事件名

## ⚠️ 必读：主 Skill 与分 Skill 的阅读顺序

**本技能是项目的"主索引入口"，但不是全部。**

在使用本技能建立粗粒度地图后，你**必须**继续阅读以下"分 Skills"文档：

### 核心分 Skills（按优先级排序）

1. **`LuminaStudio/README.md`**
   - 作用：项目整体架构、技术栈、核心特性、快速开始指南
   - 何时读：在本 skill 之后**立即阅读**
   - 重点关注：技术栈、项目结构、核心功能、开发指南

2. **`LuminaStudio/src/utility/orchestraflow/ai-schema/README.md`**
   - 作用：OrchestraFlow AI schema 架构规则、runnable workflow 契约、架构边界
   - 何时读：涉及 OrchestraFlow AI 集成、workflow 生成、节点定义时**必读**
   - 重点关注：架构规则、快速验证命令、模型契约

### 阅读流程

```
本 Skill (粗粒度地图)
    ↓
LuminaStudio/README.md (整体架构 + 技术栈)
    ↓
根据任务类型选择：
  - OrchestraFlow 相关 → ai-schema/README.md
  - 其他业务域 → 对应层级 README
```

## 使用目标

当你使用本技能时，优先产出以下内容，而不是直接漫无目的地展开全文检索：

1. 这次任务属于哪个业务域：`ai-chat` / `orchestraflow` / `model-config` / `rerank-model` / `user-settings` / `knowledge-database` / 跨域基础设施
2. 这次任务主要落在哪一层：`renderer` / `preload` / `main` / `utility` / `database schema`
3. 哪些文件是**处理层**，哪些文件只是**透传层**
4. 下一步最值得打开的 3-6 个文件，而不是一次性读太多无关内容

## 首次进入项目时的最小阅读顺序

如果你对当前任务还没有任何上下文，先按下面顺序建立粗粒度地图：

**第一步：阅读本 Skill**（你正在做）

**第二步：立即阅读核心分 Skills**
1. `LuminaStudio/README.md` ← **必读，不可跳过**
2. 根据任务类型决定是否阅读 `LuminaStudio/src/utility/orchestraflow/ai-schema/README.md`

**第三步：按需阅读层级 README**
1. `LuminaStudio/src/main/README.md`
2. `LuminaStudio/src/preload/README.md`
3. `LuminaStudio/src/renderer/README.md`
4. `LuminaStudio/src/utility/README.md`
5. `modules/info-channels.md`

只有在问题已经明确落到特定子系统时，才继续读下面的专项模块：

- 数据库相关：`modules/database-snapshot.md`
- Agent / Graph / Tool / Block 渲染：`modules/langchain-agent-map.md`
- OrchestraFlow 变量定义、selector、运行时变量流转：`modules/orchestraflow-variable-system.md`

## 模块索引

| 模块 | 文件 | 何时阅读 |
|------|------|----------|
| 信息渠道与目录结构 | `modules/info-channels.md` | 需要快速知道“项目有哪些层、有哪些 README、入口在哪、跨进程怎么走”时 |
| 数据库快照 | `modules/database-snapshot.md` | 涉及 SQLite 表结构、Schema 版本、字段含义时；只把它当快照，最终仍要回到 schema 源码 |
| LangChain Agent 代码地图 | `modules/langchain-agent-map.md` | 涉及 Agent 模式、Graph/Node/Tool 扩展、Block 消息渲染、`requestUserInteraction`、事件协议时 |
| OrchestraFlow 变量系统扩展 | `modules/orchestraflow-variable-system.md` | 涉及变量定义、变量池、selector、变量选择器、前后端变量流转、变量类型扩展时 |

## 项目总索引

先把下面这张表当成“目录级地图”，后续所有检索都应该从这里收窄：

| 层 | 主路径 | 主要职责 | 优先关注 |
|----|--------|----------|----------|
| Renderer | `LuminaStudio/src/renderer/src/` | 页面、组件、Pinia store、前端 datasource、类型 | UI 变化、状态管理、消息渲染、编辑器交互 |
| Preload | `LuminaStudio/src/preload/` | 跨进程类型、API 封装、Bridge 暴露 | IPC 契约、参数转换、安全暴露 |
| Main | `LuminaStudio/src/main/` | Electron 主进程入口、IPC handler、核心 service、数据库 | 真正业务逻辑、持久化、子进程桥接 |
| Utility | `LuminaStudio/src/utility/` | 独立子进程运行时 | LangChain Agent、OrchestraFlow 执行器、长任务 |
| Public | `LuminaStudio/src/Public/` | 跨层共享类型 | 共享协议、公共 DTO |

## 处理层 vs 透传层

先区分这一点，可以大幅减少误读：

### 透传层（通常不是第一优先修改点）

- `LuminaStudio/src/preload/api/*.ts`
- `LuminaStudio/src/main/ipc/*-handler.ts`
- `LuminaStudio/src/preload/bridge/**`
- 一部分 `bridge-service` 文件只负责进程转发

这些文件重要，但多数时候职责是“把参数传下去、把结果带回来”。如果你要找“行为是在哪里决定的”，不要长时间停留在这里。

### 处理层（大多数逻辑真正在这里）

- `LuminaStudio/src/renderer/src/stores/**`
- `LuminaStudio/src/main/services/**`
- `LuminaStudio/src/utility/langchain-client/**`
- `LuminaStudio/src/utility/orchestraflow/**`
- `LuminaStudio/src/main/services/database-sqlite/schema/**`

当任务是“为什么会这样”“真正逻辑在哪”“应该改哪一层”，优先看这些目录。

## 业务域锚点

本项目的高频业务域命名非常统一。优先用**业务域名 + 分层后缀**来缩小范围，不要一开始就搜过于宽泛的词。

| 业务域 | Renderer | Preload | Main | Utility / 其他 |
|--------|----------|---------|------|----------------|
| `ai-chat` | `stores/ai-chat/`、`views/LuminaApp/Maincontent/NormalChat/` | `api/ai-chat-api.ts`、`types/ai-chat.types.ts` | `ipc/ai-chat-handler.ts`、`services/ai-chat/`、`services/langchain-client-bridge/` | `utility/langchain-client/` |
| `model-config` | `stores/model-config/` | `api/model-config-api.ts`、`types/model-config.types.ts` | `ipc/model-config-handler.ts`、`services/model-config/` | 无独立 utility 子进程 |
| `orchestraflow` | `stores/orchestraflow/` | `api/orchestraflow-api.ts`、`types/orchestraflow.types.ts` | `ipc/orchestraflow-handler.ts`、`services/orchestraflow/`、`services/orchestraflow-bridge/` | `utility/orchestraflow/` |
| `rerank-model` | `stores/rerank-model/` | `api/rerank-model-api.ts`、`types/rerank-model.types.ts` | `ipc/rerank-model-handler.ts`、`services/rerank-model/` | 通常不进入 utility |
| `user-settings` | 主要由页面消费 | `api/user-settings-api.ts`、`types/user-settings.types.ts` | `ipc/user-settings-handler.ts`、`services/user-settings/` | 通常不进入 utility |
| `knowledge-database` | 主要通过聊天和配置侧间接消费 | `api/knowledge-database-api.ts`、`types/knowledge-database.types.ts` | `ipc/knowledge-database-handler.ts`、`services/knowledge-database-bridge/` | 外部知识库桥接 |

## 高价值目录锚点

如果任务属于下列类型，优先打开这些目录，而不是先随机扫整个仓库：

### 1. 页面与交互

- `LuminaStudio/src/renderer/src/views/LuminaApp/`
- `LuminaStudio/src/renderer/src/components/`
- `LuminaStudio/src/renderer/src/stores/`

其中：

- 页面骨架集中在 `views/LuminaApp/`
- 真正状态与数据流大多在 `stores/`
- 公共组件在 `components/`

### 2. 聊天消息渲染与 Block 系统

- `LuminaStudio/src/renderer/src/stores/ai-chat/chat-message/`
- `LuminaStudio/src/renderer/src/views/LuminaApp/Maincontent/NormalChat/NormalChat-Maincontent/ChatMain-Message/`
- `modules/langchain-agent-map.md`

高价值锚点词：

- `MessageComponents-`
- `chat-message`
- `TextBlock`
- `ThinkingBlock`
- `ToolBlock`
- `NodeBlock`
- `MetaBlock`

### 3. LangChain Agent / Graph / Node / Tool

- `LuminaStudio/src/main/services/langchain-client-bridge/`
- `LuminaStudio/src/utility/langchain-client/factory/`
- `LuminaStudio/src/utility/langchain-client/models/`
- `LuminaStudio/src/utility/langchain-client/nodes/`
- `LuminaStudio/src/utility/langchain-client/tools/`
- `modules/langchain-agent-map.md`

高价值锚点词：

- `graph.ts`
- `buildKnowledgeQaGraph`
- `requestUserInteraction`
- `buildAgentTools`
- `nodeFactory`
- `tool-call`
- `node-start`
- `node-result`

### 4. OrchestraFlow definition / AI schema / 工作流编辑器

**⚠️ 在深入此部分前，必须先阅读：**
- `LuminaStudio/README.md` 的项目结构章节
- `LuminaStudio/src/utility/orchestraflow/ai-schema/README.md` ← **架构规则权威来源**

这两份文档定义了 OrchestraFlow 的核心架构原则、AI schema 契约、节点定义规范。不阅读这些文档直接修改代码可能导致架构违规。

- `LuminaStudio/src/renderer/src/stores/orchestraflow/`
- `LuminaStudio/src/utility/orchestraflow/services/variable-store.ts`
- `LuminaStudio/src/utility/orchestraflow/nodes/`
- `LuminaStudio/src/utility/orchestraflow/ai-schema/`
- `modules/orchestraflow-variable-system.md`

高价值锚点词：

- `variable-selector`
- `variable-store`
- `workflow-editor`
- `workflow-run`
- `selector`
- `start-node`
- `end-node`
- `llm-node`
- `OFRunnableWorkflow`
- `ai-schema`

### 5. 数据库与 Schema

- `LuminaStudio/src/main/services/database-sqlite/schema/`
- `modules/database-snapshot.md`

数据库相关先看源码，再把 `database-snapshot.md` 当成加速器核对表。

## 检索与收窄原则

本技能不绑定具体工具，但你应该始终按下面顺序收窄，而不是直接用大词扫整库：

1. 先用业务域名收窄：如 `ai-chat`、`orchestraflow`、`model-config`
2. 再用分层后缀收窄：如 `store`、`datasource`、`types`、`api`、`handler`、`service`、`graph`
3. 再用具体实体名收窄：如 `MessageComponents-KnowledgeSearch`、`buildKnowledgeQaGraph`、`variable-selector`
4. 最后才看通用词：如 `message`、`config`、`node`、`data`

优先使用下面这些“命名模式”来判断代码职责：

- `*.store.ts`：前端单一事实来源
- `*.datasource.ts`：前端数据访问适配层
- `*.types.ts`：契约与结构定义
- `*-api.ts`：preload API 封装
- `*-handler.ts`：main IPC 接收层
- `*-service.ts`：main 业务服务层
- `graph.ts`：Agent / 工作流的执行图谱
- `entry.ts`：utility 子进程入口
- `MessageComponents-*`：聊天消息渲染组件

## 常见任务的最小路线

### 改 UI，但不确定状态从哪里来

1. 从 `views/LuminaApp/` 定位页面区域
2. 找到该页面引用的 store
3. 再顺着 `datasource -> preload api -> main handler -> main service` 往下追

### 改跨进程字段、接口参数、返回值

1. 先看 `LuminaStudio/src/preload/types/`
2. 再看对应 `api/*.ts`
3. 再看 `main/ipc/*-handler.ts`
4. 最后落到 `main/services/**`

### 改聊天流式事件或消息块渲染

1. `modules/langchain-agent-map.md`
2. `renderer/src/stores/ai-chat/chat-message/`
3. `renderer/src/views/.../ChatMain-Message/`
4. 需要追后端时继续看 `main/services/ai-chat/` 与 `main/services/langchain-client-bridge/`
5. 如果事件来自 Agent graph，再进 `utility/langchain-client/models/**/graph.ts`

### 改 Agent 节点、工具或图谱

1. `modules/langchain-agent-map.md`
2. `utility/langchain-client/models/`
3. `utility/langchain-client/nodes/`
4. `utility/langchain-client/tools/`
5. 需要跨进程联动时再看 `main/services/langchain-client-bridge/`

### 改 OrchestraFlow 变量能力

1. `modules/orchestraflow-variable-system.md`
2. `renderer/src/stores/orchestraflow/workflow-editor/`
3. `utility/orchestraflow/services/variable-store.ts`
4. `utility/orchestraflow/nodes/`

### 查数据库表结构

1. `main/services/database-sqlite/schema/`
2. `modules/database-snapshot.md`

## 权威来源优先级

1. **核心分 Skills 文档**（必读）
   - `LuminaStudio/README.md`
   - `LuminaStudio/src/utility/orchestraflow/ai-schema/README.md`
   
2. **本地源码**：最权威，尤其是 `LuminaStudio/src/**`

3. **各层 README**：解释目录职责与边界，适合快速建立地图

4. **本 Skill 模块**：结构

## 注意事项

- **数据库是 SQLite**（better-sqlite3），不是 SurrealDB；没有 MCP 工具可直接查询数据库，表结构以 `main/services/database-sqlite/schema/` 为准
- **两套 AI 流式通信模式**：Normal 模式使用 Vercel AI SDK；Agent 模式经由 `LangchainClientBridge` 进入 Utility 子进程
- **LangChain Agent 架构**（Factory → Models → Nodes → Tools）是核心复杂度，涉及 graph 行为时先读 `modules/langchain-agent-map.md`
- **扩展 OrchestraFlow 变量能力时**，必须同时核对共享类型、运行时变量池、节点执行逻辑、前端变量选择器
- **Block 消息架构**是聊天前端的核心索引之一；聊天消息组件以 `MessageComponents-` 为前缀命名
- **`database-snapshot.md` 可能过时**；发现与源码不一致时，以 schema 源码为准
- **不要把大量时间花在透传层**；如果目标是找“逻辑真正在哪”，优先回到 store / service / graph / schema

## 建议输出格式

当本技能被触发时，优先输出这种结构：

1. 任务归属的业务域和分层
2. 建议先打开的 3-6 个文件
3. 这些文件里哪些是处理层，哪些是透传层
4. 如果需要，再指出下一份应该阅读的模块文档
