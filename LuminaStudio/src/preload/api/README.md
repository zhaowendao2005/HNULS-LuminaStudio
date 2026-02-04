# Preload API 目录

## 职责

按业务域拆分的 API 层，负责 IPC 通信。

## 规范

- 每个业务域一个 API 文件（如 `file-api.ts`、`database-api.ts`）
- API 命名使用 `xxxAPI`，方法使用 camelCase
- 方法名与 IPC channel 对应

## API 层职责边界

API 层只负责：

- 参数验证
- 类型转换
- IPC 通信

## 禁止

- 在 API 层吞掉业务错误
- 做复杂业务逻辑

## 示例结构

```
api/
├── file-api.ts
├── database-api.ts
├── window-api.ts
└── README.md
```

## 示例代码

```typescript
// file-api.ts
export const fileAPI = {
  async readFile(path: string): Promise<string> {
    return ipcRenderer.invoke('file:read', path)
  }
}
```
