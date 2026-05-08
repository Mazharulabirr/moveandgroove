import { NextRequest, NextResponse } from 'next/server'
import { createAccessTokenClient, createAuthClient } from '@/lib/supabase/admin'

type ReadinessLogPayload = {
  row?: Record<string, unknown>
}

type SanitizedReadinessRow = {
  user_id: string
  date: string
  session_type: 'pre' | 'post'
  sleep_quality: number | null
  energy_level: number | null
  soreness_level: number | null
  niggled_region: string | null
  training_context: string | null
  intensity_modifier: string | null
  avoid_passive_holds: boolean
  reduce_region: string | null
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

function toNullableNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toNullableString(value: unknown) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function sanitizeReadinessRow(rawRow: Record<string, unknown>, userId: string): SanitizedReadinessRow | null {
  const date = typeof rawRow.date === 'string' ? rawRow.date.trim() : ''
  const sessionType = rawRow.session_type === 'pre' || rawRow.session_type === 'post'
    ? rawRow.session_type
    : null

  if (!date || !sessionType) {
    return null
  }

  return {
    user_id: userId,
    date,
    session_type: sessionType,
    sleep_quality: toNullableNumber(rawRow.sleep_quality),
    energy_level: toNullableNumber(rawRow.energy_level),
    soreness_level: toNullableNumber(rawRow.soreness_level),
    niggled_region: toNullableString(rawRow.niggled_region),
    training_context: toNullableString(rawRow.training_context),
    intensity_modifier: toNullableString(rawRow.intensity_modifier),
    avoid_passive_holds: rawRow.avoid_passive_holds === true,
    reduce_region: toNullableString(rawRow.reduce_region),
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  const accessToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''

  if (!accessToken) {
    return NextResponse.json({ error: 'Missing readiness access token.' }, { status: 401 })
  }

  try {
    const authClient = createAuthClient(accessToken)
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(accessToken)

    if (authError || !user) {
      console.error('[readiness-logs.auth]', authError)
      return NextResponse.json({ error: 'Readiness request is not authenticated.' }, { status: 401 })
    }

    const body = await req.json() as ReadinessLogPayload
    const row = sanitizeReadinessRow(body.row || {}, user.id)

    if (!row) {
      return NextResponse.json({ error: 'Readiness payload is incomplete or user-scoped incorrectly.' }, { status: 400 })
    }

    const readinessClient = createAccessTokenClient(accessToken)
    const { data: existing, error: existingError } = await readinessClient
      .from('readiness_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', row.date)
      .eq('session_type', row.session_type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>()

    if (existingError) {
      throw existingError
    }

    if (existing?.id) {
      const { error: updateError } = await readinessClient
        .from('readiness_logs')
        .update(row)
        .eq('id', existing.id)

      if (updateError) {
        throw updateError
      }

      console.info('[readiness-logs.write]', {
        mode: 'updated',
        userId: user.id,
        sessionType: row.session_type,
        date: row.date,
        id: existing.id,
      })

      return NextResponse.json({ ok: true, mode: 'updated', id: existing.id })
    }

    const { data: inserted, error: insertError } = await readinessClient
      .from('readiness_logs')
      .insert([row])
      .select('id')
      .single<{ id: string }>()

    if (insertError) {
      throw insertError
    }

    console.info('[readiness-logs.write]', {
      mode: 'inserted',
      userId: user.id,
      sessionType: row.session_type,
      date: row.date,
      id: inserted.id,
    })

    return NextResponse.json({ ok: true, mode: 'inserted', id: inserted.id })
  } catch (error) {
    console.error('[readiness-logs.write]', {
      message: getErrorMessage(error),
      error,
    })
    return NextResponse.json({ error: getErrorMessage(error) || 'Could not write readiness log.' }, { status: 500 })
  }
}
