# LuminaStudio

Electron + Vue + TypeScript desktop application.

## Install

```bash
pnpm install
```

## Development

```bash
pnpm dev
```

## Build

```bash
pnpm build:win
pnpm build:mac
pnpm build:linux
```

## OrchestraFlow

OrchestraFlow is now definition/registry-driven instead of relying on scattered legacy helpers or runtime descriptors.

- Shared authority lives under `src/Public/ShareTypes/Orchestraflow-types/`.
- External consumers should import public APIs from `@shared/Orchestraflow-types`.
- `index.ts` is the stable barrel entry for shared OrchestraFlow types, definitions, authoring contracts, and registry helpers such as `resolveOFNodeDefinition()` and `listOFNodeDefinitions()`.
- Built-in node behavior is described in `builtins/*.definition.ts`, then consumed by editor defaults, variable selection, AI schema export, and runtime binding.
- `src/Public/ShareTypes/Orchestraflow-types/blueprint/` owns Blueprint DSL, compiler, validator, and schema assets.
- `src/Public/ShareTypes/Orchestraflow-types/mechanisms/` owns selector/edge/container/variable global rules.
- `src/Public/ShareTypes/Orchestraflow-types/agent-context/` builds section-based context packs and renderers for requirement / blueprint / edit agents.

Recommended reading order for OrchestraFlow:

1. `src/Public/ShareTypes/Orchestraflow-types/index.ts`
2. `src/Public/ShareTypes/Orchestraflow-types/node-definition.ts`
3. `src/Public/ShareTypes/Orchestraflow-types/node-definition-registry.ts`
4. `src/Public/ShareTypes/Orchestraflow-types/mechanisms/index.ts`
5. `src/Public/ShareTypes/Orchestraflow-types/blueprint/index.ts`
6. `src/Public/ShareTypes/Orchestraflow-types/agent-context/index.ts`
7. `src/renderer/src/stores/orchestraflow/workflow-editor/workflow-editor.store.ts`

## OrchestraFlow Checks

```bash
pnpm exec tsc -p tsconfig.json --noEmit
pnpm test:orchestraflow
pnpm lint:orchestraflow
```

`pnpm lint:orchestraflow` is the fast architecture guard for shared OrchestraFlow types, utility runtime code, and renderer stores. Use `pnpm lint:orchestraflow:fix` when the fixable rules are enough.
