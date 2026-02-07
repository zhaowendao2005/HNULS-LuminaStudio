/**
 * 组件调试组合式函数
 *
 * 在当前 agent 下创建一个测试对话，自动发送消息并模拟完整流式响应，
 * 覆盖所有消息类型组件：用户消息、深度思考、工具调用、流式文本（Markdown）、Token 统计、操作按钮。
 * 不调用任何真实 API。
 */
import { ref } from 'vue'
import { useAiChatStore } from '@renderer/stores/ai-chat/store'
import { useChatMessageStore } from '@renderer/stores/ai-chat/chat-message/store'
import type { AiChatStreamEvent } from '@preload/types'

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function generateHash(): string {
  return Math.random().toString(36).substring(2, 10)
}

// ===================== 测试数据 =====================

const USER_INPUT =
  '请帮我全面分析 LuminaStudio 的架构设计，搜索最新的前端技术趋势，并给出详细的优化建议。包括代码示例和性能对比数据。'

const THINKING_CONTENTS = [
  '用户需要对 LuminaStudio 进行全面的架构分析。这是一个基于 Electron + Vue 3 + TypeScript 的桌面端 AI 对话应用，我需要从多个维度来思考这个问题，包括前端架构、状态管理、性能优化以及最新的技术趋势。',
  '当前技术栈：Vue 3 Composition API + Pinia 状态管理 + Electron 主进程/渲染进程分离 + TypeScript 全栈类型安全。项目采用了 electron-vite 构建工具链，支持 HMR 热更新，这是一个比较现代的选择。',
  '前端架构方面需要关注几个核心要素：1) 组件设计模式——是否遵循单一职责原则，组件粒度是否合适；2) 状态管理策略——Pinia store 的拆分是否清晰，是否存在状态冗余；3) 性能优化——虚拟滚动、懒加载、Web Worker 使用情况；4) 代码质量——类型安全覆盖率、错误处理完整性。',
  '我还需要搜索最新的前端技术趋势。2024-2025 年前端领域有几个重要方向：Signals 响应式原语、Islands Architecture、Server Components 在桌面端的类比应用、AI 辅助开发工具链。这些趋势对 LuminaStudio 的架构演进有直接参考价值。',
  '让我先通过工具搜索一些最新资料，然后结合代码分析结果给出综合性的优化建议。我会从代码级别、架构级别和工程化级别三个层次来组织建议内容。'
]

const TOOL_SEARCH_RESULTS = {
  results: [
    {
      title: '2024-2025 Frontend Architecture Trends & Best Practices',
      snippet:
        'Vue 3 Composition API with <script setup> has become the de facto standard. Key trends include fine-grained reactivity (Vue Vapor Mode), partial hydration patterns, and AI-augmented development workflows.'
    },
    {
      title: 'Electron Performance Optimization Guide (2025 Edition)',
      snippet:
        'IPC optimization through batched messaging reduces overhead by 40%. SharedArrayBuffer enables zero-copy data transfer. V8 snapshot for faster startup. ContextBridge security best practices updated for Electron 30+.'
    },
    {
      title: 'State Management in Modern Vue Applications',
      snippet:
        'Pinia composable stores with module decomposition outperform monolithic stores. Recommended: domain-driven store splitting, optimistic updates for streaming UI, and computed-based derived state to avoid redundant watchers.'
    }
  ]
}

const TOOL_ANALYSIS_RESULT = {
  summary:
    '已分析 LuminaStudio 渲染进程源码，共扫描 47 个文件，18 个 Vue 组件，6 个 Store 模块，3 个 Composable。',
  metrics: {
    componentCount: 18,
    storeModules: 6,
    composables: 3,
    typeScriptCoverage: '94.2%',
    avgComponentLines: 127
  },
  issues: [
    { severity: 'warning', message: '部分组件超过 200 行，建议进一步拆分' },
    { severity: 'info', message: '消息列表未使用虚拟滚动，大量消息时可能有性能问题' },
    { severity: 'info', message: 'IPC 调用缺少统一错误处理中间件' }
  ]
}

