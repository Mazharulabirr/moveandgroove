import { NextRequest, NextResponse } from 'next/server'
import { createAuthClient, createServiceRoleClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const accessToken = authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : ''

    if (!accessToken) {
      return NextResponse.json({ error: 'Missing exercise video access token.' }, { status: 401 })
    }

    const authClient = createAuthClient(accessToken)
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(accessToken)

    if (authError || !user) {
      return NextResponse.json({ error: 'Exercise video request is not authenticated.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const names = searchParams
      .getAll('name')
      .flatMap((value) => value.split(','))
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 50)

    if (names.length === 0) {
      return NextResponse.json({ mappings: [] })
    }

    const serviceClient = createServiceRoleClient()
    const { data, error } = await serviceClient
      .from('exercise_videos')
      .select('exercise_name, youtube_id, updated_at')
      .in('exercise_name', [...new Set(names)])

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ mappings: data || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
