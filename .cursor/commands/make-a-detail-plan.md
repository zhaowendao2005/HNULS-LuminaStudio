
# AI 设计任务输出规范
## 适用场景：架构设计、技术方案、系统规划等需要分离"设计"与"实施"的任务

---

## 核心原则

### 1. 职责分离
- **高级 AI（策划者）**：输出技术设计方案，定义"做什么"和"如何做"
- **低级 AI/实施者（执行者）**：根据设计方案编写完整代码实现

### 2. 零自由发挥空间
设计方案必须精确到**不给实施者任何理解偏差的空间**，但又不陷入完整代码实现。

### 3. 高信息密度
每个字都应承载关键决策信息，严禁冗余描述、示例性的完整代码、或模糊的"建议性"表述。

---

## 强制输出结构

### 📋 第一部分：设计概览（必需）
```
【目标】：用一句话说明本次设计要解决的核心问题
【范围】：明确哪些在范围内，哪些不在范围内
【技术栈决策】：列出关键技术选型及选择理由（一行一个）
【架构模式】：采用的架构模式（如 MVC/MVVM/微服务/事件驱动等）
【核心约束】：技术约束、性能要求、兼容性要求（具体数值）
```

**示例（正确）**：
```
【目标】：实现小说搜索刮取模块的高级批处理功能
【范围】：在范围内：批量URL处理、进度追踪、错误重试；不在范围内：单URL刮取逻辑（已有）
【技术栈决策】：
  - 队列管理：使用 Promise.allSettled（原因：需要容错的并发控制）
  - 状态管理：Pinia store（原因：需要跨组件共享进度）
  - 持久化：IndexedDB（原因：大量中间结果需本地缓存）
【架构模式】：生产者-消费者模式（主线程生产任务，Worker 消费）
【核心约束】：
  - 并发数：可配置 1-10，默认 3
  - 单任务超时：30s
  - 内存占用：<200MB（处理 1000 条 URL 时）
```

**反例（错误，过于模糊）**：
```
目标：做一个批处理功能
技术栈：用 Vue 和一些工具库
要求：尽量快，不要出错
```

---

### 🏗️ 第二部分：模块划分与职责（必需）

**格式**：
```
模块树（用树形结构表示）：
<模块名>（职责：一句话）
  ├─ <子模块A>（职责：...）
  │   ├─ 输入：<精确的数据结构名>
  │   ├─ 输出：<精确的数据结构名>
  │   └─ 关键逻辑：<核心算法/流程的伪代码或关键步骤>
  └─ <子模块B>（职责：...）
      ├─ 依赖：<依赖哪些其他模块>
      └─ 错误处理：<如何处理失败情况>
```

**示例（正确）**：
```
批处理管理器（职责：协调批量任务的生命周期）
  ├─ 任务队列管理器（职责：维护待处理/进行中/已完成的任务队列）
  │   ├─ 输入：Array<{ url: string, priority: number }>
  │   ├─ 输出：TaskQueue { pending, running, completed, failed }
  │   └─ 关键逻辑：
  │       1. 按 priority 降序排序 pending 队列
  │       2. 从 pending 取任务填充 running（最多 concurrency 个）
  │       3. 任务完成后移至 completed/failed，回到步骤2
  │
  ├─ 进度追踪器（职责：计算并广播实时进度）
  │   ├─ 输入：订阅 TaskQueue 的状态变化事件
  │   ├─ 输出：Progress { total, completed, failed, percentage, estimatedTime }
  │   └─ 关键逻辑：
  │       percentage = (completed + failed) / total * 100
  │       estimatedTime = (total - completed - failed) * avgTimePerTask
  │
  └─ 错误重试控制器（职责：根据策略重试失败任务）
      ├─ 依赖：任务队列管理器
      ├─ 输入：失败任务 + 重试策略（maxRetries, backoff）
      └─ 错误处理：
          - 如果 retryCount < maxRetries：延迟 backoff^retryCount 秒后重新入队
          - 否则：标记为永久失败，记录到 failedTasks
```

**关键点**：
- 必须明确**输入输出的数据结构**（用 TypeScript 风格描述）
- 必须说明**关键逻辑**，但用伪代码/流程步骤，而非完整实现
- 必须定义**错误处理策略**，不留模糊

---

### 🔌 第三部分：关键接口定义（必需）

**格式**：
```typescript
// 仅提供类型签名 + JSDoc 注释，不提供实现

/**
 * <接口用途的一句话描述>
 * @注意事项 <关键约束/副作用/性能考量>
 */
interface/type/class 名称 {
  属性: 类型 // <用途说明>
  方法(参数: 类型): 返回类型 // <行为说明>
}
```

