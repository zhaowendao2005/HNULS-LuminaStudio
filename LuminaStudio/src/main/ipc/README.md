# Main IPC 目录

## 职责

主进程 IPC 处理器，按业务域拆分。

## 规范

- 每个业务域一个 handler 文件（如 `file-handler.ts`、`database-handler.ts`）
- Handler 负责接收 IPC 请求并调用对应的 service
- 统一错误处理

## 示例结构

```
ipc/
├── base-handler.ts
├── file-handler.ts
├── database-handler.ts
├── error-handler-util.ts
├── index.ts
└── README.md
```

## 示例代码

```typescript
// file-handler.ts
import { ipcMain } from 'electron'
import { fileService } from '../services/file-service'

export function registerFileHandlers() {
  ipcMain.handle('file:read', async (event, path: string) => {
    return await fileService.readFile(path)
  })
}
```
