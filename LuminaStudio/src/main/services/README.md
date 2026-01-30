# Main Services 目录

## 职责
主进程业务逻辑层，按业务域组织。

## 规范
- 每个业务域一个 service 目录
- Service 负责具体的业务逻辑实现
- 与 IPC handler 解耦，便于测试和复用

## 示例结构
```
services/
├── file-service/
│   ├── index.ts
│   └── types.ts
├── database-service/
│   ├── index.ts
│   └── types.ts
├── logger/
│   └── index.ts
└── README.md
```

## 使用方式
```typescript
// file-service/index.ts
export class FileService {
  async readFile(path: string): Promise<string> {
    // 实现文件读取逻辑
  }
}

export const fileService = new FileService()
```
