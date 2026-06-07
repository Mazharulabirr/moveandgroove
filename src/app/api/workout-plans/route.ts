import { NextRequest, NextResponse } from 'next/server'
import { createAccessTokenClient, createAuthClient } from '@/lib/supabase/admin'

type WorkoutPlanPayload = {
  sport?: string | null
  areas?: string[] | null
  goal?: string | null
  duration_weeks?: number
  sessions_per_week?: number
  starts_at?: string | null
}

type WorkoutPlanRow = {
  id: string
  user_id: string
  sport: string | null
  areas: string[] | null
  goal: string | null
  duration_weeks: number | null
  sessions_per_week: number | null
  starts_at: string | null
  created_at: string
  is_active: boolean | null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return 'Unknown error'
}

function readAccessToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  return authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
}

function normalizeAreas(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[]
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item === 'hips' || item === 'shoulders' || item === 'spine')
}

function mapPlan(row: WorkoutPlanRow) {
  return {
    id: row.id,
    sport: row.sport ?? null,
    areas: Array.isArray(row.areas) ? row.areas : [],
    goal: row.goal ?? null,
    duration_weeks: row.duration_weeks ?? 0,
    sessions_per_week: row.sessions_per_week ?? 3,
    starts_at: row.starts_at ?? null,
    created_at: row.created_at,
    is_active: row.is_active ?? true,
  }
}

async function validateUser(req: NextRequest) {
  const accessToken = readAccessToken(req)

  if (!accessToken) {
    throw new Error('Missing workout-plan access token.')
  }

  const authClient = createAuthClient(accessToken)
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken)

  if (error || !user) {
    throw new Error('Workout-plan request is not authenticated.')
  }

  return {
    accessToken,
    userId: user.id,
    client: createAccessTokenClient(accessToken),
  }
}

export async function GET(req: NextRequest) {
  try {
    const { client, userId } = await validateUser(req)
    const { data, error } = await client
      .from('workout_plans')
      .select('id,user_id,sport,areas,goal,duration_weeks,sessions_per_week,starts_at,created_at,is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<WorkoutPlanRow>()

    if (error) {
      throw error
    }

    return NextResponse.json({
      plan: data ? mapPlan(data) : null,
    })
  } catch (error) {
    console.error('[workout-plans.read]', {
      message: getErrorMessage(error),
      error,
    })
    return NextResponse.json({ error: getErrorMessage(error) || 'Could not load workout plan.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { client, userId } = await validateUser(req)
    const body = await req.json() as WorkoutPlanPayload

    const durationWeeks = Number(body.duration_weeks)
    const sessionsPerWeek = Number(body.sessions_per_week ?? 3)
    const sport = typeof body.sport === 'string' && body.sport.trim().length > 0
      ? body.sport.trim().toLowerCase()
      : null
    const areas = normalizeAreas(body.areas)
    const goal = typeof body.goal === 'string' && body.goal.trim().length > 0
      ? body.goal.trim().toLowerCase()
      : null
    const startsAt = typeof body.starts_at === 'string' && body.starts_at.trim().length > 0
      ? body.starts_at.trim()
      : new Date().toISOString().slice(0, 10)

    if (![4, 8, 12].includes(durationWeeks)) {
      return NextResponse.json({ error: 'Duration must be 4, 8, or 12 weeks.' }, { status: 400 })
    }

    if (![2, 3, 4].includes(sessionsPerWeek)) {
      return NextResponse.json({ error: 'Sessions per week must be 2, 3, or 4.' }, { status: 400 })
    }

    if (!goal) {
      return NextResponse.json({ error: 'Goal is required.' }, { status: 400 })
    }

    if (!sport && areas.length === 0) {
      return NextResponse.json({ error: 'Choose a sport or at least one body area.' }, { status: 400 })
    }

    const { error: deactivateError } = await client
      .from('workout_plans')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true)

    if (deactivateError) {
      throw deactivateError
    }

    const { data, error } = await client
      .from('workout_plans')
      .insert([{
        user_id: userId,
        sport,
        areas: areas.length > 0 ? areas : null,
        goal,
        duration_weeks: durationWeeks,
        sessions_per_week: sessionsPerWeek,
        starts_at: startsAt,
        is_active: true,
      }])
      .select('id,user_id,sport,areas,goal,duration_weeks,sessions_per_week,starts_at,created_at,is_active')
      .single<WorkoutPlanRow>()

    if (error) {
      throw error
    }

    console.info('[workout-plans.write]', {
      userId,
      planId: data.id,
      durationWeeks,
      sessionsPerWeek,
      sport,
      areas,
      goal,
    })

    return NextResponse.json({
      ok: true,
      plan: mapPlan(data),
    })
  } catch (error) {
    console.error('[workout-plans.write]', {
      message: getErrorMessage(error),
      error,
    })
    return NextResponse.json({ error: getErrorMessage(error) || 'Could not save workout plan.' }, { status: 500 })
  }
}
