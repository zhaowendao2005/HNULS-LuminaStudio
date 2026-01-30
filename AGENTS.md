---
inclusion: always
trigger: always_on
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 
# 第一点 我让你给我计划 基本上都是让你根据我的已经深度的研究项目的相关组件和代码 之后给我提出一个方案或者计划 不需要你创建任何文件 直接告诉我即可

---
inclusion: always
trigger: always_on
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 

# 项目基本原则（Rules）草案 

## 0. 权威来源与适用范围（必须遵守）

- **[权威来源]**
  - `_Documents/Base/Temeplate.md`：目录职责、工程原则、类型/视图/stores/service/composables 等总体规范。
  - `KnowledgeDatabase-src/src/main/**/README.md`
  - `KnowledgeDatabase-src/src/preload/**/README.md`（注意：preload 的 README 分散在子目录）
  - `KnowledgeDatabase-src/src/renderer/**/README.md`
- **[冲突处理]**
  - 若本 Rules 与上述权威来源冲突：以权威来源为准，并要求**同步更新本 Rules**，避免双重标准。
- **[适用范围]**
  - 对所有开发者与 agent 生效：新增代码、修改代码、重构、目录调整、引入依赖、IPC 增删等都必须遵守。

---

## 1. 目录结构与文件放置（强制）

### 1.1 顶层目录禁止"散乱文件"
- **必须**：任何新增代码都归档到明确的业务目录中。
- **禁止**：在 `src` 顶层或模块顶层随意堆放未归类文件。

### 1.2 Renderer（`src/renderer/src`）目录职责（强制）
- `components/`：**公共组件**（全局通用 UI 组件）。
- `views/`：**页面视图**（页面级组件），目录结构必须严格映射 UI/DOM 布局。
- `stores/`：Pinia 状态管理，**单一事实来源**。
- `service/`：服务层（封装服务与纯函数工具）。
- `composables/`：组合式函数（复杂/共享逻辑复用）。
- `types/`：跨业务域的公共类型（契约/DTO 等）。

> 原则：类型、逻辑、服务、视图各司其职；若不确定放哪里，优先遵循"就近原则"，但跨域复用必须提升到 `types/` 或 `service/`。

### 1.3 Utility Process（`src/utility/`）目录职责（强制）
- **定义**: 存放所有通过 `utilityProcess.fork()` 启动的独立子进程微服务。
- **原则**: 
  - 该目录下的代码运行在**独立的 Node 环境与 Event Loop** 中。
  - **严禁**直接引用 `electron` 主进程特有模块（如 `BrowserWindow`, `app` 等），除非是纯类型引用。
  - 必须拥有独立的 `entry.ts` 作为进程入口。
- **通信**: 必须通过 Electron IPC (`net.Socket` / `MessagePort`) 与主进程通信，禁止直接共享内存对象。

---

## 2. 命名与组织方式（强制）

### 2.1 公共组件（Renderer `components/`）
- **必须**：
  - 组件目录 `PascalCase` 命名（例如 `BaseButton/`）。
  - 每个组件一个目录，入口文件固定为 `index.vue`。
  - 组件内部私有类型放在组件目录内（不污染全局）。
- **禁止**：公共组件直接扔一个 `.vue` 在 `components/` 根下。

### 2.2 Views（页面结构必须"对齐 DOM"）
- **必须**：`views/` 下的目录结构映射实际 UI 布局，这样观察界面即可定位代码。
- **禁止**：为了"复用"把页面内部结构打散成难以追踪的组件树（除非提升为公共组件或抽出 composable/service 有明确收益）。

---

## 3. 类型系统（Type System）规则（强制）

### 3.1 跨进程类型定义（核心）
- **权威来源**：`src/preload/types/` 是**唯一权威**的跨进程类型定义来源。
- **自动生成**：`src/preload/index.d.ts` 应该自动导入并重新导出所有类型，确保类型同步。
- **使用方式**：
  ```typescript
  // 前端使用
  import type { SomeType } from '@preload/types'
  
  // preload 实现
  import type { SomeType } from './types'
  ```
- **类型组织**：按业务域分文件，保持单一职责。

### 3.2 局部私有类型：就近放置
- **必须**：仅在模块内部使用的类型放在模块内部（例如 `stores/domain/*.types.ts` 或组件目录内）。
- **必须**：一旦某类型被多个解耦业务域引用，必须提升到 `@preload/types` 中。

---

## 4. Stores & Datasource（强制）

### 4.1 单一事实来源（SSOT）
- **必须**：一个业务域的数据状态只能有一个"权威来源"（Pinia store），避免多处复制导致不一致。

### 4.2 Datasource 解耦（开发/生产数据源切换）
- **必须**：store 通过 `datasource` 适配数据来源，以支持在后端/IPC 不就绪时也能推进前端开发。
- **建议结构**（模板约定）：
  - `xxx.store.ts`
  - `xxx.datasource.ts`
  - `xxx.types.ts`
  - `xxx.mock.ts`

---

