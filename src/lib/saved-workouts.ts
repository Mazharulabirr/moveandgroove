export const MAX_SAVED_WORKOUTS = 10

function getSavedWorkoutStorageKey(userId: string) {
  return `mg_saved_workouts:${userId}`
}

export function readSavedWorkoutIds(userId: string) {
  if (typeof window === 'undefined') {
    return [] as number[]
  }

  const raw = window.localStorage.getItem(getSavedWorkoutStorageKey(userId))
  if (!raw) {
    return [] as number[]
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return [] as number[]
    }

    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0)
  } catch {
    return [] as number[]
  }
}

function writeSavedWorkoutIds(userId: string, ids: number[]) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(getSavedWorkoutStorageKey(userId), JSON.stringify(ids))
}

export function isWorkoutSaved(userId: string, routineId: number) {
  return readSavedWorkoutIds(userId).includes(routineId)
}

export function saveWorkoutToLibrary(userId: string, routineId: number) {
  const ids = readSavedWorkoutIds(userId)

  if (ids.includes(routineId)) {
    return {
      ok: true,
      ids,
      alreadySaved: true,
      isFull: false,
    }
  }

  if (ids.length >= MAX_SAVED_WORKOUTS) {
    return {
      ok: false,
      ids,
      alreadySaved: false,
      isFull: true,
    }
  }

  const nextIds = [routineId, ...ids]
  writeSavedWorkoutIds(userId, nextIds)

  return {
    ok: true,
    ids: nextIds,
    alreadySaved: false,
    isFull: false,
  }
}

export function removeWorkoutFromLibrary(userId: string, routineId: number) {
  const nextIds = readSavedWorkoutIds(userId).filter((id) => id !== routineId)
  writeSavedWorkoutIds(userId, nextIds)
  return nextIds
}