// 流式文本内容，会被拆分为多个 delta
const FULL_TEXT_CONTENT = `# LuminaStudio 架构分析报告

## 1. 当前架构概览

LuminaStudio 基于 **Electron + Vue 3 + TypeScript** 技术栈构建，采用经典的主进程/渲染进程分离架构。项目使用 \`electron-vite\` 作为构建工具，实现了高效的 HMR 开发体验。

### 1.1 项目结构总览

| 模块 | 文件数 | 核心职责 |
|------|--------|---------|
| renderer | 23 | 渲染进程 UI 层 |
| main | 12 | 主进程 & IPC 通信 |
| preload | 8 | 安全桥接层 |
| utility | 4 | 后台工具进程 |

### 1.2 技术栈评估

当前选型整体 **评分 8.5/10**，主要亮点：

- ✅ Vue 3 Composition API + \`<script setup>\` 语法
- ✅ Pinia 模块化状态管理
- ✅ TypeScript 全栈类型安全（覆盖率 94.2%）
- ✅ Tailwind CSS 原子化样式方案
- ⚠️ 缺少虚拟滚动优化
- ⚠️ IPC 通信缺少统一错误中间件

## 2. 前端技术趋势分析

> 2024-2025 年前端领域最显著的趋势是 **细粒度响应式** 和 **AI 辅助工程化**。Vue Vapor Mode 的推进使得 Vue 在性能层面进一步对齐 Solid.js 等框架。

### 2.1 关键趋势

1. **Vue Vapor Mode** —— 编译时优化，去除虚拟 DOM 开销
2. **Signals 原语** —— 细粒度更新，减少不必要的组件重渲染
3. **Islands Architecture** —— 部分交互式区域独立水合
4. **AI-Augmented DX** —— AI 代码补全、自动重构、智能测试生成

### 2.2 对 LuminaStudio 的启示

这些趋势意味着未来可以：
- 将消息渲染组件迁移到 Vapor Mode 获得 **30-50%** 渲染性能提升
- 使用 Web Worker 处理 Markdown 解析，避免阻塞 UI 线程
- 引入增量渲染策略应对长消息流

## 3. 具体优化建议

### 3.1 消息列表性能优化

**当前问题：** 消息数量增长后 DOM 节点线性增加，导致滚动卡顿。

**优化方案：** 引入虚拟滚动

\`\`\`typescript
// 虚拟滚动实现示例
import { useVirtualList } from '@vueuse/core'

const { list, containerProps, wrapperProps } = useVirtualList(
  messages,
  {
    itemHeight: (index) => estimateMessageHeight(messages[index]),
    overscan: 5
  }
)
\`\`\`

**预期收益：** DOM 节点从 O(n) 降至 O(1)，1000+ 消息时帧率从 ~24fps 提升至稳定 60fps。

### 3.2 状态管理优化

**Before（旧模式）：**

\`\`\`javascript
// ❌ 单体 Store，职责混杂
const useStore = defineStore('main', () => {
  const messages = ref([])
  const agents = ref([])
  const conversations = ref([])
  const isGenerating = ref(false)
  // ... 200+ 行
})
\`\`\`

**After（推荐模式）：**

\`\`\`javascript
// ✅ 领域驱动拆分
const useChatMessageStore = defineStore('chat-message', () => {
  // 只关注消息状态和流式事件处理
})

const useAgentStore = defineStore('agent', () => {
  // 只关注 Agent 和 Conversation 管理
})
\`\`\`

### 3.3 IPC 通信优化

\`\`\`typescript
// 批量 IPC 中间件
class IPCBatcher {
  private queue: IPCCall[] = []
  private timer: ReturnType<typeof setTimeout> | null = null

  enqueue(call: IPCCall): Promise<unknown> {
    return new Promise((resolve, reject) => {
      this.queue.push({ ...call, resolve, reject })
      this.flush()
    })
  }

  private flush(): void {
    if (this.timer) return
    this.timer = setTimeout(() => {
      const batch = this.queue.splice(0)
      ipcRenderer.invoke('batch-ipc', batch)
        .then(results => batch.forEach((c, i) => c.resolve(results[i])))
        .catch(err => batch.forEach(c => c.reject(err)))
      this.timer = null
    }, 16) // 一帧内合并
  }
}
\`\`\`

### 3.4 构建优化

| 优化项 | 当前 | 优化后 | 提升 |
|-------|------|--------|------|
| 冷启动时间 | ~3.2s | ~1.8s | **44%** |
| 首屏渲染 | ~1.1s | ~0.6s | **45%** |
| 内存占用 | ~180MB | ~120MB | **33%** |
| 包体积 | ~85MB | ~62MB | **27%** |

## 4. 实施路线图

### Phase 1（1-2 周）
- [ ] 消息列表虚拟滚动
- [ ] IPC 错误处理中间件
- [ ] Store 拆分完善

### Phase 2（3-4 周）
- [ ] Web Worker Markdown 解析
- [ ] 增量渲染引擎
- [ ] V8 Snapshot 启动优化

### Phase 3（5-8 周）
- [ ] Vue Vapor Mode 迁移评估
- [ ] SharedArrayBuffer IPC
- [ ] E2E 测试覆盖

---

*以上分析基于当前代码库状态（v0.3.x），数据来源于静态分析工具和基准测试。建议按 Phase 优先级逐步实施，每个 Phase 完成后进行回归测试。*`

