# OrchestraFlow Utility Runtime

This directory contains the Utility Process runtime for OrchestraFlow. It is the execution layer, not the authority for shared schema shape.

## What Owns What

- `src/Public/ShareTypes/Orchestraflow-types/`
  - Single shared authority for runnable types, node definitions, mechanism definitions, Blueprint DSL, planning framework, and the built-in registries.
- `src/main/services/orchestflow-generation-editor/llm-client/prompt-sources/`
  - Agent 私域提示词组装层；从 shared definitions 读取真源并组装成 analysis / design / edit agent prompt。
- `src/utility/orchestraflow/`
  - Runtime execution, node implementations, runtime bindings, and variable storage.
- `src/renderer/src/stores/orchestraflow/`
  - Editor state, normalization, node config stores, and variable selection UI.

The important architectural shift is that OrchestraFlow is now definition/registry-driven:

- built-in nodes are described in `builtins/*.definition.ts`
- runtime code consumes shared definitions instead of maintaining a parallel descriptor system
- editor defaults, derived fields, and selectable variables are computed from the same shared contracts

## Recommended Reading Order

1. `src/Public/ShareTypes/Orchestraflow-types/index.ts`
2. `src/Public/ShareTypes/Orchestraflow-types/node-definition.ts`
3. `src/Public/ShareTypes/Orchestraflow-types/node-definition-registry.ts`
4. `src/Public/ShareTypes/Orchestraflow-types/mechanisms/index.ts`
5. `src/Public/ShareTypes/Orchestraflow-types/blueprint/index.ts`
6. `src/main/services/orchestflow-generation-editor/llm-client/prompt-sources/`
7. `src/utility/orchestraflow/nodes/node-factory.ts`
8. `src/utility/orchestraflow/services/variable-store.ts`

## Main Runtime Files

- `entry.ts`
  - Utility process entry. Handles process lifecycle and message dispatch.
- `messages.types.ts`
  - Main <-> Utility process message contracts.
- `manager/workflow-instance-manager.ts`
  - Creates workflow instances, runs graphs, emits progress, and handles stop requests.
- `services/executor.ts`
  - Execution coordinator for node-level work.
- `services/variable-store.ts`
  - Runtime variable pool and selector resolution.
- `nodes/node-factory.ts`
  - Resolves runtime node implementations. This should stay aligned with the shared node definition registry.
- `nodes/*.ts`
  - Concrete runtime behavior for each node type.
- `runtime-binding-registry.ts`
  - Runtime node binding registry; keeps utility execution aligned with shared node definitions.

## Cross-Layer Entry Points

- Main bridge: `src/main/services/orchestraflow-bridge/orchestraflow-bridge-service.ts`
- Main IPC: `src/main/ipc/orchestraflow-handler.ts`
- Preload API: `src/preload/api/orchestraflow-api.ts`
- Renderer stores: `src/renderer/src/stores/orchestraflow/`
- Shared barrel: `@shared/Orchestraflow-types`

## Rules For Extending OrchestraFlow

1. Add or update shared contracts first in `src/Public/ShareTypes/Orchestraflow-types/`.
2. Prefer public imports from `@shared/Orchestraflow-types`; do not bypass the barrel for normal consumers.
3. Put built-in node structure and authoring rules in `builtins/*.definition.ts`.
4. Let renderer stores and AI schema builder consume definitions instead of re-encoding business rules locally.
5. Run the focused checks before finishing:

```bash
pnpm exec tsc -p tsconfig.json --noEmit
pnpm test:orchestraflow
pnpm lint:orchestraflow
```