## 5. Service / Composables（强制边界）
### 5.0 特别说明
- **服务层使用规范**：
  - render 层的 `service` 和 `composables` 在开发中使用较少
  - **默认不使用**：除非开发者明确声明需要使用，否则不强制使用
  - 如果使用，必须遵守以下规则

### 5.1 `service/`
- **允许**：
  - 纯函数工具（格式化、计算等）
  - 有状态的底层服务（连接管理、进度 Map、资源池等），但其"业务状态"仍应回流 store（如需要展示/响应式）。
- **禁止**：把本应在 store 的业务状态长期藏在 service 里导致 UI 无法追踪真相。

### 5.2 `composables/`
- **必须**：
  - 复杂/共享逻辑（生命周期管理、跨组件复用、窗口事件监听等）抽到 composables。
- **允许**：
  - 若逻辑很小且强 UI 相关，可直接写在 `.vue` 内。
- **禁止**：为"看起来高级"而把简单逻辑过度抽象到 composables（过度设计）。

---

## 6. Preload 规范（强制）

### 6.1 API 按业务域拆分
- **必须**：每个业务域一个 API 文件（如 `file-api.ts` / `database-api.ts` / `window-api.ts`）。
- **必须**：API 命名 `xxxAPI`，方法 camelCase，并与 IPC channel 对应。

### 6.2 API 层职责边界
- **API 层只负责**：
  - 参数验证
  - 类型转换
  - IPC 通信
- **禁止**：在 API 层吞掉业务错误、做复杂业务逻辑。

### 6.3 Bridge 聚合与安全暴露
- **必须**：通过 `contextBridge.exposeInMainWorld('api', ...)` 暴露；并处理 context isolation 兼容。
- **必须**：最小权限原则，只暴露渲染进程真正需要的能力。

### 6.4 Preload 类型自动生成
- **必须**：`src/preload/index.d.ts` 自动导入并重新导出所有类型定义
- **类型同步**：确保 `@preload/types` 中的类型与 IPC 接口保持同步
- **文档生成**：基于类型定义自动生成 API 文档

---

## 7. Renderer 组件开发规则：Tailwind + 定位类（强制）

### 7.1 Tailwind 使用方式
- **必须**：页面私有组件（views 下的内部组件）优先直接在标签 `class=""` 中使用 Tailwind，便于管理与维护。
- **允许**：公共组件在需要抽象时进行适度封装，但仍优先保持 class 可读与可追踪。

### 7.2 定位类（Locator Class）规则（强制） 
目标：在 Web DevTools 中能通过 selector 快速定位到代码，同时保持代码可维护性。

- **必须**：每个 Vue 组件的**根容器**（template 最外层元素）包含一个"定位类"。
- **命名规范**：
  - 前缀：`根分页简写 类似于kb 就是knowledege分页的根分页简写 如果后面有usersetting 那么可以用us-`
  - 主体：功能区域（如 `doc-list`、`editor-toolbar`）

- **定位类定义**：
  - **无样式意义**：类名不表达任何样式意图，仅用于定位
  - **有业务含义**：包含功能区域标识以提高可读性
  - **全局唯一**：通过随机后缀确保全局唯一性

- **实施要求**：
  ```vue
  <!-- Good -->
  <template>
    <div class="kb-doc-list flex flex-col">
      <!-- 组件内容 -->
    </div>
  </template>

  <!-- Bad: 缺少定位类 -->
  <div class="flex flex-col">...</div>
  
  <!-- Bad: 类名有样式含义 -->
  <div class="kb-blue-card">...</div>
  ```

---

## 8. Agent/开发协作协议（强制）

### 8.1 需求沟通
- **你**：用较短需求描述目标（不要求你写很长）。
- **我/agent**：
  - 必须先给出"我理解的需求 + 关键假设"
  - 必须做**适量补充**以闭合逻辑链，避免明显漏洞
  - **禁止**：过度设计、引入无关复杂度、把需求扩写成大而全 PRD

### 8.2 草案与执行边界
- **必须**：多轮讨论得到可实施草案后，才进入执行。
- **必须**：你明确"执行多少就执行多少"（文件范围/功能范围/是否改动结构）。
- **必须**：进入执行阶段后，我会连续完成你指定范围内的任务，**不中途停下频繁询问**。
- **例外（允许打断）**：发现阻塞性缺信息、或会造成安全/数据损坏/大面积重构风险时，必须先停下向你确认。

---

## 9. 规则变更制度（强制）

- **必须**：任何新增目录规则、命名规则、跨层通信规则，都要同步更新本 Rules 或对应 README，确保"规则可追溯且唯一"。
- **禁止**：只口头约定、不落文档，导致后续 agent/新人无法按形式推进。

---



---
inclusion: fileMatch
fileMatchPattern:
  - '**/surrealdb-service/**/*.ts'
  - '**/services/**/query-service.ts'
  - '**/services/base-service/app-service.ts'
  - '**/ipc/index.ts'
  - '**/main/index.ts'
  - '**/services/knowledgeBase-library/**/*.ts'
  - '**/services/model-config/**/*.ts'
  - '**/services/user-config-service/**/*.ts'
