import type {
  NormalChatPromptBundleV2,
  NormalChatPromptRoundSections,
  NormalChatPromptTrimSnapshot
} from './prompt-bundle.types'

function trimSection(value: string, maxChars: number): string {
  if (value.length <= maxChars) {
    return value
  }
  return `${value.slice(0, Math.max(0, maxChars - 1))}…`
}

export class NormalChatPromptBudgetService {
  fit(
    bundle: NormalChatPromptBundleV2,
    options: {
      maxChars: number
      trimOrder: Array<keyof NormalChatPromptRoundSections>
    }
  ): { bundle: NormalChatPromptBundleV2; snapshot: NormalChatPromptTrimSnapshot } {
    const snapshot: NormalChatPromptTrimSnapshot = {
      originalCharCount: bundle.promptDocument.length,
      trimmedCharCount: bundle.promptDocument.length,
      trimmedSections: []
    }

    const nextRoundSections: NormalChatPromptRoundSections = { ...bundle.roundSections }
    let compiledRoundPrompt = bundle.compiledRoundPrompt
    const compiledSystemPrompt = bundle.compiledSystemPrompt
    let promptDocument = bundle.promptDocument

    for (const sectionKey of options.trimOrder) {
      if (promptDocument.length <= options.maxChars) {
        break
      }

      const currentValue = nextRoundSections[sectionKey]
      if (!currentValue) {
        continue
      }

      const overflow = promptDocument.length - options.maxChars
      const nextValue = trimSection(
        String(currentValue),
        Math.max(120, String(currentValue).length - overflow)
      )
      nextRoundSections[sectionKey] = nextValue
      compiledRoundPrompt = Object.values(nextRoundSections).filter(Boolean).join('\n\n---\n\n')
      promptDocument = [compiledSystemPrompt, compiledRoundPrompt]
        .filter(Boolean)
        .join('\n\n---\n\n')
      snapshot.trimmedSections.push({
        sectionKey,
        reason: 'prompt_budget',
        beforeCharCount: String(currentValue).length,
        afterCharCount: nextValue.length
      })
    }

    snapshot.trimmedCharCount = promptDocument.length

    return {
      bundle: {
        ...bundle,
        roundSections: nextRoundSections,
        compiledSystemPrompt,
        compiledRoundPrompt,
        promptDocument
      },
      snapshot
    }
  }
}
