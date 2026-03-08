# OrchestraFlow AI Schema

这里是 OrchestraFlow 给外部 AI 使用的可运行工作流导出层。

核心规则：

- 外部 AI 最终写的是可直接落盘的 `OFWorkflow` JSON
- `registry.ts` 是节点目录入口。新增节点时，先补这里
- `builder.ts` 负责导出给 AI 的 runnable workflow schema / example / prompt bundle
- `compiler.ts` 仍保留为内部辅助生成器，用于从更高层结构生成最终 graph
- `iteration-start` 和 `loop-start` 虽然是内部节点，但在最终 runnable JSON 里必须真实存在

为什么这样做：

- 最终目标不是中间格式，而是 AI 生成后可以直接放进工作流目录运行
- registry 保证节点目录和运行时注册集中，避免 schema 与执行器脱节
- builder 负责把这些约束输出成 AI 可直接遵循的 runnable workflow 规范
