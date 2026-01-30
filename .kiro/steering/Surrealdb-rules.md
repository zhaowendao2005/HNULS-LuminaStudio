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