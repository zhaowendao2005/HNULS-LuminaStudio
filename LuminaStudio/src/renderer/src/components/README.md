# Components 目录

## 职责
存放**全局通用 UI 组件**，可在多个页面/视图中复用。

## 规范
- 组件目录使用 `PascalCase` 命名（如 `BaseButton/`）
- 每个组件一个目录，入口文件固定为 `index.vue`
- 组件内部私有类型放在组件目录内，不污染全局
- 禁止直接在 `components/` 根目录下放置 `.vue` 文件

## 示例结构
```
components/
├── BaseButton/
│   ├── index.vue
│   └── types.ts (可选，组件私有类型)
├── BaseInput/
│   └── index.vue
└── README.md
```

## 使用方式
```vue
<script setup lang="ts">
import BaseButton from '@renderer/components/BaseButton'
</script>
```
