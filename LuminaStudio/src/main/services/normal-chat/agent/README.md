# normal-chat agent 目录

## 目录职责

这里现在只保留 **agent 模板层与 framework 边界契约**。

- `Agents/`：模板适配层。当前 `base-chat-agent/graph.ts` 已经不再承载主循环，只负责声明模板能力并调用 `core/orchestrator`。
- `registry/`：提供默认助手 profile 与默认 suite。
- `contracts/`：graph 与 runtime framework 的桥接契约，应该尽量保持薄。

## 当前真实架构

normal-chat 现在的主阅读路径已经改成：

1. `src/main/services/normal-chat/core/types.ts`
2. `src/main/services/normal-chat/core/state-machine.ts`
3. `src/main/services/normal-chat/core/planner.ts`
4. `src/main/services/normal-chat/core/orchestrator.ts`
5. `src/main/services/normal-chat/runtime/conversation-runtime.ts`
6. `src/preload/types/normal-chat/conversation.types.ts`
7. `src/preload/types/normal-chat/runtime-trace.types.ts`
8. `src/preload/types/normal-chat/runtime.types.ts`

也就是说：

- **core 决定“系统怎么想、怎么循环、怎么收口”**
- **runtime 决定“请求生命周期、落库、流式事件怎么发”**
- **agent 目录只保留模板适配和最小 bridge 契约**

## 目录结构

```text
agent/
├── README.md
├── contracts/
│   └── index.ts
├── registry/
│   ├── index.ts
│   └── index.test.ts
└── Agents/
    └── base-chat-agent/
        ├── index.ts
        ├── graph.ts
        └── functioncall/
            ├── bindings.ts
            ├── index.ts
            └── index.test.ts
```

## 维护原则

- 不要再把主循环逻辑塞回 `graph.ts`。
- 不要在 `contracts/index.ts` 重新累积无实际调用的旧类型。
- 模板适配层只声明 helper binding 和最终回答生成，不负责执行控制。
- 需要新增系统级行为时，优先改 `core/`，不要在 agent 目录散落新逻辑。
