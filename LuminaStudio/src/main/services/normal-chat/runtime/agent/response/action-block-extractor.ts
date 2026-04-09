/**
 * 协议块扫描器
 *
 * 统一负责识别 assistant 响应中的协议围栏：
 * - ```normal_chat_action
 * - ```normal_chat_thinking
 *
 * 同一套扫描逻辑同时服务于：
 * - 流式阶段的“用户可见正文”增量提取
 * - 完整响应阶段的 action / thinking 块提取
 *
 * 这样可以避免“能执行，但流式正文没隐藏掉”的双轨漂移问题。
 */

export interface ExtractedActionBlock {
  rawJson: string
  start: number
  end: number
}

export interface ExtractedThinkingBlock {
  rawMarkdown: string
  start: number
  end: number
}

interface ProtocolBlockScanResult {
  visibleDelta: string
  actionBlocks: ExtractedActionBlock[]
  thinkingBlocks: ExtractedThinkingBlock[]
}

interface ScannedAssistantProtocolMarkdown {
  visibleBodyMarkdown: string
  actionBlocks: ExtractedActionBlock[]
  thinkingBlocks: ExtractedThinkingBlock[]
}

type FenceMode = 'plain' | 'visible' | 'hidden_action' | 'hidden_thinking'

function trimmedLine(line: string): string {
  return line.trimStart()
}

function isFenceLine(line: string): boolean {
  return trimmedLine(line).startsWith('```')
}

function isProtocolActionFenceStart(line: string): boolean {
  return trimmedLine(line).startsWith('```normal_chat_action')
}

function isProtocolThinkingFenceStart(line: string): boolean {
  return trimmedLine(line).startsWith('```normal_chat_thinking')
}

function isPreviewHiddenLine(line: string): boolean {
  const trimmed = trimmedLine(line)
  return (
    trimmed.startsWith('```normal_chat_action') ||
    trimmed.startsWith('```normal_chat_thinking') ||
    /^`{1,3}$/.test(trimmed)
  )
}

function createVisibleTail(line: string, previewLength: number): string {
  if (previewLength <= 0) {
    return line
  }
  if (previewLength >= line.length) {
    return ''
  }
  return line.slice(previewLength)
}

export class NormalChatAssistantProtocolStreamScanner {
  private currentFenceMode: FenceMode = 'plain'
  private currentLine = ''
  private currentLinePreviewLength = 0
  private currentLineStartOffset = 0
  private processedOffset = 0
  private hiddenBlockStartOffset: number | null = null
  private hiddenBlockLines: string[] = []

  feed(delta: string): ProtocolBlockScanResult {
    let visibleDelta = ''
    const actionBlocks: ExtractedActionBlock[] = []
    const thinkingBlocks: ExtractedThinkingBlock[] = []

    for (const char of delta) {
      if (this.currentLine.length === 0) {
        this.currentLineStartOffset = this.processedOffset
      }

      this.currentLine += char
      this.processedOffset += 1

      if (char === '\n') {
        const lineResult = this.flushCurrentLine()
        visibleDelta += lineResult.visibleDelta
        actionBlocks.push(...lineResult.actionBlocks)
        thinkingBlocks.push(...lineResult.thinkingBlocks)
      }
    }

    visibleDelta += this.previewCurrentLine()

    return {
      visibleDelta,
      actionBlocks,
      thinkingBlocks
    }
  }

  finish(): ProtocolBlockScanResult {
    if (!this.currentLine) {
      return {
        visibleDelta: '',
        actionBlocks: [],
        thinkingBlocks: []
      }
    }

    return this.flushCurrentLine()
  }

  private flushCurrentLine(): ProtocolBlockScanResult {
    const line = this.currentLine
    const previewLength = this.currentLinePreviewLength
    const lineStart = this.currentLineStartOffset
    const lineEnd = this.processedOffset

    this.currentLine = ''
    this.currentLinePreviewLength = 0
    this.currentLineStartOffset = this.processedOffset

    if (this.currentFenceMode === 'hidden_action' || this.currentFenceMode === 'hidden_thinking') {
      if (isFenceLine(line)) {
        const hiddenContent = this.hiddenBlockLines.join('').trim()
        const start = this.hiddenBlockStartOffset ?? lineStart
        this.hiddenBlockStartOffset = null
        this.hiddenBlockLines = []
        const completedKind = this.currentFenceMode
        this.currentFenceMode = 'plain'

        if (!hiddenContent) {
          return {
            visibleDelta: '',
            actionBlocks: [],
            thinkingBlocks: []
          }
        }

        return {
          visibleDelta: '',
          actionBlocks:
            completedKind === 'hidden_action'
              ? [
                  {
                    rawJson: hiddenContent,
                    start,
                    end: lineEnd
                  }
                ]
              : [],
          thinkingBlocks:
            completedKind === 'hidden_thinking'
              ? [
                  {
                    rawMarkdown: hiddenContent,
                    start,
                    end: lineEnd
                  }
                ]
              : []
        }
      }

      this.hiddenBlockLines.push(line)
      return {
        visibleDelta: '',
        actionBlocks: [],
        thinkingBlocks: []
      }
    }

    const visibleTail = createVisibleTail(line, previewLength)

    if (this.currentFenceMode === 'visible') {
      if (isFenceLine(line)) {
        this.currentFenceMode = 'plain'
      }

      return {
        visibleDelta: visibleTail,
        actionBlocks: [],
        thinkingBlocks: []
      }
    }

    if (isProtocolActionFenceStart(line)) {
      this.currentFenceMode = 'hidden_action'
      this.hiddenBlockStartOffset = lineStart
      this.hiddenBlockLines = []
      return {
        visibleDelta: '',
        actionBlocks: [],
        thinkingBlocks: []
      }
    }

    if (isProtocolThinkingFenceStart(line)) {
      this.currentFenceMode = 'hidden_thinking'
      this.hiddenBlockStartOffset = lineStart
      this.hiddenBlockLines = []
      return {
        visibleDelta: '',
        actionBlocks: [],
        thinkingBlocks: []
      }
    }

    if (isFenceLine(line)) {
      this.currentFenceMode = 'visible'
    }

    return {
      visibleDelta: visibleTail,
      actionBlocks: [],
      thinkingBlocks: []
    }
  }

  private previewCurrentLine(): string {
    if (!this.currentLine) {
      return ''
    }

    if (this.currentFenceMode === 'hidden_action' || this.currentFenceMode === 'hidden_thinking') {
      return ''
    }

    const trimmed = trimmedLine(this.currentLine)
    if (isPreviewHiddenLine(this.currentLine)) {
      return ''
    }

    if (this.currentFenceMode === 'plain' && trimmed.startsWith('```')) {
      return ''
    }

    const nextPreview = this.currentLine.slice(this.currentLinePreviewLength)
    this.currentLinePreviewLength = this.currentLine.length
    return nextPreview
  }
}

export function scanAssistantProtocolMarkdown(
  markdown: string
): ScannedAssistantProtocolMarkdown {
  const scanner = new NormalChatAssistantProtocolStreamScanner()
  const streamed = scanner.feed(markdown)
  const finalized = scanner.finish()

  return {
    visibleBodyMarkdown: `${streamed.visibleDelta}${finalized.visibleDelta}`,
    actionBlocks: [...streamed.actionBlocks, ...finalized.actionBlocks],
    thinkingBlocks: [...streamed.thinkingBlocks, ...finalized.thinkingBlocks]
  }
}
