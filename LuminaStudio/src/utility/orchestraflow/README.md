# OrchestraFlow 子进程导读

本文是面向开发者的引导式 README，重点说明：
- 应该先看哪些文件
- 每个文件负责什么
- 如何顺着一次完整运行（run/progress/result/stop）理解代码

## 模块范围

目录：`src/utility/orchestraflow`

该目录运行在 Electron Utility Process（子进程）中，负责执行由 Main 进程下发的工作流。

## 这个子进程做什么

1. 接收 Main 进程消息（`run`、`stop`、`init`、`shutdown`）。
2. 按拓扑顺序执行工作流节点。
3. 按节点实时上报执行进度。
4. 返回最终执行结果或错误。
5. 在运行期维护变量上下文，实现节点间数据传递。

## 推荐阅读顺序（新人）

1. `messages.types.ts`
原因：先理解 Main 和 Utility 之间的消息契约，再看执行逻辑会更清晰。

2. `entry.ts`
原因：子进程入口，负责消息监听、日志转发、分发到管理器。

3. `manager/workflow-instance-manager.ts`
原因：执行核心，管理实例生命周期、拓扑排序、进度汇报与结果组装。

4. `services/executor.ts`
原因：单节点执行适配层，构建执行上下文并委派给 NodeFactory。

5. `nodes/node-factory.ts`
原因：把节点类型分发到具体实现（`start`、`llm`、`end`）。

6. `nodes/base-node.ts` + 各具体节点
原因：这里是业务行为本体：
- `start-node.ts`：读取并产出起始输入变量
- `llm-node.ts`：调用模型并映射输出变量
- `end-node.ts`：按 selector 汇总最终输出

7. `services/variable-store.ts`
原因：运行时数据总线，负责变量读写与 selector 取值。

## 核心运行流程

### 1) 子进程启动
- `entry.ts` 检查 `process.parentPort`。
- 发送 `process:ready`。
- 注册消息监听，处理 Main -> Utility 指令。

### 2) 运行工作流（run）
- Main 发送 `workflow:run`（含 `runId`、workflow 图、inputs、providerConfigs）。
- `WorkflowInstanceManager.runWorkflow()`：
  - 创建运行实例
  - 对节点拓扑排序
  - 顺序执行每个节点
  - 每个节点前后发送 `workflow:progress`
  - 任一节点失败则整体失败

### 3) 进度上报（progress）
- 进度载荷为 `OFNodeTracing`。
- 每个节点会经历状态变化（`running` -> `succeeded/failed`）。

### 4) 返回结果（result）
- 管理器构建 `OFWorkflowRunResult`，包含：
  - 工作流状态
  - 总耗时
  - tracing 列表
  - 最终 outputs（通常由 End 节点汇总）
  - error（失败时）
- `entry.ts` 回发 `workflow:result` 或 `workflow:error`。

### 5) 停止执行（stop）
- Main 发送 `workflow:stop`。
- 管理器把实例状态标记为 `stopped`。
- 执行循环会在节点边界检查状态并提前退出。

## 消息契约速查

Main -> Utility（`MainToOFMessage`）：
- `process:init`
- `process:shutdown`
- `workflow:run`
- `workflow:stop`

Utility -> Main（`OFToMainMessage`）：
- `process:ready`
- `process:error`
- `process:log`
- `workflow:progress`
- `workflow:result`
- `workflow:error`

详见：`messages.types.ts`

## 文件职责地图

- `entry.ts`：子进程入口与消息分发
- `messages.types.ts`：跨进程消息定义
- `manager/workflow-instance-manager.ts`：工作流实例编排与生命周期
- `services/executor.ts`：单节点执行适配
- `services/variable-store.ts`：运行时变量存储与 selector 解析
- `nodes/base-node.ts`：节点抽象基类
- `nodes/node-factory.ts`：节点类型分发工厂
- `nodes/start-node.ts`：Start 节点逻辑
- `nodes/llm-node.ts`：LLM 节点逻辑
- `nodes/end-node.ts`：End 节点逻辑
- `nodes/types.ts`：执行上下文与结果类型

## 与 Main/Renderer 的衔接位置

本目录仅包含 Utility 侧实现。全链路定位请看：

1. Main 子进程桥接：
- `src/main/services/orchestraflow-bridge/orchestraflow-bridge-service.ts`

2. Main IPC 入口：
- `src/main/ipc/orchestraflow-handler.ts`

3. Preload API 暴露：
- `src/preload/api/orchestraflow-api.ts`

4. Renderer 状态与页面：
- `src/renderer/src/stores/orchestraflow/*`
- `src/renderer/src/views/LuminaApp/Maincontent/OrchestraFlowView/*`

## 扩展改造建议（最小改动）

当你要新增运行能力时，建议按以下顺序：

1. 先改共享类型（`src/Public/ShareTypes/Orchestraflow-types`）。
2. 再改 Utility 的“处理层”文件（manager/executor/nodes）中真正消费该字段的位置。
3. 透传层（preload re-export / bridge 映射）尽量少改。
4. 始终检查 `messages.types.ts` 与 Main bridge/handler 的消息兼容性。

## 实用调试建议

1. 从 `entry.ts` 的 `process:log` 转发日志入手，看子进程实际行为。
2. 观察 `workflow:progress` 可快速定位失败节点。
3. 数据流问题优先检查：`VariableStore.getBySelector()` 与节点输出变量名是否一致。
4. 模型调用问题优先检查：`llm-node.ts` 中 provider 配置解析与 API key/baseUrl。

## 说明

本文基于本地代码追踪，并结合 Devin 仓库调研结果整理。
