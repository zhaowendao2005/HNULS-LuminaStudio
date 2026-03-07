# Tool Guide

## Scope discovery

### `list_searchable_files`

Use to confirm the effective file universe after `rootPath`, `types`, `globs`, hidden-file flags, and ignore handling.

Key fields:
- `rootPath`
- `types`
- `globs`
- `includeIgnored`

Use for:
- understanding project shape
- validating filters before deeper search

Avoid:
- using it as a substitute for content search

### `files_with_matches`

Use to cheaply narrow to files containing a literal or regex pattern.

Key fields:
- `query`
- `mode`
- `types`
- `maxResults`

Use for:
- first-pass candidate discovery
- preparing `candidatePaths` for AST tools

Avoid:
- jumping straight to full snippet search when file-level narrowing is enough

### `count_matches`

Use to estimate blast radius before reading snippets.

Key fields:
- `query`
- `mode`
- `countMode`
- `maxResults`

Use for:
- deciding whether a query is too broad
- comparing multiple search pivots quickly

Avoid:
- treating counts as proof of semantics

## Text search

### `search_literal`

Use for exact strings, exact identifiers, channels, hardcoded constants, and configuration keys.

Key fields:
- `query`
- `detailLevel`
- `beforeContext`
- `afterContext`

Use for:
- exact identifier lookup
- confirming string occurrences before AST

Avoid:
- using it for flexible syntax patterns

### `search_regex`

Use for common code-shaped patterns such as imports, function calls, and declaration forms.

Key fields:
- `query`
- `detailLevel`
- `types`
- `maxMatchesPerFile`

Use for:
- syntax-level narrowing
- identifying representative files before AST

Avoid:
- complex lookarounds better handled by `search_pcre2`

### `search_pcre2`

Use only when normal regex is insufficient.

Key fields:
- `query`
- `multiline`
- `detailLevel`

Use for:
- advanced lookarounds
- multiline hard patterns

Avoid:
- defaulting to it when `search_regex` is enough

## AST tools

### `ast_find_symbols`

Use to find true definitions rather than mentions.

Key fields:
- `name`
- `kinds`
- `exportedOnly`
- `mode`
- `candidatePaths`

Use for:
- locating classes, interfaces, types, functions, stores, props, emits
- disambiguating import noise from real declarations

Avoid:
- scanning a large repo in `precise` mode without narrowing first

### `ast_find_references`

Use after a target symbol is known.

Key fields:
- `symbol`
- `query`
- `includeDefinition`
- `candidatePaths`

Use for:
- impact analysis
- distinguishing `import`, `type_ref`, `call`, `read`, `write`

Avoid:
- using name-only lookup when you already have an exact symbol location

### `ast_trace_ipc_contract`

Use for direct Electron IPC tracing.

Key fields:
- `channel`
- `apiMember`
- `candidatePaths`
- `mode`

Use for:
- linking `ipcRenderer.invoke`, `contextBridge.exposeInMainWorld`, and `ipcMain.handle`
- checking nearby service calls

Avoid:
- over-claiming support for indirect or dynamically built channels

### `ast_trace_vue_component_contract`

Use for Vue SFC script contracts.

Key fields:
- `componentName`
- `path`
- `includeStores`
- `includeChildComponents`

Use for:
- extracting props, emits, store usage, and imported child components

Avoid:
- assuming template semantic analysis; this tool is script-focused
