# Preload 目录

## 职责
预加载脚本，作为主进程和渲染进程之间的桥梁，安全地暴露 API 给渲染进程。

## 目录结构
```
preload/
├── api/              # API 层（按业务域拆分）
├── bridge/           # Bridge 层（聚合暴露）
├── types/            # 跨进程类型定义（唯一权威来源）
├── index.ts          # Preload 入口
├── index.d.ts        # 类型声明
└── README.md
```

## 核心原则

### 1. 类型定义（types/）
- **唯一权威**的跨进程类型定义来源
- 所有跨进程通信的类型必须在此定义
- `index.d.ts` 自动导入并重新导出所有类型

### 2. API 层（api/）
- 按业务域拆分（如 `file-api.ts`、`database-api.ts`）
- 只负责参数验证、类型转换、IPC 通信
- 禁止在 API 层做复杂业务逻辑

### 3. Bridge 层（bridge/）
- 聚合所有 API
- 通过 `contextBridge` 安全暴露给渲染进程
- 最小权限原则

## 开发流程

### 添加新 API
1. 在 `types/` 定义类型
2. 在 `api/` 创建 API 文件
3. 在 `bridge/index.ts` 注册 API
4. 类型会自动同步到渲染进程

### 示例代码

#### 1. 定义类型
```typescript
// types/file.types.ts
export interface ReadFileOptions {
  encoding?: string
}

export interface ReadFileResult {
  content: string
  size: number
}
```

#### 2. 创建 API
```typescript
// api/file-api.ts
import { ipcRenderer } from 'electron'
import type { ReadFileOptions, ReadFileResult } from '../types/file.types'

export const fileAPI = {
  async readFile(path: string, options?: ReadFileOptions): Promise<ReadFileResult> {
    return ipcRenderer.invoke('file:read', path, options)
  }
}
```

#### 3. 注册到 Bridge
```typescript
// bridge/index.ts
import { contextBridge } from 'electron'
import { fileAPI } from '../api/file-api'

const api = {
  file: fileAPI
}

contextBridge.exposeInMainWorld('api', api)

export type API = typeof api
```

#### 4. 在渲染进程使用
```typescript
// 类型安全的调用
const result = await window.api.file.readFile('/path/to/file')
```

## 安全原则
- 只暴露必要的 API
- 验证所有输入参数
- 不要暴露敏感的系统能力
- 使用 `contextBridge` 而不是直接挂载到 window
