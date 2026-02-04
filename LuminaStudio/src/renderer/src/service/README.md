# Service 目录

## 职责

服务层，封装服务与纯函数工具。

## 使用说明

- **默认不使用**：除非开发者明确声明需要使用，否则不强制使用
- render 层的 `service` 在开发中使用较少

## 允许的使用场景

- 纯函数工具（格式化、计算等）
- 有状态的底层服务（连接管理、进度 Map、资源池等）

## 禁止

- 把本应在 store 的业务状态长期藏在 service 里导致 UI 无法追踪真相

## 示例结构

```
service/
├── format/
│   └── date.ts
├── validation/
│   └── form.ts
└── README.md
```
