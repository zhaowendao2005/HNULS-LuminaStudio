---
name: ripgrep-mcp-analyst
description: Use when Codex needs structured code search, code navigation, symbol definition lookup, reference tracing, or Vue/Electron contract analysis in real repositories. Especially useful for TypeScript, JavaScript, Vue, and Electron projects when `ripgrep-mcp` is available and the task should follow a coarse-to-fine workflow before reading source files in detail.
---

# ripgrep-mcp-analyst

Use `ripgrep-mcp` as the default analysis surface. Start broad, narrow quickly, then switch to AST only when syntax or semantics matter.

Read [references/tools.md](references/tools.md) for tool summaries, [references/workflows.md](references/workflows.md) for standard procedures, and [references/examples.md](references/examples.md) for concrete patterns.

## Tool Selection Principles

- Use `list_searchable_files`, `files_with_matches`, or `count_matches` before any detailed query.
- Use `search_literal`, `search_regex`, or `search_pcre2` to narrow files and confirm text patterns.
- Use `ast_find_symbols`, `ast_find_references`, `ast_trace_ipc_contract`, and `ast_trace_vue_component_contract` only after scope is small or symbol-level precision is required.
- Fall back to default tools only when `ripgrep-mcp` cannot inspect the needed content or when a file must be read in full.
- Avoid broad AST scans and avoid opening many full files before narrowing candidates.

## Recommended Workflow

1. Explore project shape first.
2. Narrow candidate files with text search.
3. Locate precise definitions with AST.
4. Trace references or contracts only after a target is confirmed.
5. Read only the minimum source needed to explain or verify the result.

## AST Boundaries

- AST is appropriate for functions, classes, interfaces, type aliases, enums, stores, props, emits, IPC channels, and bridge APIs.
- AST is not the first choice for prose, logs, prompts, arbitrary strings, or broad template semantics.
- Prefer `mode="fast"` for exploration.
- Use `mode="precise"` for reference tracing and final confirmation.
- Prefer `candidatePaths` whenever candidate files are already known.

## Output Strategy

- Return structured findings first, then expand with code only when needed.
- If nothing matches, explain the current scope and filters before broadening the search.
- When multiple candidates match, group by path and symbol kind before summarizing behavior.
