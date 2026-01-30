# Views 目录

## 职责
存放**页面级组件**，目录结构必须严格映射 UI/DOM 布局。

## 原则
- 目录结构对齐实际 UI 布局，便于通过界面定位代码
- 页面内部结构不要过度拆分，除非提升为公共组件或抽出 composable/service 有明确收益
- 每个页面组件的根容器必须包含定位类（Locator Class）

## 定位类规范
- 命名格式：`{页面简写}-{功能区域}`
- 示例：`kb-doc-list`（知识库文档列表）、`us-profile`（用户设置-个人资料）
- 定位类无样式意义，仅用于快速定位代码

## 示例结构
```
views/
├── Home/
│   └── index.vue
├── Settings/
│   ├── index.vue
│   └── UserProfile/
│       └── index.vue
└── README.md
```

## 使用方式
```vue
<template>
  <div class="kb-doc-list flex flex-col">
    <!-- 页面内容 -->
  </div>
</template>
```
