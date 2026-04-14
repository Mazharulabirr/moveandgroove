import type { ReadinessAdjustmentSnapshot } from '@/lib/readiness'

const PRE_SESSION_READINESS_KEY = 'mg_pre_session_readiness'

export function readStoredPreSessionReadiness(): ReadinessAdjustmentSnapshot | null {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(PRE_SESSION_READINESS_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as ReadinessAdjustmentSnapshot
  } catch {
    return null
  }
}

export function writeStoredPreSessionReadiness(snapshot: ReadinessAdjustmentSnapshot) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(PRE_SESSION_READINESS_KEY, JSON.stringify(snapshot))
}

export function readTodayPreSessionReadiness(): ReadinessAdjustmentSnapshot | null {
  const snapshot = readStoredPreSessionReadiness()
  if (!snapshot) return null

  const checkedAt = new Date(snapshot.checked_at)
  const now = new Date()

  if (
    checkedAt.getFullYear() !== now.getFullYear() ||
    checkedAt.getMonth() !== now.getMonth() ||
    checkedAt.getDate() !== now.getDate()
  ) {
    return null
  }

  return snapshot
}
