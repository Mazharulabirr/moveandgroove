import { NextRequest, NextResponse } from 'next/server'
import { MAX_SAVED_WORKOUTS } from '@/lib/saved-workouts'
import { createAccessTokenClient, createAuthClient } from '@/lib/supabase/admin'

type SavedRoutineRow = {
  id: number
  title: string
  sport: string | null
  areas: string[] | null
  duration_minutes: number | null
  goal: string | null
  difficulty: string | null
  created_at: string
  saved_at: string | null
}

type SavedWorkoutPayload = {
  routineId?: number
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

function mapRoutine(row: SavedRoutineRow) {
  return {
    id: row.id,
    title: row.title,
    sport: row.sport ?? null,
    areas: Array.isArray(row.areas) ? row.areas : [],
    duration_minutes: row.duration_minutes ?? 0,
    goal: row.goal ?? null,
    difficulty: row.difficulty ?? null,
    created_at: row.created_at,
    saved_at: row.saved_at ?? null,
  }
}

async function validateUser(req: NextRequest) {
  const accessToken = readAccessToken(req)

  if (!accessToken) {
    throw new Error('Missing saved-workout access token.')
  }

  const authClient = createAuthClient(accessToken)
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken)

  if (error || !user) {
    throw new Error('Saved-workout request is not authenticated.')
  }

  return {
    accessToken,
    userId: user.id,
    client: createAccessTokenClient(accessToken),
  }
}

async function readRoutineId(req: NextRequest) {
  const body = await req.json().catch(() => null) as SavedWorkoutPayload | null
  const routineId = Number(body?.routineId)

  if (!Number.isInteger(routineId) || routineId <= 0) {
    throw new Error('A valid routineId is required.')
  }

  return routineId
}

export async function GET(req: NextRequest) {
  try {
    const { client, userId } = await validateUser(req)
    const { data, error } = await client
      .from('routines')
      .select('id,title,sport,areas,duration_minutes,goal,difficulty,created_at,saved_at')
      .eq('user_id', userId)
      .eq('is_saved', true)
      .order('saved_at', { ascending: false, nullsFirst: false })

    if (error) {
      throw error
    }

    return NextResponse.json({
      routines: ((data || []) as SavedRoutineRow[]).map(mapRoutine),
    })
  } catch (error) {
    console.error('[saved-workouts.read]', {
      message: getErrorMessage(error),
      error,
    })
    return NextResponse.json({ error: getErrorMessage(error) || 'Could not load saved workouts.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { client, userId } = await validateUser(req)
    const routineId = await readRoutineId(req)

    const { data: existingRoutine, error: existingRoutineError } = await client
      .from('routines')
      .select('id,title,sport,areas,duration_minutes,goal,difficulty,created_at,saved_at,is_saved')
      .eq('id', routineId)
      .eq('user_id', userId)
      .maybeSingle<SavedRoutineRow & { is_saved?: boolean | null }>()

    if (existingRoutineError) {
      throw existingRoutineError
    }

    if (!existingRoutine) {
      return NextResponse.json({ error: 'Routine not found.' }, { status: 404 })
    }

    if (existingRoutine.is_saved) {
      return NextResponse.json({
        ok: true,
        alreadySaved: true,
        routine: mapRoutine(existingRoutine),
      })
    }

    const { count, error: countError } = await client
      .from('routines')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_saved', true)

    if (countError) {
      throw countError
    }

    if ((count || 0) >= MAX_SAVED_WORKOUTS) {
      return NextResponse.json(
        { error: 'Library full. Remove a saved routine to add a new one.' },
        { status: 409 },
      )
    }

    const savedAt = new Date().toISOString()
    const { data: updated, error: updateError } = await client
      .from('routines')
      .update({
        is_saved: true,
        saved_at: savedAt,
      })
      .eq('id', routineId)
      .eq('user_id', userId)
      .select('id,title,sport,areas,duration_minutes,goal,difficulty,created_at,saved_at')
      .single<SavedRoutineRow>()

    if (updateError) {
      throw updateError
    }

    console.info('[saved-workouts.write]', {
      mode: 'save',
      userId,
      routineId,
      savedAt,
    })

    return NextResponse.json({
      ok: true,
      alreadySaved: false,
      routine: mapRoutine(updated),
    })
  } catch (error) {
    console.error('[saved-workouts.write]', {
      mode: 'save',
      message: getErrorMessage(error),
      error,
    })
    return NextResponse.json({ error: getErrorMessage(error) || 'Could not save workout.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { client, userId } = await validateUser(req)
    const routineId = await readRoutineId(req)

    const { error } = await client
      .from('routines')
      .update({
        is_saved: false,
        saved_at: null,
      })
      .eq('id', routineId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    console.info('[saved-workouts.write]', {
      mode: 'unsave',
      userId,
      routineId,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('[saved-workouts.write]', {
      mode: 'unsave',
      message: getErrorMessage(error),
      error,
    })
    return NextResponse.json({ error: getErrorMessage(error) || 'Could not remove saved workout.' }, { status: 500 })
  }
}
