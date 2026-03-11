import type { OFRunnableWorkflow } from '@shared/Orchestraflow-types'
import { assertOFRunnableWorkflow } from '@shared/Orchestraflow-types'

/**
 * OrchestraFlow 工作流 JSON/JSONC 解析辅助。
 *
 * 长期规则：
 * - 只支持 `//` 行注释和行尾注释。
 * - 不引入 JSON5 等更宽松语法，避免工作流文件契约继续膨胀。
 */
export function stripJsonLineComments(content: string): string {
  let result = ''
  let inString = false
  let escaped = false
  let inLineComment = false

  for (let index = 0; index < content.length; index += 1) {
    const current = content[index]
    const next = content[index + 1]

    if (inLineComment) {
      if (current === '\r' || current === '\n') {
        inLineComment = false
        result += current
      }
      continue
    }

    if (inString) {
      result += current
      if (escaped) {
        escaped = false
      } else if (current === '\\') {
        escaped = true
      } else if (current === '"') {
        inString = false
      }
      continue
    }

    if (current === '"') {
      inString = true
      result += current
      continue
    }

    if (current === '/' && next === '/') {
      inLineComment = true
      index += 1
      continue
    }

    result += current
  }

  return result
}

export function parseJsonc<T>(content: string): T {
  try {
    return JSON.parse(stripJsonLineComments(content)) as T
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Invalid workflow JSON after stripping // comments: ${reason}`)
  }
}

export function parseRunnableWorkflowJsonc(content: string): OFRunnableWorkflow {
  return assertOFRunnableWorkflow(parseJsonc<unknown>(content))
}
