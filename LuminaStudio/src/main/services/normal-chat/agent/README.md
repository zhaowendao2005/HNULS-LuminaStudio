# normal-chat agent 目录

## 目录职责

这里放的是 normal-chat 的 **agent 模板层与其最小 framework 契约**。

- `Agents/`：模板真身目录。`base-chat-agent/graph.ts` 是当前唯一主视图，直接承载 agent 循环、分支和调用点提示词。
- `registry/`：只负责把 `templateKey` 映射到某个模板真身，不再经过中间 `templates/` 目录。
- `contracts/`：graph 与 runtime framework 的最小边界契约。
- `runtime/`：兼容转发层，保留旧入口名，真正实现已下沉到 `src/main/services/normal-chat/runtime/`。
- `trace/`：最小 trace recorder。

## 当前架构边界

当前 normal-chat 的原则是：

1. `base-chat-agent/graph.ts` 是唯一模板真身，也是维护者阅读和调整 agent 设计的主入口。
2. graph 内的提示词直接写在调用点附近，不再拆成 planner / role-prompt / templates 小文件。
3. `runtime` 只提供 framework 能力：helper 执行、child-agent 派发、JSON repair/validate、tree 更新、stream/persistence。
4. helper 自己拥有 `description / schemaPrompt / progressivePrompt / execute`，graph 在调用点追加 overlay。
5. `registry` 只返回模板，不承载模板逻辑。

换句话说：

- **graph 决定“怎么想、怎么循环、怎么收口”**
- **runtime 决定“这些决定怎么被执行”**
- **helper 决定“某个能力自己是什么、怎么调用”**

## 目录结构

```text
agent/
├── README.md
├── contracts/
│   └── index.ts
├── registry/
│   ├── index.ts
│   └── index.test.ts
├── runtime/
│   ├── index.ts
│   └── normal-chat-conversation.runtime.ts
├── trace/
│   └── index.ts
└── Agents/
    └── base-chat-agent/
        ├── index.ts
        ├── graph.ts
        └── functioncall/
            ├── bindings.ts
            ├── index.ts
            └── index.test.ts
```

## 读取顺序

1. `Agents/base-chat-agent/graph.ts`
2. `registry/index.ts`
3. `contracts/index.ts`
4. `src/main/services/normal-chat/runtime/agent-session-manager.ts`
5. `src/main/services/normal-chat/functioncalls/helpers/`

## 维护原则

- 不要再把模板 graph 拆到 `templates/` 或 planner 小文件里。
- graph 里的提示词如果不需要复用，就直接写在调用点附近。
- runtime 不要新增模板业务判断。
- helper 的 `description/schema/progressive/execute` 不要回流到 graph 之外的其它业务层。
