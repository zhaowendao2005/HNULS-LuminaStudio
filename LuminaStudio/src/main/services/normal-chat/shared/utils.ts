export function nowIso(): string {
  return new Date().toISOString()
}

export function toDbBoolean(value: boolean | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null
  }

  return value ? 1 : 0
}

export function fromDbBoolean(value: number | null | undefined, fallback = false): boolean {
  if (value === null || value === undefined) {
    return fallback
  }

  return value === 1
}

export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) {
    return fallback
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}
