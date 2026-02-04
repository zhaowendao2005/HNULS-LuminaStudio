# Preload Types 目录

## 职责

**唯一权威**的跨进程类型定义来源。

## 核心原则

- 所有跨进程通信的类型必须在此定义
- `src/preload/index.d.ts` 应自动导入并重新导出所有类型
- 按业务域分文件，保持单一职责

## 类型组织

- 每个业务域一个类型文件（如 `file.types.ts`、`database.types.ts`）
- 类型命名清晰，避免歧义

## 使用方式

```typescript
// 前端使用
import type { SomeType } from '@preload/types'

// preload 实现
import type { SomeType } from './types'
```

## 示例结构

```
types/
├── base.types.ts
├── file.types.ts
├── database.types.ts
├── index.ts
└── README.md
```
