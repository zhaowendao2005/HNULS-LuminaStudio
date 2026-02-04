# Renderer 目录

## 职责

渲染进程，负责 UI 展示和用户交互。

## 目录结构

```
renderer/
└── src/
    ├── components/     # 全局通用组件
    ├── views/          # 页面视图（映射 UI 布局）
    ├── stores/         # Pinia 状态管理（SSOT）
    ├── service/        # 服务层（可选）
    ├── composables/    # 组合式函数（可选）
    ├── types/          # 公共类型
    ├── assets/         # 静态资源
    ├── App.vue
    └── main.ts
```

## 核心原则

### 1. 组件分类

- **components/**：全局通用组件，可在多个页面复用
- **views/**：页面级组件，目录结构映射 UI 布局

### 2. 状态管理

- **stores/**：Pinia store 是业务数据的唯一权威来源（SSOT）
- 避免在多处复制状态
- 通过 datasource 适配数据来源

### 3. 样式规范

- 优先使用 Tailwind CSS
- 每个组件根容器必须包含定位类
- 定位类格式：`{页面简写}-{功能区域}`

### 4. 可选目录

- **service/**：纯函数工具、底层服务（默认不使用）
- **composables/**：复杂/共享逻辑（默认不使用）

## 开发规范

### 组件开发

```vue
<!-- Good: 包含定位类 + Tailwind -->
<template>
  <div class="kb-doc-list flex flex-col gap-4 p-4">
    <h1 class="text-2xl font-bold">文档列表</h1>
    <!-- 组件内容 -->
  </div>
</template>

<script setup lang="ts">
import { useDocumentStore } from '@renderer/stores/document/document.store'

const documentStore = useDocumentStore()
</script>
```

### Store 开发

```typescript
// stores/document/document.store.ts
import { defineStore } from 'pinia'
import { documentDataSource } from './document.datasource'

export const useDocumentStore = defineStore('document', {
  state: () => ({
    documents: []
  }),

  actions: {
    async fetchDocuments() {
      this.documents = await documentDataSource.getAll()
    }
  }
})
```

### 使用 API

```typescript
// 类型安全的 API 调用
import type { ReadFileResult } from '@preload/types'

const result: ReadFileResult = await window.api.file.readFile('/path/to/file')
```

## 路径别名

- `@renderer/*` → `src/renderer/src/*`
- `@preload/types` → `src/preload/types`

## 参考文档

- 各目录详细说明：查看对应目录下的 `README.md`
- 项目规范：`_Rules&&Workflows/rules/base-rules.md`
