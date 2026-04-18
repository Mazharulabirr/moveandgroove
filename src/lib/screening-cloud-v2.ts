import { calculateMobilityScreeningScores } from '@/lib/mobility-screening'

export type ScreeningAnswers = Record<string, number>

const SCREENING_LEGACY_DEFAULTS = {
  goal: 'mobility_screen_v2',
  activity_level: 1,
  desk_hours_per_day: 8,
  average_sleep_quality: 3,
  stress_level: 3,
} as const

type ScreeningQuestionnaireRow = {
  id?: string
  created_at?: string | null
  completed_at?: string | null
  assessed_at?: string | null
  responses?: unknown
}

export type DerivedScreeningSnapshot = {
  id: string
  overall_score: number
  hip_score: number
  shoulder_score: number
  spine_score: number
  created_at?: string | null
  completed_at?: string | null
  assessed_at?: string | null
  responses: ScreeningAnswers
}

export type ScreeningQuestionnaireInsert = typeof SCREENING_LEGACY_DEFAULTS & {
  user_id: string
  responses: ScreeningAnswers
}

function isScreeningAnswers(value: unknown): value is ScreeningAnswers {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  return Object.values(value).every((item) => typeof item === 'number' && Number.isFinite(item))
}

export function extractScreeningAnswers(row: ScreeningQuestionnaireRow | null | undefined): ScreeningAnswers | null {
  const raw = row?.responses
  if (!raw) {
    return null
  }

  if (isScreeningAnswers(raw)) {
    return raw
  }

  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      return isScreeningAnswers(parsed) ? parsed : null
    } catch {
      return null
    }
  }

  return null
}

export function deriveScreeningSnapshot(row: ScreeningQuestionnaireRow | null | undefined): DerivedScreeningSnapshot | null {
  const responses = extractScreeningAnswers(row)
  if (!row?.id || !responses) {
    return null
  }

  const scores = calculateMobilityScreeningScores(responses)

  return {
    id: row.id,
    overall_score: scores.overall.pct,
    hip_score: scores.hips.pct,
    shoulder_score: scores.shoulders.pct,
    spine_score: scores.spine.pct,
    created_at: row.created_at || null,
    completed_at: row.completed_at || null,
    assessed_at: row.assessed_at || null,
    responses,
  }
}

export function buildScreeningQuestionnaireInsert(userId: string, answers: ScreeningAnswers): ScreeningQuestionnaireInsert {
  return {
    user_id: userId,
    responses: answers,
    ...SCREENING_LEGACY_DEFAULTS,
  }
}
