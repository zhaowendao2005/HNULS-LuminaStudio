# Utility Process 目录

## 定义

存放所有通过 `utilityProcess.fork()` 启动的独立子进程微服务。

## 核心原则

- 该目录下的代码运行在**独立的 Node 环境与 Event Loop** 中
- **严禁**直接引用 `electron` 主进程特有模块（如 `BrowserWindow`、`app` 等），除非是纯类型引用
- 必须拥有独立的 `entry.ts` 作为进程入口

## 通信规范

- 必须通过 Electron IPC (`net.Socket` / `MessagePort`) 与主进程通信
- 禁止直接共享内存对象

## 示例结构

```
utility/
├── worker-service/
│   ├── entry.ts
│   ├── core/
│   └── types.ts
├── indexer-service/
│   ├── entry.ts
│   └── core/
└── README.md
```

## 启动方式

```typescript
// 在主进程中
import { utilityProcess } from 'electron'
import path from 'path'

const worker = utilityProcess.fork(path.join(__dirname, '../utility/worker-service/entry.js'))
```
