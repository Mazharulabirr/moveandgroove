import { NextRequest, NextResponse } from 'next/server'
import { createAccessTokenClient, createAuthClient } from '@/lib/supabase/admin'

type ProgressRow = {
  user_id: string
  routine_id?: number | null
  duration_minutes?: number | null
  completed_at?: string | null
  sport?: string | null
  areas?: string[] | null
  goal?: string | null
}

type ProgressPayload = {
  row?: ProgressRow
}

type ProgressReadRow = {
  id?: string | number
  user_id: string
  routine_id?: number | null
  duration_minutes?: number | null
  completed_at?: string | null
  created_at?: string | null
  sport?: string | null
  areas?: string[] | null
  goal?: string | null
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message
  }

  return null
}

function looksLikeSchemaMismatch(error: unknown) {
  const message = getErrorMessage(error)?.toLowerCase() || ''

  return (
    message.includes('column') ||
    message.includes('schema cache') ||
    message.includes('could not find') ||
    message.includes('does not exist') ||
    message.includes('pgrst')
  )
}

function mapProgressRows(rows: ProgressReadRow[]) {
  return rows.map((row) => ({
    id: row.id ?? null,
    user_id: row.user_id,
    routine_id: row.routine_id ?? null,
    duration_minutes: row.duration_minutes ?? null,
    completed_at: row.completed_at ?? null,
    created_at: row.created_at ?? null,
    sport: row.sport ?? null,
    areas: Array.isArray(row.areas) ? row.areas : null,
    goal: row.goal ?? null,
  }))
}

function readAccessToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  return authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
}

async function validateUser(req: NextRequest) {
  const accessToken = readAccessToken(req)

  if (!accessToken) {
    throw new Error('Missing progress access token.')
  }

  const authClient = createAuthClient(accessToken)
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken)

  if (error || !user) {
    throw new Error('Progress request is not authenticated.')
  }

  return {
    accessToken,
    userId: user.id,
  }
}

export async function GET(req: NextRequest) {
  try {
    const { accessToken, userId } = await validateUser(req)
    const progressClient = createAccessTokenClient(accessToken)
    const { data, error } = await progressClient
      .from('progress')
      .select('id,user_id,routine_id,duration_minutes,completed_at,created_at,sport,areas,goal')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (!error) {
      return NextResponse.json({ progress: mapProgressRows((data || []) as ProgressReadRow[]) })
    }

    if (!looksLikeSchemaMismatch(error)) {
      throw error
    }

    const { data: fallbackData, error: fallbackError } = await progressClient
      .from('progress')
      .select('id,user_id,duration_minutes,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (fallbackError) {
      throw fallbackError
    }

    return NextResponse.json({ progress: mapProgressRows((fallbackData || []) as ProgressReadRow[]) })
  } catch (error) {
    console.error('[progress.read]', error)
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Could not read progress.' },
      { status: 500 },
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { accessToken, userId } = await validateUser(req)
    const body = await req.json() as ProgressPayload
    const row = body.row

    if (!row || row.user_id !== userId) {
      return NextResponse.json({ error: 'Progress payload is missing or user-scoped incorrectly.' }, { status: 400 })
    }

    const progressClient = createAccessTokenClient(accessToken)
    const completedAt = row.completed_at || new Date().toISOString()
    let existingQuery = progressClient
      .from('progress')
      .select('id')
      .eq('user_id', userId)
      .eq('completed_at', completedAt)
      .limit(1)

    existingQuery = row.routine_id == null
      ? existingQuery.is('routine_id', null)
      : existingQuery.eq('routine_id', row.routine_id)

    const { data: existing, error: existingError } = await existingQuery.maybeSingle<{ id: string }>()

    if (existingError) {
      if (!looksLikeSchemaMismatch(existingError)) {
        throw existingError
      }
    }

    if (existing?.id) {
      console.info('[progress.write]', {
        mode: 'existing',
        userId,
        routineId: row.routine_id ?? null,
        completedAt,
        id: existing.id,
      })
      return NextResponse.json({ ok: true, mode: 'existing', id: existing.id })
    }

    const rowToWrite = {
      user_id: userId,
      routine_id: row.routine_id ?? null,
      duration_minutes: row.duration_minutes ?? null,
      completed_at: completedAt,
      sport: row.sport ?? null,
      areas: row.areas ?? null,
      goal: row.goal ?? null,
    }

    const { data: inserted, error: insertError } = await progressClient
      .from('progress')
      .insert([rowToWrite])
      .select('id')
      .single<{ id: string }>()

    if (!insertError) {
      console.info('[progress.write]', {
        mode: 'inserted',
        userId,
        routineId: row.routine_id ?? null,
        completedAt,
        id: inserted.id,
      })
      return NextResponse.json({ ok: true, mode: 'inserted', id: inserted.id })
    }

    if (!looksLikeSchemaMismatch(insertError)) {
      throw insertError
    }

    const fallbackRow = {
      user_id: userId,
      duration_minutes: row.duration_minutes ?? null,
    }

    const { data: fallbackInserted, error: fallbackInsertError } = await progressClient
      .from('progress')
      .insert([fallbackRow])
      .select('id')
      .single<{ id: string }>()

    if (fallbackInsertError) {
      throw fallbackInsertError
    }

    console.info('[progress.write]', {
      mode: 'inserted-fallback',
      userId,
      routineId: null,
      completedAt,
      id: fallbackInserted.id,
    })

    return NextResponse.json({ ok: true, mode: 'inserted-fallback', id: fallbackInserted.id })
  } catch (error) {
    console.error('[progress.write]', {
      message: getErrorMessage(error),
      error,
    })
    return NextResponse.json(
      { error: getErrorMessage(error) || 'Could not write progress.' },
      { status: 500 },
    )
  }
}
