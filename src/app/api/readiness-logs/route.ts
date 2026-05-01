import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceRoleClient } from '@/lib/supabase/admin'

type ReadinessLogPayload = {
  row?: Record<string, unknown>
}

type ExistingReadinessRow = {
  id: string
  session_type: string | null
  sleep_quality: number | null
  energy_level: number | null
  soreness_level: number | null
  niggled_region: string | null
  training_context: string | null
  intensity_modifier: string | null
  avoid_passive_holds: boolean | null
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

function appendTrainingContext(existing: string | null, incoming: string | null) {
  if (existing && incoming) {
    return `${existing} | ${incoming}`
  }

  return incoming || existing || null
}

function buildMergedPostRow(row: Record<string, unknown>, existingSameDay: ExistingReadinessRow) {
  return {
    ...row,
    session_type: existingSameDay.session_type || 'pre',
    sleep_quality: row.sleep_quality ?? existingSameDay.sleep_quality ?? null,
    energy_level: row.energy_level ?? existingSameDay.energy_level ?? null,
    soreness_level: row.soreness_level ?? existingSameDay.soreness_level ?? null,
    niggled_region: row.niggled_region || existingSameDay.niggled_region || null,
    training_context: appendTrainingContext(existingSameDay.training_context, typeof row.training_context === 'string' ? row.training_context : null),
    intensity_modifier: row.intensity_modifier || existingSameDay.intensity_modifier || null,
    avoid_passive_holds: row.avoid_passive_holds ?? existingSameDay.avoid_passive_holds ?? false,
    reduce_region: row.reduce_region || existingSameDay.reduce_region || null,
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
    const row = body.row || {}
    const rowUserId = typeof row.user_id === 'string' ? row.user_id : ''
    const rowDate = typeof row.date === 'string' ? row.date : ''
    const rowSessionType = typeof row.session_type === 'string' ? row.session_type : ''

    if (!rowUserId || rowUserId !== user.id || !rowDate || !rowSessionType) {
      return NextResponse.json({ error: 'Readiness payload is incomplete or user-scoped incorrectly.' }, { status: 400 })
    }

    const serviceClient = createServiceRoleClient()
    const { data: existing, error: existingError } = await serviceClient
      .from('readiness_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('date', rowDate)
      .eq('session_type', rowSessionType)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>()

    if (existingError) {
      throw existingError
    }

    const { data: existingSameDay, error: existingSameDayError } = await serviceClient
      .from('readiness_logs')
      .select('id,session_type,sleep_quality,energy_level,soreness_level,niggled_region,training_context,intensity_modifier,avoid_passive_holds,reduce_region')
      .eq('user_id', user.id)
      .eq('date', rowDate)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<ExistingReadinessRow>()

    if (existingSameDayError) {
      throw existingSameDayError
    }

    if (existing?.id) {
      const { error: updateError } = await serviceClient
        .from('readiness_logs')
        .update(row)
        .eq('id', existing.id)

      if (updateError) {
        throw updateError
      }

      return NextResponse.json({ ok: true, mode: 'updated', id: existing.id })
    }

    if (rowSessionType === 'post' && existingSameDay?.id) {
      const mergedRow = buildMergedPostRow(row, existingSameDay)
      const { error: mergeError } = await serviceClient
        .from('readiness_logs')
        .update(mergedRow)
        .eq('id', existingSameDay.id)

      if (mergeError) {
        throw mergeError
      }

      return NextResponse.json({ ok: true, mode: 'merged-post', id: existingSameDay.id })
    }

    const { data: inserted, error: insertError } = await serviceClient
      .from('readiness_logs')
      .insert([row])
      .select('id')
      .single<{ id: string }>()

    if (insertError) {
      throw insertError
    }

    return NextResponse.json({ ok: true, mode: 'inserted', id: inserted.id })
  } catch (error) {
    console.error('[readiness-logs.write]', {
      message: getErrorMessage(error),
      error,
    })
    return NextResponse.json({ error: getErrorMessage(error) || 'Could not write readiness log.' }, { status: 500 })
  }
}
