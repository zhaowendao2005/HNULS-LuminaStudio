# OrchestraFlow 子进程模块

面向新加入开发者的渐进式 README，重点说明：

- 应该先看哪些文件
- 每个文件负责什么
- 核心流程（run/progress/result/stop）如何串联

## 模块范围

目录：`src/utility/orchestraflow`

本目录运行在 Electron Utility Process（子进程）中，负责执行从 Main 进程发来的工作流任务。

## 这个子进程做什么

1. 接收 Main 进程消息（`run`、`stop`、`init`、`shutdown`等）
2. 按拓扑顺序执行工作流节点
3. 向主进程实时上报执行进度
4. 返回最终执行结果
5. 管理运行时变量存储，实现节点间数据传递

## 推荐阅读顺序（新人）

1. `messages.types.ts`
   原因：理解 Main 与 Utility 之间的消息契约，弄清楚执行逻辑的输入输出

2. `entry.ts`
   原因：子进程入口，处理消息分发、日志转发、生命周期管理

3. `manager/workflow-instance-manager.ts`
   原因：执行核心模块，管理工作流实例、拓扑排序、进度汇报、错误封装

4. `services/executor.ts`
   原因：单节点执行调度层，具体执行逻辑委托给 NodeFactory

5. `nodes/node-factory.ts`
   原因：把节点类型字符串分发到实现（`start`、`llm`、`end`等）

6. `nodes/base-node.ts` + 各具体节点
   原因：理解各业务节点行为：
   - `start-node.ts`：读取输入，启动工作流
   - `llm-node.ts`：调用模型并映射输出字段
   - `end-node.ts`：通过 selector 聚合最终输出

7. `services/variable-store.ts`
   原因：运行时变量存储，支持跨节点读写和 selector 取值

## 核心流程串讲

### 1) 子进程启动

- `entry.ts` 监听 `process.parentPort`
- 发送 `process:ready`
- 注册消息处理器，等待 Main -> Utility 指令

### 2) 运行工作流（run）

- Main 发送 `workflow:run`，携带 `runId`、workflow 图、inputs、providerConfigs 等
- `WorkflowInstanceManager.runWorkflow()`：
  - 创建运行实例
  - 对节点拓扑排序
  - 顺序执行每个节点
  - 每个节点前发送 `workflow:progress`
  - 任一节点失败则整体失败

### 3) 进度上报（progress）

- 进度载荷为 `OFNodeTracing`
- 每个节点会经历状态变化：`running` -> `succeeded/failed` 等

### 4) 返回结果（result）

- 最终返回 `OFWorkflowRunResult`，包含：
  - 整体运行状态
  - 总耗时
  - tracing 列表
  - 最终 outputs（通过最后 End 节点聚合）
  - error（失败时）
- `entry.ts` 分发 `workflow:result` 或 `workflow:error`

### 5) 停止执行（stop）

- Main 发送 `workflow:stop`
- 将运行实例状态标记为 `stopped`
- 执行循环在下个节点边界检查状态后提前退出

## 消息契约速查

Main -> Utility（`MainToOFMessage`）：

- `process:init`
- `process:shutdown`
- `workflow:run`
- `workflow:stop`
- `node:debug-run`

Utility -> Main（`OFToMainMessage`）：

- `process:ready`
- `process:error`
- `process:log`
- `workflow:progress`
- `workflow:result`
- `workflow:error`
- `node:debug-result`
- `node:debug-error`

详见 `messages.types.ts`

## 文件职责速查

- `entry.ts`：子进程入口，消息分发
- `messages.types.ts`：跨进程消息类型
- `manager/workflow-instance-manager.ts`：工作流实例管理、拓扑排序、进度汇报
- `services/executor.ts`：单节点执行调度
- `services/variable-store.ts`：运行时变量存储和 selector 解析
- `nodes/base-node.ts`：节点基类接口
- `nodes/node-factory.ts`：节点类型分发工厂
- `nodes/start-node.ts`：Start 节点逻辑
- `nodes/llm-node.ts`：LLM 节点逻辑
- `nodes/end-node.ts`：End 节点逻辑
- `nodes/types.ts`：执行上下文、配置等类型

## 与 Main/Renderer 的交互位置

本目录是纯 Utility 实现。全链路位置如下：

1. Main 子进程对接：
   - `src/main/services/orchestraflow-bridge/orchestraflow-bridge-service.ts`

2. Main IPC 处理：
   - `src/main/ipc/orchestraflow-handler.ts`

3. Preload API 暴露：
   - `src/preload/api/orchestraflow-api.ts`

4. Renderer 状态与页面：
   - `src/renderer/src/stores/orchestraflow/*`
   - `src/renderer/src/views/LuminaApp/Maincontent/OrchestraFlowView/*`

## 扩展开发建议（最小阅读量）

如果要新增节点或改流程，按以下顺序：

1. 先改工作流类型（`src/Public/ShareTypes/Orchestraflow-types`）
2. 再改 Utility 的"执行层"文件（manager/executor/nodes），这里已经有字段的位置
3. 透传层（preload re-export / bridge 映射）基本不用改
4. 始终检查 `messages.types.ts` 和 Main bridge/handler 的消息对齐

## 实用调试技巧

1. 在 `entry.ts` 的 `process:log` 转发机制下，子进程实际行为可见
2. 观察 `workflow:progress` 可快速定位失败节点
3. 变量存储一致性检查：`VariableStore.getBySelector()` 与节点输出是否一致
4. 模型调用配置检查：`llm-node.ts` 的 provider 配置是否正确（API key/baseUrl）

## 说明

本文基于本次代码追踪，如有更新请在 Devin 仓库中进行同步。
