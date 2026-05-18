import { NextRequest, NextResponse } from 'next/server'
import { CURATED_ROUTINE_LIBRARY, type CuratedArea, type CuratedPillar, type CuratedRoutineExerciseTemplate } from '@/lib/curated-mobility'
import { EXERCISE_VIDEO_LIBRARY } from '@/lib/exercise-videos'
import { requireAdminAccess } from '@/lib/supabase/admin'

type YoutubeSearchItem = {
  id?: {
    videoId?: string
  }
  snippet?: {
    title?: string
  }
}

type YoutubeSearchResponse = {
  items?: YoutubeSearchItem[]
  nextPageToken?: string
}

type MatchResult = {
  videoTitle: string
  exerciseName: string
  youtubeId: string
}

function readOptionalEnv(name: string) {
  const value = process.env[name]
  return value ? value.trim() : ''
}

function readRequiredEnv(name: string) {
  const value = readOptionalEnv(name)
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

function maskChannelId(channelId: string) {
  if (!channelId) {
    return 'not configured'
  }

  if (channelId.length <= 8) {
    return `${channelId.slice(0, 2)}****${channelId.slice(-2)}`
  }

  return `${channelId.slice(0, 4)}****${channelId.slice(-4)}`
}

function flattenExerciseNames() {
  const names = new Set<string>()

  ;(Object.entries(CURATED_ROUTINE_LIBRARY) as Array<[CuratedArea, Record<CuratedPillar, CuratedRoutineExerciseTemplate[]>]>)
    .forEach(([, phases]) => {
      ;(Object.entries(phases) as Array<[CuratedPillar, CuratedRoutineExerciseTemplate[]]>)
        .forEach(([, exercises]) => {
          exercises.forEach((exercise) => {
            names.add(exercise.name.trim())
          })
        })
    })

  EXERCISE_VIDEO_LIBRARY.forEach((entry) => {
    const title = entry.title.trim()
    if (title) {
      names.add(title)
    }
  })

  return Array.from(names)
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchExerciseName(videoTitle: string, exerciseNames: string[]) {
  const trimmedTitle = videoTitle.trim()
  const exact = exerciseNames.find((exerciseName) => exerciseName === trimmedTitle)
  if (exact) {
    return exact
  }

  const loweredTitle = trimmedTitle.toLowerCase()
  const contains = exerciseNames.find((exerciseName) => loweredTitle.includes(exerciseName.toLowerCase()))
  if (contains) {
    return contains
  }

  const normalizedTitle = normalizeText(trimmedTitle)
  return exerciseNames.find((exerciseName) => normalizeText(exerciseName) === normalizedTitle) || null
}

async function fetchAllYoutubeVideos(apiKey: string, channelId: string) {
  const items: Array<{ title: string; youtubeId: string }> = []
  let nextPageToken = ''
  let guard = 0

  while (guard < 50) {
    const params = new URLSearchParams({
      part: 'snippet',
      channelId,
      type: 'video',
      maxResults: '50',
      order: 'date',
      key: apiKey,
    })

    if (nextPageToken) {
      params.set('pageToken', nextPageToken)
    }

    const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
      cache: 'no-store',
    })

    if (!response.ok) {
      const payload = await response.text()
      throw new Error(`YouTube API request failed: ${response.status} ${payload.slice(0, 300)}`)
    }

    const payload = await response.json() as YoutubeSearchResponse
    const nextItems = (payload.items || [])
      .map((item) => ({
        title: item.snippet?.title?.trim() || '',
        youtubeId: item.id?.videoId?.trim() || '',
      }))
      .filter((item) => item.title && item.youtubeId)

    items.push(...nextItems)

    if (!payload.nextPageToken) {
      break
    }

    nextPageToken = payload.nextPageToken
    guard += 1
  }

  return items
}

export async function GET(req: NextRequest) {
  try {
    await requireAdminAccess(req)
    const channelId = readOptionalEnv('YOUTUBE_CHANNEL_ID')

    return NextResponse.json({
      configured: Boolean(channelId && readOptionalEnv('YOUTUBE_API_KEY')),
      channelIdMasked: maskChannelId(channelId),
    })
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
    const apiKey = readRequiredEnv('YOUTUBE_API_KEY')
    const channelId = readRequiredEnv('YOUTUBE_CHANNEL_ID')
    const exerciseNames = flattenExerciseNames()
    const youtubeVideos = await fetchAllYoutubeVideos(apiKey, channelId)

    const matched: MatchResult[] = []
    const skipped: string[] = []
    const errors: string[] = []
    const seenExercises = new Set<string>()

    for (const video of youtubeVideos) {
      const exerciseName = matchExerciseName(video.title, exerciseNames)

      if (!exerciseName) {
        skipped.push(video.title)
        continue
      }

      if (seenExercises.has(exerciseName)) {
        skipped.push(`${video.title} (duplicate match for ${exerciseName})`)
        continue
      }

      seenExercises.add(exerciseName)
      matched.push({
        videoTitle: video.title,
        exerciseName,
        youtubeId: video.youtubeId,
      })
    }

    if (matched.length > 0) {
      const rows = matched.map((item) => ({
        exercise_name: item.exerciseName,
        youtube_id: item.youtubeId,
        updated_at: new Date().toISOString(),
      }))

      const { error } = await serviceClient
        .from('exercise_videos')
        .upsert(rows, { onConflict: 'exercise_name' })

      if (error) {
        throw new Error(error.message)
      }
    }

    return NextResponse.json({
      matched,
      skipped,
      errors,
      channelIdMasked: maskChannelId(channelId),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Admin access required.' || message === 'Admin request is not authenticated.' || message === 'Missing admin access token.'
      ? 401
      : 500
    return NextResponse.json({ error: message }, { status })
  }
}
