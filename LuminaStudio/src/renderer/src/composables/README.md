# Composables 目录

## 职责

组合式函数，用于复杂/共享逻辑复用。

## 使用说明

- **默认不使用**：除非开发者明确声明需要使用，否则不强制使用
- render 层的 `composables` 在开发中使用较少

## 适用场景

- 复杂/共享逻辑（生命周期管理、跨组件复用、窗口事件监听等）
- 若逻辑很小且强 UI 相关，可直接写在 `.vue` 内

## 禁止

- 为"看起来高级"而把简单逻辑过度抽象（过度设计）

## 示例结构

```
composables/
├── useWindowResize.ts
├── useDebounce.ts
└── README.md
```

## 使用方式

```typescript
import { useWindowResize } from '@renderer/composables/useWindowResize'

const { width, height } = useWindowResize()
```
