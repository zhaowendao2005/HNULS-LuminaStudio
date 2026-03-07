# Examples

## Narrow first, then find a definition

Goal: find where `BaseIPCHandler` is defined.

1. Run `files_with_matches` with `query="BaseIPCHandler"` and `types=["ts"]`.
2. Feed those paths into `ast_find_symbols` with:
   - `name="BaseIPCHandler"`
   - `kinds=["class"]`
   - `candidatePaths=[...]`
   - `mode="precise"`
3. Read the winning file only after the symbol result is confirmed.

## Use `candidatePaths` for precise AST

Goal: avoid scanning an entire large repo for type declarations.

1. Run `files_with_matches` with `query="export interface"` or a symbol name.
2. Take the returned file list.
3. Call `ast_find_symbols` or `ast_find_references` with `candidatePaths`.
4. Keep `maxFiles` and `maxResults` small unless evidence says scope should expand.

## Find `BaseIPCHandler` definitions and references

1. `ast_find_symbols`:
   - `name="BaseIPCHandler"`
   - `kinds=["class"]`
   - `mode="precise"`
2. `ast_find_references`:
   - use the exact symbol location from step 1
   - `includeDefinition=true`
3. Summarize inheritors and import sites separately.

## Trace `window:minimize` style IPC

1. Run `search_literal` or `files_with_matches` for `window:minimize`.
2. Pass the narrowed files into `ast_trace_ipc_contract` with `channel="window:minimize"`.
3. Report:
   - preload callsite
   - bridge exposure
   - main handler
   - nearby service calls

Do not claim complete tracing for computed or dynamically concatenated channel names.

## Extract Vue props, emits, and stores

1. Narrow to the target component file.
2. Run `ast_trace_vue_component_contract` with:
   - `path` or `componentName`
   - `includeStores=true`
   - `includeChildComponents=true`
3. Summarize:
   - props
   - emits
   - store usage
   - imported child components

Do not describe template semantics unless the source file is also inspected directly.
