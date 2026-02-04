# Preload Bridge 目录

## 职责

聚合所有 API 并通过 `contextBridge` 安全暴露给渲染进程。

## 规范

- 通过 `contextBridge.exposeInMainWorld('api', ...)` 暴露
- 处理 context isolation 兼容
- 最小权限原则，只暴露渲染进程真正需要的能力

## 示例结构

```
bridge/
├── index.ts
└── README.md
```

## 示例代码

```typescript
// index.ts
import { contextBridge } from 'electron'
import { fileAPI } from '../api/file-api'
import { databaseAPI } from '../api/database-api'

contextBridge.exposeInMainWorld('api', {
  file: fileAPI,
  database: databaseAPI
})
```