export function useComponentDebug() {
  const aiChatStore = useAiChatStore()
  const messageStore = useChatMessageStore()

  const isRunning = ref(false)
  const progress = ref('')

  /**
   * 向 messageStore 分发一个模拟的流式事件
   */
  function emit(event: AiChatStreamEvent): void {
    messageStore.handleStreamEvent(event)
  }

  /**
   * 将长文本拆分为小片段用于模拟流式输出
   */
  function splitTextToDeltas(text: string, chunkSize = 3): string[] {
    const deltas: string[] = []
    for (let i = 0; i < text.length; i += chunkSize) {
      deltas.push(text.slice(i, i + chunkSize))
    }
    return deltas
  }

  /**
   * 运行完整组件测试流程
   */
  async function runFullComponentTest(): Promise<void> {
    if (isRunning.value) return

    isRunning.value = true
    progress.value = '初始化测试环境...'

    const hash = generateHash()
    const conversationId = `test-conv-${hash}`
    const requestId = `test-req-${hash}`

    try {
      // ====== Step 0: 设置测试对话环境 ======
      aiChatStore.currentConversationId = conversationId

      // ====== Step 1: 添加用户消息 ======
      progress.value = '发送用户消息...'
      messageStore.addUserMessage(conversationId, USER_INPUT)
      await sleep(300)

      // ====== Step 2: stream-start ======
      progress.value = '流式响应开始...'
      emit({
        type: 'stream-start',
        requestId,
        conversationId,
        providerId: 'openai',
        modelId: 'gpt-4o-2024-11-20',
        startedAt: new Date().toISOString()
      })
      await sleep(400)

      // ====== Step 3: 深度思考 (reasoning) ======
      progress.value = '模拟深度思考...'
      const reasoningId = `reasoning-${hash}`

      emit({ type: 'reasoning-start', requestId, id: reasoningId })
      await sleep(200)

      for (let i = 0; i < THINKING_CONTENTS.length; i++) {
        const deltas = splitTextToDeltas(THINKING_CONTENTS[i], 8)
        for (const delta of deltas) {
          emit({ type: 'reasoning-delta', requestId, id: reasoningId, delta })
          await sleep(15)
        }
        // 每条思考之间加换行和间隔
        if (i < THINKING_CONTENTS.length - 1) {
          emit({ type: 'reasoning-delta', requestId, id: reasoningId, delta: '\n' })
          await sleep(200)
        }
      }

      emit({ type: 'reasoning-end', requestId, id: reasoningId })
      await sleep(300)

      // ====== Step 4: 工具调用 1 — web_search ======
      progress.value = '模拟工具调用: web_search...'
      const toolId1 = `tool-search-${hash}`

      emit({
        type: 'tool-call',
        requestId,
        toolCallId: toolId1,
        toolName: 'web_search',
        input: { query: '2024-2025 frontend architecture trends Vue3 Electron best practices' }
      })
      await sleep(1200)

      emit({
        type: 'tool-result',
        requestId,
        toolCallId: toolId1,
        toolName: 'web_search',
        result: TOOL_SEARCH_RESULTS
      })
      await sleep(400)

      // ====== Step 5: 工具调用 2 — code_analysis (使用 delta 模拟流式参数) ======
      progress.value = '模拟工具调用: code_analysis...'
      const toolId2 = `tool-analysis-${hash}`
      const argsText =
        '{"target":"LuminaStudio/src/renderer","analysis_type":"architecture","depth":"full"}'

      // 先通过 delta 逐步推送参数
      const argChunks = splitTextToDeltas(argsText, 12)
      for (const chunk of argChunks) {
        emit({
          type: 'tool-call-delta',
          requestId,
          toolCallId: toolId2,
          toolName: 'code_analysis',
          argsTextDelta: chunk
        })
        await sleep(50)
      }
      await sleep(800)

      // 然后返回结果
      emit({
        type: 'tool-result',
        requestId,
        toolCallId: toolId2,
        toolName: 'code_analysis',
        result: TOOL_ANALYSIS_RESULT
      })
      await sleep(500)

      // ====== Step 6: 流式文本输出 (Markdown) ======
      progress.value = '模拟流式文本输出...'
      const textDeltas = splitTextToDeltas(FULL_TEXT_CONTENT, 4)

      for (let i = 0; i < textDeltas.length; i++) {
        emit({ type: 'text-delta', requestId, delta: textDeltas[i] })
        // 代码块区域略慢，模拟打字效果
        const char = textDeltas[i]
        const delay = char.includes('```') ? 30 : char.includes('\n') ? 12 : 5
        await sleep(delay)

        // 每输出 20% 更新进度
        if (i % Math.floor(textDeltas.length / 5) === 0) {
          const pct = Math.min(100, Math.round((i / textDeltas.length) * 100))
          progress.value = `流式文本输出中... ${pct}%`
        }
      }
      await sleep(300)

      // ====== Step 7: finish ======
      progress.value = '完成!'
      emit({
        type: 'finish',
        requestId,
        finishReason: 'stop',
        messageId: `msg-final-${hash}`,
        usage: {
          inputTokens: 2048,
          outputTokens: 4096,
          reasoningTokens: 1280,
          totalTokens: 7424
        }
      })

      await sleep(1000)
      progress.value = ''
    } catch (err) {
      console.error('[ComponentDebug] 测试执行失败:', err)
      progress.value = `错误: ${err}`
    } finally {
      isRunning.value = false
    }
  }

  return {
    isRunning,
    progress,
    runFullComponentTest
  }
}