trigger: model_decision
---
<!------------------------------------------------------------------------------------
   Add rules to this file or a short description and have Kiro refine them for you.
   
   Learn about inclusion modes: https://kiro.dev/docs/steering/#inclusion-modes
-------------------------------------------------------------------------------------> 
# 单一实例统一注入
# SurrealDB 服务实例管理注意事项

## 核心原则：单一实例，统一注入

### ⚠️ 关键问题
**不要在多处创建 Service 实例！** 这会导致：
- 依赖注入失效（如 QueryService 未注入）
- 状态不一致（多个实例各自维护状态）
- 资源浪费和潜在的并发问题

---

## 正确的架构模式

### 1. 服务实例的创建与管理
```
AppService (单例管理中心)
  ├─ SurrealDBService (单例)
  │   └─ QueryService (单例)
  ├─ KnowledgeLibraryService (单例)
  │   └─ 需要注入 QueryService
  └─ 其他服务...
```

### 2. 依赖注入流程
```typescript
// ✅ 正确：在 AppService 中统一管理
class AppService {
  private surrealDBService: SurrealDBService
  private knowledgeLibraryService: KnowledgeLibraryService
  
  async initialize() {
    // 1. 启动 SurrealDB
    await this.surrealDBService.start()
    
    // 2. 获取 QueryService
    const queryService = this.surrealDBService.getQueryService()
    
    // 3. 注入到需要的服务
    this.knowledgeLibraryService.setQueryService(queryService)
  }
  
  // 暴露实例供其他模块使用
  getKnowledgeLibraryService() { return this.knowledgeLibraryService }
}
```

### 3. IPC Handler 使用服务实例
```typescript
// ❌ 错误：在 IPCManager 中创建新实例
initialize() {
  const knowledgeLibraryService = new KnowledgeLibraryService() // 新实例，没有 QueryService！
  this.handlers.push(new KnowledgeLibraryIPCHandler(knowledgeLibraryService))
}

// ✅ 正确：使用 AppService 提供的实例
initialize(surrealDBService, knowledgeLibraryService) {
  // 使用传入的已注入依赖的实例
  this.handlers.push(new KnowledgeLibraryIPCHandler(knowledgeLibraryService))
}
```

---

## 检查清单

### 创建新服务时必须检查：
1. **是否需要 QueryService？**
   - 需要操作 SurrealDB → 必须注入 QueryService
   - 只读配置文件 → 不需要

2. **在哪里创建实例？**
   - 在 `AppService.constructor()` 中创建
   - 在 `AppService.initialize()` 中注入依赖

3. **如何暴露给 IPC？**
   - 在 `AppService` 中添加 getter 方法
   - 在 `IPCManager.initialize()` 中接收参数
   - 在 `main/index.ts` 中传入实例

### 调试时的日志检查：
```typescript
// 在服务中添加调试日志
setQueryService(queryService: QueryService): void {
  this.queryService = queryService
  logger.info('QueryService injected', {
    isConnected: queryService?.isConnected(),
    hasQueryService: !!this.queryService
  })
}

// 在使用前检查
if (this.queryService) {
  logger.debug('QueryService available', {
    hasQueryService: !!this.queryService,
    isConnected: this.queryService?.isConnected()
  })
} else {
  logger.warn('QueryService not available')
}
```

---

## 常见错误模式

### ❌ 错误 1：多处创建实例
```typescript
// AppService 中
this.knowledgeLibraryService = new KnowledgeLibraryService()

// IPCManager 中又创建
const knowledgeLibraryService = new KnowledgeLibraryService() // 这是新实例！
```

### ❌ 错误 2：忘记注入依赖
```typescript
// 创建了实例但忘记注入
this.knowledgeLibraryService = new KnowledgeLibraryService()
// 缺少：this.knowledgeLibraryService.setQueryService(queryService)
```

### ❌ 错误 3：注入时机错误
```typescript
// QueryService 还未连接就注入
const queryService = this.surrealDBService.getQueryService()
this.knowledgeLibraryService.setQueryService(queryService)
await this.surrealDBService.start() // 太晚了！应该先 start
```

---

## 正确的初始化顺序

```typescript
async initialize() {
  // 1. 启动 SurrealDB 服务
  await this.surrealDBService.initialize()
  await this.surrealDBService.start()
  
  // 2. 获取已连接的 QueryService
  const queryService = this.surrealDBService.getQueryService()
  
  // 3. 注入到所有需要的服务
  this.knowledgeLibraryService.setQueryService(queryService)
  
  // 4. 初始化 IPC（传入已注入依赖的实例）
  this.ipcManager.initialize(
    this.surrealDBService,
    this.knowledgeLibraryService
  )
}
```

---

## 快速排查指南

**症状**：创建知识库时提示 "QueryService not available"

**排查步骤**：
1. 检查日志中是否有 "QueryService injected into KnowledgeLibraryService"
2. 检查 IPC Handler 使用的是否是同一个实例（添加实例 ID 日志）
3. 检查 `IPCManager.initialize()` 是否接收并使用了传入的实例
4. 检查 `main/index.ts` 是否传入了正确的实例