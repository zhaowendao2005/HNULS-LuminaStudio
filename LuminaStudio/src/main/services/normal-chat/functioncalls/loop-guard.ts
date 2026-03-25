import type { NormalChatFunctioncallResultAssessment } from './contracts'

interface NormalChatHelperLoopGuardEntry {
  helperId: string
  fingerprint: string
  assessment: NormalChatFunctioncallResultAssessment
}

export interface NormalChatHelperLoopGuardVerdict {
  allow: boolean
  reason: string | null
}

export class NormalChatHelperLoopGuard {
  private readonly history: NormalChatHelperLoopGuardEntry[] = []

  constructor(private readonly maxCallsPerHelper = 3) {}

  evaluate(helperId: string, fingerprint: string): NormalChatHelperLoopGuardVerdict {
    const sameHelperHistory = this.history.filter((entry) => entry.helperId === helperId)
    if (sameHelperHistory.length >= this.maxCallsPerHelper) {
      return {
        allow: false,
        reason: `${helperId} 已达到单轮最大调用次数 ${this.maxCallsPerHelper}，必须直接收口。`
      }
    }

    const repeatedFingerprintCount = sameHelperHistory.filter(
      (entry) => entry.fingerprint === fingerprint
    ).length
    if (repeatedFingerprintCount >= 2) {
      return {
        allow: false,
        reason: `${helperId} 已重复调用同一组参数两次，必须停止继续搜索并基于现有结果回答。`
      }
    }

    const recentSameHelper = sameHelperHistory.slice(-2)
    if (
      recentSameHelper.length === 2 &&
      recentSameHelper.every((entry) => entry.assessment.quality === 'none')
    ) {
      return {
        allow: false,
        reason: `${helperId} 连续两次未命中有效结果，必须停止继续搜索并明确说明直接证据不足。`
      }
    }

    if (
      recentSameHelper.length === 2 &&
      recentSameHelper.every((entry) => entry.assessment.quality === 'weak')
    ) {
      return {
        allow: false,
        reason: `${helperId} 连续两次只拿到弱相关结果，必须停止继续搜索并整理现有邻近证据。`
      }
    }

    return {
      allow: true,
      reason: null
    }
  }

  record(
    helperId: string,
    fingerprint: string,
    assessment: NormalChatFunctioncallResultAssessment
  ): void {
    this.history.push({
      helperId,
      fingerprint,
      assessment
    })
  }
}
