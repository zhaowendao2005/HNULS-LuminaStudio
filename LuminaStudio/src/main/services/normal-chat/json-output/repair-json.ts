import { jsonrepair } from 'jsonrepair'

export interface RepairJsonResult {
  repairedText: string | null
  repairAttempted: boolean
  repairError: string | null
}

export function repairJsonText(rawText: string | null): RepairJsonResult {
  if (!rawText) {
    return {
      repairedText: null,
      repairAttempted: false,
      repairError: 'empty-json-text'
    }
  }

  try {
    return {
      repairedText: jsonrepair(rawText),
      repairAttempted: true,
      repairError: null
    }
  } catch (error) {
    return {
      repairedText: null,
      repairAttempted: true,
      repairError: error instanceof Error ? error.message : String(error)
    }
  }
}
