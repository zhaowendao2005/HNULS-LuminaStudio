# Workflows

## Explore project entry points

1. Run `list_searchable_files` with a small `maxResults` and likely file types.
2. Run `files_with_matches` for `package.json`, `tsconfig`, framework configs, or entrypoint names.
3. Open only the top candidate files that explain the project structure.

## Find a symbol definition

1. Use `files_with_matches` or `search_regex` to narrow candidate files by name or declaration pattern.
2. Pass the resulting paths into `ast_find_symbols` via `candidatePaths`.
3. Use `mode="fast"` first; switch to `precise` only if disambiguation is needed.
4. Read the definition file only after the symbol list is stable.

## Trace a symbol reference

1. Locate the symbol with `ast_find_symbols`.
2. Copy the exact `path`, `line`, and optional `column` into `ast_find_references`.
3. Use `includeDefinition=true` only when the definition site matters in the final answer.
4. Read a small number of high-value reference sites to explain behavior.

## Trace Electron IPC

1. Use `files_with_matches` or `search_literal` to narrow on `ipcMain.handle`, `ipcRenderer.invoke`, or a channel string.
2. Pass those files into `ast_trace_ipc_contract`.
3. Filter by `channel` when known.
4. Confirm service methods or handler locations with targeted file reads if needed.

## Trace a Vue component contract

1. Narrow to the component file or directory with `files_with_matches` or `list_searchable_files`.
2. Call `ast_trace_vue_component_contract` with `path` or `componentName`.
3. Enable `includeStores` and `includeChildComponents` when dependency analysis matters.
4. Read the component source only if the contract output is incomplete.

## Trace a type contract chain

1. Find type definitions with `ast_find_symbols`.
2. Trace usage with `ast_find_references`.
3. Use text search to connect the type to API members, IPC channels, or config keys.
4. Summarize by contract path rather than by raw match count.