**示例（正确）**：
```typescript
/**
 * 批处理任务配置
 * @注意事项 concurrency 超过 10 会导致浏览器卡顿，需在 UI 层限制
 */
interface BatchTaskConfig {
  urls: string[]              // 待处理的 URL 列表，去重后传入
  concurrency: number          // 并发数，范围 1-10
  retryStrategy: RetryStrategy // 重试策略，见 RetryStrategy 定义
  onProgress: (progress: Progress) => void // 进度回调，每 500ms 触发一次
  onComplete: (results: TaskResult[]) => void // 完成回调，包含成功和失败
}

/**
 * 批处理管理器核心类
 * @注意事项 单例模式，全局仅一个实例，通过 getInstance() 获取
 */
class BatchProcessor {
  /** 启动批处理，返回可取消的 Promise */
  start(config: BatchTaskConfig): CancellablePromise<BatchResult>
  
  /** 暂停当前批处理（已运行的任务会完成） */
  pause(): void
  
  /** 恢复暂停的批处理 */
  resume(): void
  
  /** 取消批处理，清理所有资源 */
  cancel(): void
  
  /** 获取当前状态快照 */
  getSnapshot(): BatchSnapshot
}
```

**禁止**：
- ❌ 提供完整的方法实现
- ❌ 提供示例代码（除非是演示关键算法）
- ❌ 使用模糊类型（如 `any`, `object`），必须精确定义

---

### 📊 第四部分：数据流与状态机（必需）

**格式**：
```
数据流向：
  [起点] --(数据描述)--> [处理节点] --(数据描述)--> [终点]

状态机（如果有）：
  初始状态 -> [事件/条件] -> 目标状态
```

**示例（正确）**：
```
数据流向：
  [用户输入 URLs] 
    --(原始字符串数组)--> 
  [URL 验证器] 
    --(ValidatedURL[])--> 
  [任务队列管理器] 
    --(Task[])--> 
  [并发执行器] 
    --(Promise<TaskResult>[])--> 
  [结果聚合器] 
    --(BatchResult)--> 
  [UI 展示层/持久化层]

批处理状态机：
  IDLE（空闲）
    -> [调用 start()] -> RUNNING（运行中）
  
  RUNNING（运行中）
    -> [调用 pause()] -> PAUSED（暂停）
    -> [所有任务完成] -> COMPLETED（已完成）
    -> [调用 cancel()] -> CANCELLED（已取消）
  
  PAUSED（暂停）
    -> [调用 resume()] -> RUNNING（运行中）
    -> [调用 cancel()] -> CANCELLED（已取消）
  
  COMPLETED/CANCELLED（终态）
    -> [调用 start()] -> RUNNING（重新开始）
```

---

### ⚠️ 第五部分：关键决策点与实施注意事项（必需）

**格式**：
```
决策点 N：<问题描述>
  选择：<采用的方案>
  理由：<为什么这样选>
  实施要点：
    - <具体做法 1>
    - <具体做法 2>
  反模式：<明确禁止的做法>
```

**示例（正确）**：
```
决策点 1：并发控制如何实现？
  选择：使用信号量模式（Semaphore）而非简单的 Promise.all
  理由：需要动态控制并发数，且支持暂停/恢复
  实施要点：
    - 维护一个 runningCount 变量，范围 [0, concurrency]
    - 每次启动任务前检查 runningCount < concurrency
    - 使用 async/await + while 循环实现队列消费
    - 暂停时设置 isPaused 标志，消费循环检查此标志
  反模式：
    ❌ 不要用 Promise.all（无法动态控制）
    ❌ 不要用 setInterval 轮询（性能差）

决策点 2：失败任务如何重试？
  选择：指数退避 + 最大重试次数
  理由：避免瞬时错误导致任务失败，同时防止无限重试
  实施要点：
    - 初始延迟 1s，每次重试翻倍（1s, 2s, 4s, 8s...）
    - maxRetries 默认 3，可配置
    - 使用 setTimeout + Promise 实现延迟
    - 重试时需重新获取新的 scraper 实例（避免状态污染）
  反模式：
    ❌ 不要立即重试（可能是服务端限流）
    ❌ 不要无限重试（浪费资源）
```

---

### 🧪 第六部分：验收标准（必需）

**格式**：
```
功能验收：
  ✓ <具体的可验证行为 1>
  ✓ <具体的可验证行为 2>

性能验收：
  ✓ <具体的性能指标 + 测试条件>

边界条件验收：
  ✓ <异常情况的预期行为>
```

