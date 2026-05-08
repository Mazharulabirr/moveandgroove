export const MAX_SAVED_WORKOUTS = 10

export type SavedWorkoutSummary = {
  id: number
  title: string
  sport: string | null
  areas: string[]
  duration_minutes: number
  goal: string | null
  difficulty: string | null
  created_at: string
  saved_at: string | null
}

type SavedWorkoutsResponse = {
  routines?: SavedWorkoutSummary[]
  error?: string
}

type SaveWorkoutResponse = {
  ok?: boolean
  alreadySaved?: boolean
  routine?: SavedWorkoutSummary | null
  error?: string
}

function buildAuthHeaders(accessToken: string, method: 'GET' | 'POST' | 'DELETE') {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  }

  if (method !== 'GET') {
    headers['Content-Type'] = 'application/json'
  }

  return headers
}

async function requestSavedWorkouts<T>(method: 'GET' | 'POST' | 'DELETE', accessToken: string, body?: Record<string, unknown>) {
  const response = await fetch('/api/saved-workouts', {
    method,
    headers: buildAuthHeaders(accessToken, method),
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => null) as T | null

  if (!response.ok) {
    const message = (payload as { error?: string } | null)?.error || `Saved workouts request failed with status ${response.status}.`
    throw new Error(message)
  }

  return payload
}

export async function readSavedWorkouts(accessToken: string) {
  const payload = await requestSavedWorkouts<SavedWorkoutsResponse>('GET', accessToken)
  return payload?.routines || []
}

export async function readSavedWorkoutIds(accessToken: string) {
  const routines = await readSavedWorkouts(accessToken)
  return routines.map((routine) => routine.id)
}

export async function isWorkoutSaved(accessToken: string, routineId: number) {
  const ids = await readSavedWorkoutIds(accessToken)
  return ids.includes(routineId)
}

export async function saveWorkoutToLibrary(accessToken: string, routineId: number) {
  const payload = await requestSavedWorkouts<SaveWorkoutResponse>('POST', accessToken, { routineId })

  return {
    ok: payload?.ok === true,
    alreadySaved: payload?.alreadySaved === true,
    routine: payload?.routine || null,
    isFull: false,
  }
}

export async function removeWorkoutFromLibrary(accessToken: string, routineId: number) {
  await requestSavedWorkouts<{ ok?: boolean }>('DELETE', accessToken, { routineId })
}
