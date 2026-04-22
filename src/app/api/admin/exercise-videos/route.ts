import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAccess } from '@/lib/supabase/admin'

type SaveVideoRequest = {
  exerciseName?: string
  youtubeId?: string
}

export async function GET(req: NextRequest) {
  try {
    const { serviceClient } = await requireAdminAccess(req)
    const { data, error } = await serviceClient
      .from('exercise_videos')
      .select('exercise_name, youtube_id, updated_at')
      .order('exercise_name', { ascending: true })

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ mappings: data || [] })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Admin access required.' || message === 'Admin request is not authenticated.' || message === 'Missing admin access token.'
      ? 401
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { serviceClient } = await requireAdminAccess(req)
    const body = await req.json() as SaveVideoRequest
    const exerciseName = body.exerciseName?.trim() || ''
    const youtubeId = body.youtubeId?.trim() || ''

    if (!exerciseName) {
      return NextResponse.json({ error: 'Exercise name is required.' }, { status: 400 })
    }

    const { data, error } = await serviceClient
      .from('exercise_videos')
      .upsert({
        exercise_name: exerciseName,
        youtube_id: youtubeId || null,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'exercise_name',
      })
      .select('exercise_name, youtube_id, updated_at')
      .single()

    if (error) {
      throw new Error(error.message)
    }

    return NextResponse.json({ mapping: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Admin access required.' || message === 'Admin request is not authenticated.' || message === 'Missing admin access token.'
      ? 401
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}
