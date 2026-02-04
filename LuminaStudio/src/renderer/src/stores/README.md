# Stores 目录

## 职责

Pinia 状态管理，作为**单一事实来源（SSOT）**。

## 原则

- 一个业务域的数据状态只能有一个权威来源（Pinia store）
- 避免多处复制导致数据不一致
- 通过 `datasource` 适配数据来源，支持开发/生产环境切换

## 推荐结构（按业务域组织）

```
stores/
├── user/
│   ├── user.store.ts
│   ├── user.datasource.ts
│   ├── user.types.ts
│   └── user.mock.ts (可选)
├── document/
│   ├── document.store.ts
│   └── document.datasource.ts
└── README.md
```

## 使用方式

```typescript
import { useUserStore } from '@renderer/stores/user/user.store'

const userStore = useUserStore()
```
