# OrchestraFlow AI Schema

This directory exports the AI-facing runnable workflow contract for OrchestraFlow.

## Current Model

- External AI should produce strict `OFRunnableWorkflow` JSON.
- Shared schema and shared node definitions come from `@shared/Orchestraflow-types`.
- `builder.ts` assembles the compact AI bundle from generated schema, shared definition metadata, authoring defaults, and contract summaries.
- `compiler.ts` remains an internal helper that converts the higher-level AI DSL into runnable workflow JSON.
- `registry.ts` and `runtime-binding-registry.ts` keep the AI schema layer aligned with the shared definition system.
- `iteration-start` and `loop-start` are internal nodes, but they still exist in the runnable graph and must be represented accurately.

## Architectural Rules

- Do not reintroduce a separate legacy descriptor source for node behavior.
- Prefer definition metadata from `builtins/*.definition.ts` when describing system-managed fields, selector policies, output policies, and omit rules.
- Keep `prompt_markdown` compact; use `schema` and `annotated_workflow_jsonc` for full structure guidance.
- External callers should consume shared public APIs from `@shared/Orchestraflow-types`, not deep private paths.

## Fast Verification

```bash
pnpm test:orchestraflow
pnpm lint:orchestraflow
```
