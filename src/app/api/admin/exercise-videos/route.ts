import { NextRequest, NextResponse } from 'next/server'
import { requireAdminAccess } from '@/lib/supabase/admin'

type SaveVideoRequest = {
  exerciseName?: string
  youtubeId?: string
  mappings?: Array<{
    exerciseName?: string
    youtubeId?: string
  }>
}

function normalizeYoutubeId(value: string) {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  const watchMatch = trimmed.match(/[?&]v=([A-Za-z0-9_-]{11})/)
  if (watchMatch) {
    return watchMatch[1]
  }

  const shortMatch = trimmed.match(/youtu\.be\/([A-Za-z0-9_-]{11})/)
  if (shortMatch) {
    return shortMatch[1]
  }

  const embedMatch = trimmed.match(/embed\/([A-Za-z0-9_-]{11})/)
  if (embedMatch) {
    return embedMatch[1]
  }

  const directMatch = trimmed.match(/^[A-Za-z0-9_-]{11}$/)
  if (directMatch) {
    return trimmed
  }

  return trimmed
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
    const mappings = Array.isArray(body.mappings) ? body.mappings : null

    if (mappings) {
      if (mappings.length === 0) {
        return NextResponse.json({ error: 'At least one mapping is required.' }, { status: 400 })
      }

      const rows = mappings
        .map((mapping) => ({
          exercise_name: mapping.exerciseName?.trim() || '',
          youtube_id: normalizeYoutubeId(mapping.youtubeId?.trim() || '') || null,
          updated_at: new Date().toISOString(),
        }))
        .filter((mapping) => mapping.exercise_name)

      if (rows.length === 0) {
        return NextResponse.json({ error: 'No valid exercise mappings were provided.' }, { status: 400 })
      }

      const { data, error } = await serviceClient
        .from('exercise_videos')
        .upsert(rows, {
          onConflict: 'exercise_name',
        })
        .select('exercise_name, youtube_id, updated_at')

      if (error) {
        throw new Error(error.message)
      }

      return NextResponse.json({
        count: data?.length || 0,
        mappings: data || [],
      })
    }

    const exerciseName = body.exerciseName?.trim() || ''
    const youtubeId = normalizeYoutubeId(body.youtubeId?.trim() || '')

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
