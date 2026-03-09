# OrchestraFlow Utility Runtime

This directory contains the Utility Process runtime for OrchestraFlow. It is the execution layer, not the authority for shared schema shape.

## What Owns What

- `src/Public/ShareTypes/Orchestraflow-types/`
  - Single shared authority for runnable types, node definitions, variable definitions, authoring metadata, and the built-in definition registry.
- `src/utility/orchestraflow/`
  - Runtime execution, AI schema export, compiler helpers, node implementations, and variable storage.
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
4. `src/utility/orchestraflow/ai-schema/builder.ts`
5. `src/utility/orchestraflow/ai-schema/compiler.ts`
6. `src/utility/orchestraflow/nodes/node-factory.ts`
7. `src/utility/orchestraflow/services/variable-store.ts`

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
- `ai-schema/builder.ts`
  - Exports the AI-facing runnable workflow bundle from shared schema + definition metadata.

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