**示例（正确）**：
```
功能验收：
  ✓ 输入 100 个 URL，concurrency=5，所有任务完成后 completed + failed = 100
  ✓ 运行中调用 pause()，当前运行的任务会完成，新任务不启动
  ✓ 暂停后调用 resume()，队列从上次位置继续消费
  ✓ 失败任务重试 3 次后仍失败，最终标记为永久失败

性能验收：
  ✓ 处理 1000 个 URL（concurrency=3）时，内存占用 < 200MB（Chrome DevTools 测量）
  ✓ 进度回调触发频率 = 500ms ± 50ms（10 次测量的平均值）
  ✓ 单任务处理时间 < 5s（mock 数据测试）

边界条件验收：
  ✓ 输入空数组 []，立即触发 onComplete([])
  ✓ 输入包含重复 URL，自动去重后处理
  ✓ 所有任务失败（网络断开），onComplete 返回全部失败结果，不抛异常
  ✓ 运行中刷新页面，任务中断，不会有僵尸进程
```

---

## 代码片段使用规范

### ✅ 允许的代码片段类型

1. **类型定义**（TypeScript interface/type）：完整提供
2. **关键算法伪代码**：简化的逻辑表达，如：
   ```javascript
   // 伪代码：信号量控制并发
   while (queue.hasPending() && !isPaused) {
     if (runningCount < concurrency) {
       task = queue.dequeue()
       runningCount++
       executeTask(task).finally(() => runningCount--)
     } else {
       await waitForSlot() // 等待有空闲槽位
     }
   }
   ```

3. **关键数据结构示例**：
   ```javascript
   // 示例：任务队列的内部结构
   {
     pending: [{ id, url, priority, retryCount }, ...],
     running: Map<id, Promise>,
     completed: [{ id, result, duration }, ...],
     failed: [{ id, error, finalRetryCount }, ...]
   }
   ```

4. **配置对象示例**：
   ```javascript
   // 示例：默认配置
   const DEFAULT_CONFIG = {
     concurrency: 3,
     timeout: 30000,
     retryStrategy: { maxRetries: 3, backoff: 'exponential' }
   }
   ```

### ❌ 禁止的代码片段类型

1. **完整的函数实现**（超过 10 行的具体逻辑）
2. **UI 组件的模板代码**（除非是演示关键的响应式绑定）
3. **详细的错误处理代码**（只需说明策略，不要写 try-catch 块）
4. **导入语句、初始化代码**（这些是实施细节）

---

## 输出检查清单

在输出设计方案前，高级 AI 必须自查：

- [ ] 是否包含了六个必需部分？
- [ ] 所有接口的输入输出类型是否精确定义？
- [ ] 关键决策点是否给出了明确的实施要点和反模式？
- [ ] 是否存在模糊的"建议性"表述（如"可以考虑"、"尽量"）？
- [ ] 代码片段是否仅限于类型定义、伪代码、配置示例？
- [ ] 验收标准是否可量化、可验证？
- [ ] 总字数是否控制在合理范围（通常 1500-3000 字）？

---

## 反面案例警示

### ❌ 错误示例 1：过于详细（变成了代码实现）
```typescript
// 错误：这是完整实现，不是设计
class BatchProcessor {
  async start(config: BatchTaskConfig) {
    this.config = config
    this.queue = new TaskQueue(config.urls)
    
    while (this.queue.hasPending()) {
      if (this.runningCount < config.concurrency) {
        const task = this.queue.dequeue()
        this.executeTask(task)
          .then(result => this.handleSuccess(result))
          .catch(error => this.handleError(error))
        // ... 30 行具体代码
      }
    }
  }
}
```

**正确做法**：只给接口签名 + 关键逻辑的伪代码步骤。

---

### ❌ 错误示例 2：过于模糊（实施者无法执行）
```
需要做一个批处理功能，支持并发和重试。
建议使用队列模式，可以考虑用 Promise 或 async/await。
错误处理方面尽量做好，性能尽量优化。
```

**正确做法**：明确技术选型、数据结构、算法步骤、性能指标。

---

### ❌ 错误示例 3：信息密度低（大量废话）
```
批处理是一个非常重要的功能，在现代 Web 应用中广泛使用。
我们需要仔细设计这个模块，确保它具有良好的扩展性和可维护性。
首先，我们来看一下什么是批处理...（500 字背景介绍）
```

**正确做法**：直接进入技术要点，每句话都承载决策信息。

---

## 总结

**这个规则的本质目标**：
- 让高级 AI 输出的是"建筑设计图"，而不是"砖块"
- 让实施者**只需翻译成代码**，而不需要做架构决策
- 通过高信息密度，降低高级 AI 的 token 消耗
- 通过精确约束，避免实施阶段的理解偏差

**验证标准**：
一个合格的设计方案，应该让一个初级开发者（或低级 AI）能够：
1. 不需要问任何澄清性问题
2. 严格按照设计实现后，通过所有验收标准
3. 实现过程中不需要做任何架构级的决策
```

