# Types 目录

## 职责

存放跨业务域的公共类型（契约/DTO 等）。

## 原则

- 仅在模块内部使用的类型应就近放置（如 `stores/domain/*.types.ts`）
- 一旦某类型被多个解耦业务域引用，必须提升到此目录

## 注意

- **跨进程类型定义**应放在 `src/preload/types/`，这是唯一权威的跨进程类型定义来源
- 本目录仅存放 renderer 层内部的公共类型

## 示例结构

```
types/
├── common.ts
├── ui.ts
└── README.md
```
