# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## 项目概述

LuminaStudio 是一个基于 **Electron + Vue 3 + TypeScript** 的桌面应用，集成了 LangChain Agent 实现 AI 知识库问答功能。

## 开发命令

```bash
# 安装依赖
pnpm install

# 开发模式（默认 debug 日志级别）
pnpm dev

# 不同日志级别的开发模式
pnpm dev:silly    # 最详细
pnpm dev:verbose
pnpm dev:debug
pnpm dev:info
pnpm dev:warn
pnpm dev:error

# 类型检查
pnpm typecheck           # 全部
pnpm typecheck:node      # Node 环境（main/preload/utility）
pnpm typecheck:web       # Web 环境（renderer）

# 代码检查
pnpm lint                # ESLint
pnpm format              # Prettier 格式化

# 构建
pnpm build               # 仅构建
pnpm build:win           # Windows 安装包
pnpm build:mac           # macOS 安装包
pnpm build:linux         # Linux 安装包
```

## 架构概览

### 多进程架构

```
┌─────────────────────────────────────────────────────────────┐
│  Main Process (src/main/)                                   │
│  - 应用生命周期管理                                          │
│  - IPC 处理器 (ipc/)                                        │
│  - 业务服务 (services/)                                     │
│  - SQLite 数据库管理                                        │
└──────────────────────────┬──────────────────────────────────┘
                           │ IPC
┌──────────────────────────┼──────────────────────────────────┐
│  Preload (src/preload/)  │                                  │
│  - Bridge 层暴露 API     │                                  │
│  - 跨进程类型定义 (types/) ← 唯一权威来源                    │
└──────────────────────────┼──────────────────────────────────┘
                           │ contextBridge
┌──────────────────────────┼──────────────────────────────────┐
│  Renderer (src/renderer/)│                                  │
│  - Vue 3 + Pinia         │                                  │
│  - Tailwind CSS v4       │                                  │
└──────────────────────────┴──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Utility Process (src/utility/)                             │
│  - langchain-client: LangChain Agent 运行环境               │
│  - 独立 Node 进程，通过 MessagePort 通信                    │
└─────────────────────────────────────────────────────────────┘
```

### 路径别名

| 别名             | 路径                    | 可用范围      |
| ---------------- | ----------------------- | ------------- |
| `@main/*`        | `src/main/*`            | main, preload |
| `@preload/*`     | `src/preload/*`         | main, preload |
| `@preload/types` | `src/preload/types`     | 全部          |
| `@utility/*`     | `src/utility/*`         | main, preload |
| `@renderer/*`    | `src/renderer/src/*`    | renderer      |
| `@shared`        | `src/Public/ShareTypes` | 全部          |

### 关键目录职责

- **`src/main/ipc/`**: IPC 处理器，按业务域拆分（如 `ai-chat-handler.ts`）
- **`src/main/services/`**: 业务逻辑层，每个服务独立目录
- **`src/preload/types/`**: 跨进程类型的**唯一权威来源**
- **`src/preload/api/`**: 封装 IPC 调用的 API 层
- **`src/preload/bridge/`**: 聚合暴露给渲染进程的 API
- **`src/renderer/src/stores/`**: Pinia 状态管理，作为**单一事实来源（SSOT）**
- **`src/renderer/src/views/`**: 页面视图，按 UI 布局组织
- **`src/utility/langchain-client/`**: LangChain Agent 实现

## 添加新功能的标准流程

1. 在 `src/main/services/` 创建业务逻辑服务
2. 在 `src/main/ipc/` 创建 IPC handler
3. 在 `src/preload/types/` 定义跨进程类型
4. 在 `src/preload/api/` 创建 API 层
5. 在 `src/preload/bridge/` 注册 API
6. 在 `src/renderer/src/stores/` 创建 Pinia store
7. 在 `src/renderer/src/views/` 创建页面视图

## LangChain Agent 架构

Agent 运行在 Utility Process 中，通过 `LangchainClientBridge` 与主进程通信：

- **`utility/langchain-client/manager/`**: Agent 生命周期管理
- **`utility/langchain-client/models/`**: Agent 模型定义（如 knowledge-qa）
- **`utility/langchain-client/nodes/`**: LangGraph 节点（knowledge, planning, summary）
- **`utility/langchain-client/tools/`**: Agent 工具（如 retrieval-tool）

Agent 支持流式处理，事件类型包括：`invoke:start`, `invoke:tool-start`, `invoke:tool-result`, `invoke:text-delta`, `invoke:finish`

## 代码规范

### Vue 组件

- 所有 Vue 文件必须使用 `<script lang="ts">`
- 样式优先使用 Tailwind class，避免写独立 CSS
- 每个组件根元素必须包含**定位类**（格式：`{页面简写}-{功能区域}`，如 `ls-dashboard`）
- 定位类仅用于快速定位代码，无样式意义

### 类型系统

- 跨进程类型必须定义在 `src/preload/types/`
- 局部私有类型就近放置
- 类型修改后确保 `index.ts` 正确导出

### 状态管理

- Pinia store 是业务数据的唯一权威来源
- 使用 `datasource` 模式适配数据来源
- 避免在多处复制状态

## 技术栈

- **框架**: Electron 39 + electron-vite 5
- **前端**: Vue 3.5 + Pinia 3 + Tailwind CSS 4
- **AI**: LangChain + @ai-sdk/openai-compatible
- **数据库**: better-sqlite3
- **构建**: Vite 7 + TypeScript 5.9
- **包管理**: pnpm
