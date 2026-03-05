---
name: message-components-creator
description: Create or refactor LuminaStudio chat message UI components using the MessageComponents-* naming convention, split component-specific state into chat-message/message-components-store modules, add per-component mock cases under chat-message-mock, and wire DevPage registry-based debugging.
---
## 目标

统一 LuminaStudio 消息组件体系，确保新增/重构消息组件时遵循同一套规范：

1. 命名统一为 `MessageComponents-*`
2. 组件私有状态从大 store 中剥离
3. 每个组件都有独立 mock 演示
4. DevPage 自动发现并生成调试入口

## 目录约定

- 消息组件目录：`src/renderer/src/views/LuminaApp/Maincontent/NormalChat/NormalChat-Maincontent/ChatMain-Message/`
- 组件状态目录：`src/renderer/src/stores/ai-chat/chat-message/message-components-store/`
- 组件 mock 目录：`src/renderer/src/stores/ai-chat/chat-message/chat-message-mock/`
- 组件渲染分发器：`ChatMain-Message/index.vue`
- 组件调试页：`RightPanel/DevPage.vue`

## 命名规范

1. 主消息组件文件：`MessageComponents-{Name}.vue`
2. 从属辅助组件文件：`MessageComponents-{Owner}-{Name}.vue`
3. 组件状态 store：`{Owner}-store.ts`
4. 组件 mock 文件：`MessageComponents-{Name}.mock.ts`

示例：

- 主组件：`MessageComponents-KnowledgeSearch.vue`
- 辅助组件：`MessageComponents-KnowledgeSearch-DetailDialog.vue`
- store：`KnowledgeSearch-store.ts`
- mock：`MessageComponents-KnowledgeSearch.mock.ts`

## 三阶段实施流程

### 阶段一：组件重命名与引用收敛

1. 将 `ChatMain-Message` 下消息组件统一改名为 `MessageComponents-*`
2. 在 `ChatMain-Message/index.vue` 中仅 import `MessageComponents-*` 组件
3. 在 `ChatMain.vue` 中替换辅助组件引用（例如 DetailDialog）
4. 保持 `ChatMain-Message/index.vue` 只做分发渲染，不承载复杂业务状态

### 阶段二：组件状态拆分

1. 识别属于某个消息组件的 UI 状态（弹窗开关、展开收起、本地过滤等）
2. 在 `message-components-store` 中新增对应 store 模块
3. 组件内部改为读取该模块状态，不再在 `chat-message/store.ts` 中承载
4. `chat-message/store.ts` 保留消息流与通用消息状态，不放组件局部 UI 状态

建议边界：

- 放在组件 store：组件私有 UI 状态
- 放在 chat-message/store：消息列表、流式事件、消息块更新

### 阶段三：mock 体系与 DevPage 自动调试

1. 每个组件新增一个 `MessageComponents-*.mock.ts`
2. 每个 mock 导出 `mockCase`，包含：
- `id`
- `label`
- `description`
- `order`
- `buildMessages`
- `onApply`（可选）
3. 在 `chat-message-mock/index.ts` 使用：
- `import.meta.glob('./MessageComponents-*.mock.ts', { eager: true })`
4. DevPage 从注册表读取 `cases` 自动渲染按钮
5. 保留“调试全部组件”入口，按 `order` 顺序渲染所有组件示例

## 代码模板

### 组件 store 模板

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useXxxMessageStore = defineStore('chat-message-component-xxx', () => {
  const visible = ref(false)
  function open(): void {
    visible.value = true
  }
  function close(): void {
    visible.value = false
  }
  return { visible, open, close }
})
```

### mock 模板

```ts
import type { MessageComponentMockCase } from './types'
import type { ChatMessage } from '../types'

export const mockCase: MessageComponentMockCase = {
  id: 'xxx',
  label: 'Xxx',
  description: 'Xxx 组件演示',
  order: 10,
  buildMessages: (): ChatMessage[] => [
    {
      id: 'mock-xxx-1',
      role: 'assistant',
      status: 'final',
      blocks: [{ type: 'text', content: 'mock content' }]
    }
  ]
}
```

## 禁止事项

1. 不要新增不符合 `MessageComponents-*` 的消息组件命名
2. 不要把组件局部 UI 状态继续堆进 `chat-message/store.ts`
3. 不要在 DevPage 手写固定按钮列表（必须走自动发现）
4. 不要只做组件不做 mock（每个组件必须可演示）

## 验收清单

1. 组件命名是否全部符合规范
2. `ChatMain-Message/index.vue` 是否只引用 `MessageComponents-*`
3. 新增组件是否有对应 `message-components-store`（如需要状态）
4. 新增组件是否有对应 `MessageComponents-*.mock.ts`
5. DevPage 是否能自动出现该组件调试按钮
6. `npm run typecheck:web` 是否通过（若失败，需注明非本次改动问题）
