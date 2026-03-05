## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used in this project.

### Available skills
- anchor-trace-horizontal-extension: Start from an anchor file, trace dependencies upward and downward, identify processing vs pass-through layers, and output a minimal cross-layer feature extension plan. (file: ./.agent/skills/anchor-trace-horizontal-extension/SKILL.md)
- message-components-creator: Create or refactor LuminaStudio chat message UI components using the MessageComponents-* naming convention, split component-specific state into chat-message/message-components-store modules, add per-component mock cases under chat-message-mock, and wire DevPage registry-based debugging. (file: ./.agent/skills/message-components-creator/SKILL.md)
- model-graph-creator: Create or edit LuminaStudio models (graphs), including config schema, renderer UI, main/utility wiring, provider resolution, and message rendering. (file: ./.agent/skills/model-graph-creator/SKILL.md)
- project-overview: 快速了解本项目整体架构、目录结构、技术栈、数据库结构与 Agent 子系统。 (file: ./.agent/skills/project-overview/SKILL.md)
- structure-utils-node-creator: Create new nodes with the Structure/Utils split in LuminaStudio, including descriptors, registration, graph wiring, message rendering, and prompt/IO design. (file: ./.agent/skills/structure-utils-node-creator/SKILL.md)
- summarize: 总结当前项目状态并生成交接文档，帮助下一个 AI 快速接手工作。 (file: ./.agent/skills/summarize/SKILL.md)


## Rules
.agents\rules\base-rules.md