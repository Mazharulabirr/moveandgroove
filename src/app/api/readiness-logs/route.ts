import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceRoleClient } from '@/lib/supabase/admin'

type ReadinessLogPayload = {
  row?: Record<string, unknown>
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
      message: error instanceof Error ? error.message : 'Unknown error',
      error,
    })
    return NextResponse.json({ error: 'Could not write readiness log.' }, { status: 500 })
  }
}
