import { compileOFBlueprintSectionDslAst, parseOFBlueprintSectionDsl } from './section-dsl'
import type {
  OFBlueprintTextAst,
  OFBlueprintTextCompileResult,
  OFBlueprintTextParseResult
} from './types'

/**
 * 保留 text-dsl 这个稳定入口名，避免牵动上层调用点；
 * 但从现在开始它只代理新版 OFT/1 section DSL。
 */
export function parseOFBlueprintTextDsl(sourceText: string): OFBlueprintTextParseResult {
  return parseOFBlueprintSectionDsl(sourceText)
}

/**
 * 这里的 ast 已经只可能是 OFT/1 section ast。
 */
export function compileOFBlueprintTextAst(ast: OFBlueprintTextAst): OFBlueprintTextCompileResult {
  return compileOFBlueprintSectionDslAst(ast)
}

export function compileOFBlueprintTextDsl(sourceText: string): OFBlueprintTextCompileResult {
  const parseResult = parseOFBlueprintTextDsl(sourceText)
  if (!parseResult.ast) {
    return {
      ...parseResult,
      blueprint: null,
      runnable: null
    }
  }

  const compileResult = compileOFBlueprintTextAst(parseResult.ast)
  return {
    ...compileResult,
    diagnostics: [...parseResult.diagnostics, ...compileResult.diagnostics],
    valid: parseResult.diagnostics.length === 0 && compileResult.valid
  }
}
