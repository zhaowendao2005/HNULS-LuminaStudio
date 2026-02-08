---
name: message-components-creator
description: Create or refactor LuminaStudio chat message UI components using the MessageComponents-* naming convention, split component-specific state into chat-message/message-components-store modules, add per-component mock cases under chat-message-mock, and wire DevPage registry-based debugging.
---
## Workflow

1. Create message component files with `MessageComponents-{Name}.vue` naming.
2. Create auxiliary component files with `MessageComponents-{Owner}-{Name}.vue` naming.
3. Keep `ChatMain-Message/index.vue` as the renderer/dispatcher and import only `MessageComponents-*` files.
4. Add component-owned state to `src/renderer/src/stores/ai-chat/chat-message/message-components-store/{Name}-store.ts`.
5. Keep stream/message domain state in `src/renderer/src/stores/ai-chat/chat-message/store.ts`.
6. Add one mock case file per component in `src/renderer/src/stores/ai-chat/chat-message/chat-message-mock/MessageComponents-{Name}.mock.ts`.
7. Export each mock case as `mockCase` and include `id`, `label`, `description`, `order`, `buildMessages`.
8. Let `chat-message-mock/index.ts` auto-discover mock files via `import.meta.glob('./MessageComponents-*.mock.ts', { eager: true })`.
9. Drive `RightPanel/DevPage.vue` from the discovered registry to generate one debug button per message component.
10. Keep one “run all components” action that renders all component demos in sequence.

## Naming Rules

- Main component: `MessageComponents-Text.vue`
- Owner auxiliary component: `MessageComponents-KnowledgeSearch-DetailDialog.vue`
- Component store: `KnowledgeSearch-store.ts`
- Component mock: `MessageComponents-KnowledgeSearch.mock.ts`

## Definition of Done

- All message component files follow `MessageComponents-*` naming.
- `ChatMain.vue` only references renamed component files.
- Component-owned UI state is moved to `message-components-store` modules.
- Every message component has a mock case.
- DevPage automatically lists all component mock entries without manual button coding.
