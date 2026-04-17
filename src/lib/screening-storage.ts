export type StoredScreeningSnapshot = {
  overall_score: number
  hip_score: number
  shoulder_score: number
  spine_score: number
  created_at: string
  answers?: Record<string, number>
}

const SCREENING_STORAGE_KEY = 'mg_screening_snapshot'

export function readStoredScreening(): StoredScreeningSnapshot | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(SCREENING_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as StoredScreeningSnapshot
  } catch {
    return null
  }
}

export function writeStoredScreening(snapshot: StoredScreeningSnapshot) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SCREENING_STORAGE_KEY, JSON.stringify(snapshot))
}
