# HNULS-LuminaStudio

HNULS LabHub 的桌面端 AI 工作台仓库。

这个仓库的真正应用工程位于 [`LuminaStudio/`](./LuminaStudio)。根目录 `README.md` 主要负责说明仓库入口、项目分层和常用开发命令，避免第一次进入仓库时看错旧目录或旧技术栈。

## 仓库结构

```text
HNULS-LuminaStudio/
├── LuminaStudio/        # Electron + Vue + TypeScript 主应用
├── _Documents/          # 项目文档、规范、参考资料
├── .agents/skills/      # 给 AI / Agent 使用的项目技能说明
├── AGENTS.md            # 本仓库协作规则与工程约束
└── README.md            # 当前文件，仓库级导航入口
```

## 项目概况

`LuminaStudio` 是一个基于 Electron 的桌面应用，当前核心方向包括：

- AI 对话与流式消息渲染
- OrchestraFlow 工作流定义、编辑与运行
- 模型配置、重排模型、用户设置等本地配置管理
- 基于 `better-sqlite3` 的本地数据存储
- 通过 preload + IPC + main service + utility process 组织跨进程能力
- 集成 MCP、LangChain、Vercel AI SDK 等 AI 能力基础设施

## 当前技术栈

### 前端 / 渲染进程

- Vue 3
- Pinia
- Tailwind CSS 4
- Vue Flow
- TypeScript

### Electron 分层

- `src/renderer/`: 页面、组件、stores、少量 composables / service
- `src/preload/`: 跨进程类型、API 封装、bridge 暴露
- `src/main/`: IPC handler、主进程 service、数据库与桥接服务
- `src/utility/`: 独立 Node 子进程，承载 LangChain / OrchestraFlow 等长流程逻辑
- `src/Public/`: 跨层共享类型与公共契约

### 关键依赖

- Electron
- electron-vite
- better-sqlite3
- ai / openai / `@ai-sdk/openai-compatible`
- langchain / `@langchain/core` / `@langchain/openai`
- `@modelcontextprotocol/sdk`

## 先看哪里

如果你是第一次进入这个仓库，建议按这个顺序阅读：

1. [`AGENTS.md`](./AGENTS.md)
2. [`LuminaStudio/README.md`](./LuminaStudio/README.md)
3. [`LuminaStudio/src/main/README.md`](./LuminaStudio/src/main/README.md)
4. [`LuminaStudio/src/preload/README.md`](./LuminaStudio/src/preload/README.md)
5. [`LuminaStudio/src/renderer/README.md`](./LuminaStudio/src/renderer/README.md)

如果任务和 OrchestraFlow 有关，再继续看：

- `LuminaStudio/src/Public/ShareTypes/Orchestraflow-types/`
- `LuminaStudio/src/utility/orchestraflow/`
- `LuminaStudio/src/renderer/src/stores/orchestraflow/`

## 快速开始

### 1. 进入应用目录

```bash
cd LuminaStudio
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动开发环境

```bash
pnpm dev
```

常用日志级别命令：

```bash
pnpm dev:info
pnpm dev:debug
pnpm dev:verbose
pnpm dev:silly
pnpm dev:warn
pnpm dev:error
```

### 4. 构建应用

```bash
pnpm build:win
pnpm build:mac
pnpm build:linux
```

## 常用检查命令

在 `LuminaStudio/` 目录执行：

```bash
pnpm lint
pnpm typecheck
```

如果改动涉及 OrchestraFlow，优先补跑：

```bash
pnpm lint:orchestraflow
pnpm test:orchestraflow
pnpm exec tsc -p tsconfig.json --noEmit
```

## 代码组织约定

仓库里最重要的几条约定如下：

- 渲染层状态以 Pinia store 作为单一事实来源
- 跨进程类型以 `src/preload/types/` 为唯一权威来源
- preload API 只做参数校验、类型转换和 IPC 调用，不承载复杂业务逻辑
- main process 的 handler 尽量只做透传，实际业务逻辑放在 `services/`
- OrchestraFlow 的共享契约以 `src/Public/ShareTypes/Orchestraflow-types/` 为单一事实来源
- 修改完成后，需要处理自己引入的 lint 和 typecheck 问题

## 适合在根目录完成的事

根目录更适合做这些事情：

- 阅读仓库级规范和协作文档
- 定位主应用在哪个子目录
- 查找项目文档、AI skills、工程规则
- 给新同学或新 agent 提供统一入口

如果你要实际开发应用功能，通常应该进入 [`LuminaStudio/`](./LuminaStudio) 再开始。

## 相关文档

- [`AGENTS.md`](./AGENTS.md)
- [`LuminaStudio/README.md`](./LuminaStudio/README.md)
- [`LuminaStudio/package.json`](./LuminaStudio/package.json)
- [`_Documents/`](./_Documents)

## 说明

旧版根 README 中曾包含 SurrealDB、旧目录名和早期知识库项目描述。当前仓库已经演进为以 `LuminaStudio/` 为核心的 Electron + Vue + SQLite + AI 工作台工程，后续应以当前文档和子目录源码为准。