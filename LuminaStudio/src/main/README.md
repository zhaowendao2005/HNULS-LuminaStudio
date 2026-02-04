# Main Process 目录

## 职责

Electron 主进程，负责应用生命周期管理、窗口管理、系统级操作和 IPC 通信。

## 目录结构

```
main/
├── ipc/              # IPC 处理器（按业务域拆分）
├── services/         # 业务逻辑层
├── index.ts          # 主进程入口
└── README.md
```

## 核心职责

1. **应用生命周期管理**：启动、退出、更新等
2. **窗口管理**：创建、销毁、显示、隐藏窗口
3. **IPC 通信**：处理来自渲染进程的请求
4. **系统级操作**：文件系统、数据库、网络等
5. **Utility Process 管理**：启动和管理独立子进程

## 开发规范

### IPC Handler

- 按业务域拆分到 `ipc/` 目录
- 统一在 `ipc/index.ts` 注册
- Handler 只负责接收请求和调用 service

### Service

- 业务逻辑实现放在 `services/` 目录
- 与 IPC handler 解耦，便于测试和复用
- 按业务域组织

### 入口文件（index.ts）

- 应用初始化
- 注册 IPC handlers
- 创建主窗口
- 处理应用事件

## 示例代码

### 主进程入口

```typescript
import { app } from 'electron'
import { registerAllHandlers } from './ipc'

app.whenReady().then(() => {
  // 注册所有 IPC handlers
  registerAllHandlers()

  // 创建窗口
  createWindow()
})
```

### IPC Handler

```typescript
// ipc/file-handler.ts
import { ipcMain } from 'electron'
import { fileService } from '../services/file-service'

export function registerFileHandlers() {
  ipcMain.handle('file:read', async (event, path: string) => {
    return await fileService.readFile(path)
  })
}
```

### Service

```typescript
// services/file-service/index.ts
export class FileService {
  async readFile(path: string): Promise<string> {
    // 实现文件读取逻辑
  }
}

export const fileService = new FileService()
```
