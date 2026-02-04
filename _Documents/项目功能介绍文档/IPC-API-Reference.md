# IPC API 参考文档

本文档列出系统中所有可用的 IPC 通道（Handlers）、类型定义及其位置，便于前端开发时精准调用。

**更新日期**: 2026-02-04  
**版本**: v1.0

---

## 目录

1. [Window 窗口控制](#1-window-窗口控制)
2. [Model Config 模型配置](#2-model-config-模型配置)
3. [AI Chat 对话生成](#3-ai-chat-对话生成)
4. [类型定义索引](#4-类型定义索引)

---

## 1. Window 窗口控制

### 概述
控制窗口最小化、最大化、关闭、全屏等操作。

### IPC Channels

| Channel | 参数 | 返回值 | 说明 |
|---------|------|--------|------|
| `window:minimize` | - | `Promise<void>` | 最小化窗口 |
| `window:toggle-maximize` | - | `Promise<void>` | 切换最大化/还原 |
| `window:close` | - | `Promise<void>` | 关闭窗口 |
| `window:is-maximized` | - | `Promise<boolean>` | 查询是否已最大化 |
| `window:toggle-fullscreen` | - | `Promise<void>` | 切换全屏 |

### 事件订阅

| Event | Payload | 说明 |
|-------|---------|------|
| `window:maximized-changed` | `WindowMaximizedChangedPayload` | 窗口最大化状态变化时触发 |

### 前端调用示例

```typescript
// 最小化窗口
await window.api.window.minimize()

// 切换最大化
await window.api.window.toggleMaximize()

// 关闭窗口
await window.api.window.close()

// 查询最大化状态
const isMax = await window.api.window.isMaximized()

// 切换全屏
await window.api.window.toggleFullScreen()

// 订阅最大化状态变化
const unsubscribe = window.api.window.onMaximizedChanged((payload) => {
  console.log('Is maximized:', payload.isMaximized)
})
// 取消订阅
unsubscribe()
```

### 类型定义位置
- **Preload API**: `LuminaStudio/src/preload/api/window-api.ts`
- **跨进程类型**: `LuminaStudio/src/preload/types/window.types.ts`
- **Main Handler**: `LuminaStudio/src/main/ipc/window-handler.ts`

---

## 2. Model Config 模型配置

### 概述
管理 AI 模型提供商（Providers）和模型列表，支持从远程 API 同步模型。

### IPC Channels

| Channel | 参数 | 返回值 | 说明 |
|---------|------|--------|------|
| `modelConfig:get` | - | `ApiResponse<ModelConfig>` | 获取当前模型配置 |
| `modelConfig:update` | `Partial<ModelConfig>` | `ApiResponse<ModelConfig>` | 更新模型配置 |
| `modelConfig:syncmodels` | `string` (providerId) | `ApiResponse<RemoteModelGroups>` | 从提供商 API 同步模型列表 |

### 前端调用示例

```typescript
// 获取配置
const res = await window.api.modelConfig.get()
if (res.success) {
  console.log('Providers:', res.data.providers)
  console.log('Active provider:', res.data.activeProviderId)
}

// 更新配置
await window.api.modelConfig.update({
  activeProviderId: 'provider-123',
  providers: [
    {
      id: 'provider-123',
      name: 'My Provider',
      protocol: 'openai',
      enabled: true,
      baseUrl: 'https://api.example.com',
      apiKey: 'sk-xxx',
      models: [
        { id: 'gpt-4o', displayName: 'GPT-4o', group: 'gpt-4' }
      ]
    }
  ]
})

// 同步模型列表
const modelsRes = await window.api.modelConfig.syncModels('provider-123')
if (modelsRes.success) {
  console.log('Remote models:', modelsRes.data)
  // 返回格式: { 'gpt-4': [{ id: 'gpt-4o', ... }], 'gpt-3': [...] }
}
```

### 核心类型定义

#### `ModelConfig`
```typescript
interface ModelConfig {
  version: number
  updatedAt: string
  activeProviderId?: string | null
  providers: PersistedModelProviderConfig[]
}
```

#### `PersistedModelProviderConfig`
```typescript
interface PersistedModelProviderConfig {
  id: string
  name: string
  protocol: 'openai'  // 当前仅支持 openai-compatible
  enabled: boolean
  baseUrl: string
  apiKey: string
  defaultHeaders?: Record<string, string>
  models: PersistedModelConfig[]
}
```

#### `PersistedModelConfig`
```typescript
interface PersistedModelConfig {
  id: string           // 模型 ID，如 'gpt-4o'
  displayName: string  // 显示名称
  group?: string       // 分组名称（可选）
}
```

#### `RemoteModelGroups`
```typescript
interface RemoteModelGroups {
  [groupName: string]: RemoteModelInfo[]
}

interface RemoteModelInfo {
  id: string
  object: string
  created: number
  owned_by: string
}
```

### 类型定义位置
- **Preload API**: `LuminaStudio/src/preload/api/model-config-api.ts`
- **跨进程类型**: `LuminaStudio/src/preload/types/model-config.types.ts`
- **Main Handler**: `LuminaStudio/src/main/ipc/model-config-handler.ts`
- **Main Service**: `LuminaStudio/src/main/services/model-config/model-config-service.ts`

---

## 3. AI Chat 对话生成

### 概述
AI 对话流式生成功能，支持 thinking（推理过程）、工具调用、中断、历史查询等。

### IPC Channels

| Channel | 参数 | 返回值 | 说明 |
|---------|------|--------|------|
| `aiChat:start` | `AiChatStartRequest` | `ApiResponse<AiChatStartResponse>` | 启动流式生成 |
| `aiChat:abort` | `AiChatAbortRequest` | `ApiResponse<void>` | 中断生成 |
| `aiChat:history` | `AiChatHistoryRequest` | `ApiResponse<AiChatHistoryResponse>` | 获取对话历史 |

### 事件订阅

| Event | Payload | 说明 |
|-------|---------|------|
| `aiChat:stream` | `AiChatStreamEvent` | 流式生成事件（实时推送） |

### 前端调用示例

```typescript
// 1. 订阅流式事件
const unsubscribe = window.api.aiChat.onStream((event) => {
  switch (event.type) {
    case 'stream-start':
      console.log('Stream started', event.conversationId)
      break
    case 'text-delta':
      // 追加文本到 UI
      appendText(event.delta)
      break
    case 'reasoning-start':
      console.log('Reasoning block started', event.id)
      break
    case 'reasoning-delta':
      // 追加推理内容到 thinking 区域
      appendReasoning(event.delta)
      break
    case 'reasoning-end':
      console.log('Reasoning block ended', event.id)
      break
    case 'tool-call':
      console.log('Tool called:', event.toolName, event.input)
      break
    case 'tool-result':
      console.log('Tool result:', event.result)
      break
    case 'error':
      console.error('Stream error:', event.message)
      break
    case 'finish':
      console.log('Stream finished', event.finishReason)
      if (event.usage) {
        console.log('Tokens used:', event.usage)
      }
      break
  }
})

// 2. 启动对话
const startRes = await window.api.aiChat.start({
  conversationId: 'conv-' + Date.now(),
  providerId: 'provider-123',
  modelId: 'gpt-4o',
  input: 'Explain quantum computing',
  enableThinking: false  // 是否开启 thinking 抽取
})

if (startRes.success) {
  console.log('Request ID:', startRes.data.requestId)
}

// 3. 中断生成
await window.api.aiChat.abort({ 
  requestId: startRes.data.requestId 
})

// 4. 获取历史
const historyRes = await window.api.aiChat.history({
  conversationId: 'conv-123',
  limit: 20,
  offset: 0
})

if (historyRes.success) {
  console.log('Messages:', historyRes.data.messages)
  console.log('Total:', historyRes.data.total)
}
```

### 核心类型定义

#### 请求类型

```typescript
interface AiChatStartRequest {
  conversationId: string    // 对话 ID（客户端生成）
  providerId: string        // 模型提供商 ID
  modelId: string           // 模型 ID
  input: string             // 用户输入
  enableThinking?: boolean  // 是否开启 thinking（默认 false）
}

interface AiChatAbortRequest {
  requestId: string  // 要中断的请求 ID
}

interface AiChatHistoryRequest {
  conversationId: string  // 对话 ID
  limit?: number          // 返回条数（默认 50）
  offset?: number         // 偏移量（默认 0）
}
```

#### 响应类型

```typescript
interface AiChatStartResponse {
  requestId: string        // 请求 ID（用于中断）
  conversationId: string   // 对话 ID
}

interface AiChatHistoryResponse {
  messages: AiChatMessage[]  // 消息列表
  total: number              // 总消息数
}

interface AiChatMessage {
  id: string
  conversationId: string
  role: 'system' | 'user' | 'assistant' | 'tool'
  text?: string           // 文本内容
  reasoning?: string      // 推理内容（thinking）
  contentJson?: string    // 完整内容（JSON）
  status: 'final' | 'streaming' | 'aborted' | 'error'
  error?: string
  createdAt: string
}
```

#### 流式事件类型

所有流式事件都包含 `requestId`，并通过 `type` 字段区分。

##### `stream-start`
```typescript
{
  type: 'stream-start'
  requestId: string
  conversationId: string
  providerId: string
  modelId: string
  startedAt: string  // ISO 8601
}
```

##### `text-delta`
```typescript
{
  type: 'text-delta'
  requestId: string
  delta: string  // 文本增量
}
```

##### `reasoning-start` / `reasoning-delta` / `reasoning-end`
```typescript
{
  type: 'reasoning-start' | 'reasoning-delta' | 'reasoning-end'
  requestId: string
  id: string          // reasoning block ID
  delta?: string      // 仅 reasoning-delta 有
}
```

##### `tool-call`
```typescript
{
  type: 'tool-call'
  requestId: string
  toolCallId: string
  toolName: string
  input: unknown  // 结构化输入
}
```

##### `tool-call-delta` (streaming tool args)
```typescript
{
  type: 'tool-call-delta'
  requestId: string
  toolCallId: string
  toolName: string
  argsTextDelta: string
}
```

##### `tool-result`
```typescript
{
  type: 'tool-result'
  requestId: string
  toolCallId: string
  toolName: string
  result: unknown  // 结构化结果
}
```

##### `error`
```typescript
{
  type: 'error'
  requestId: string
  message: string
  stack?: string
  code?: string
}
```

##### `finish`
```typescript
{
  type: 'finish'
  requestId: string
  finishReason: 'stop' | 'aborted' | 'error'
  messageId?: string  // assistant message ID
  usage?: {
    inputTokens: number
    outputTokens: number
    reasoningTokens?: number
    totalTokens: number
  }
}
```

### 类型定义位置
- **Preload API**: `LuminaStudio/src/preload/api/ai-chat-api.ts`
- **跨进程类型**: `LuminaStudio/src/preload/types/ai-chat.types.ts` （权威来源）
- **Main Handler**: `LuminaStudio/src/main/ipc/ai-chat-handler.ts`
- **Main Service**: `LuminaStudio/src/main/services/ai-chat/ai-chat-service.ts`

### 重要说明

1. **enableThinking 参数**:
   - 开启后会对模型输出做 `<think>...</think>` 标签抽取
   - 即使开启，也不保证所有模型都会产生 thinking 内容
   - 适用于支持推理的模型（如 DeepSeek R1 等）

2. **上下文管理**:
   - 每次生成会自动取最近 10 轮（20 条 user/assistant 消息）作为上下文
   - reasoning 内容仅用于展示，不会回灌到上下文

3. **数据持久化**:
   - 所有消息（包括 text、reasoning、tool events）都存储在 `userdata.db`
   - 表结构：`conversations` / `messages` / `message_usage`
   - 数据库位置：`app.getPath('userData')/databases/userdata.db`

---

## 4. 类型定义索引

### 跨进程类型定义（权威来源）
所有跨进程类型统一定义在 `LuminaStudio/src/preload/types/` 目录，并通过 `index.ts` 导出。

| 文件 | 导出内容 |
|------|----------|
| `base.types.ts` | `ApiResponse<T>`, `ErrorInfo` |
| `window.types.ts` | `WindowMaximizedChangedPayload` |
| `model-config.types.ts` | `ModelConfig`, `ModelProviderProtocol`, `PersistedModelProviderConfig`, `PersistedModelConfig`, `RemoteModelInfo`, `RemoteModelGroups`, `ModelConfigAPI` |
| `ai-chat.types.ts` | `AiChatStartRequest`, `AiChatStartResponse`, `AiChatAbortRequest`, `AiChatHistoryRequest`, `AiChatHistoryResponse`, `AiChatMessage`, `AiChatStreamEvent` (及所有流事件子类型), `AiChatAPI` |

### Preload API 聚合
所有 API 通过 `LuminaStudio/src/preload/bridge/index.ts` 聚合到 `window.api`：

```typescript
window.api = {
  utils: utilsAPI,
  window: windowAPI,
  modelConfig: modelConfigAPI,
  aiChat: aiChatAPI
}
```

### 前端使用类型
前端可以直接从 `@preload/types` 导入跨进程类型（如果配置了路径别名），或从 `window.api` 的类型推断。

---

## 附录：BaseIPCHandler 自动注册机制

所有 IPC Handler 都继承自 `BaseIPCHandler`，使用约定式自动注册：

1. **Channel 命名规则**: `prefix:method`
   - `prefix`: 由子类 `getChannelPrefix()` 返回
   - `method`: 从 `handle*` 方法名自动推断（转小写）
   
2. **示例**:
   ```typescript
   class FooHandler extends BaseIPCHandler {
     protected getChannelPrefix(): string { return 'foo' }
     async handleGetData() { ... }  // 自动注册为 'foo:getdata'
     async handleUpdate() { ... }   // 自动注册为 'foo:update'
   }
   ```

3. **统一错误处理**: 所有 handler 方法抛出的错误会被自动捕获并返回 `{ success: false, error: string }` 格式。

---

**文档维护者**: Warp AI Agent  
**联系方式**: 如有疑问请查阅源码或更新本文档
