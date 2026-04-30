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

    if (error) {
      throw error
    }

    return NextResponse.json({ progress: data || [] })
  } catch (error) {
    console.error('[progress.read]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not read progress.' },
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
    const { data: existing, error: existingError } = await progressClient
      .from('progress')
      .select('id')
      .eq('user_id', userId)
      .eq('routine_id', row.routine_id ?? -1)
      .eq('completed_at', completedAt)
      .limit(1)
      .maybeSingle<{ id: string }>()

    if (existingError) {
      throw existingError
    }

    if (existing?.id) {
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

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({ ok: true, mode: 'inserted', id: inserted.id })
  } catch (error) {
    console.error('[progress.write]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not write progress.' },
      { status: 500 },
    )
  }
}
