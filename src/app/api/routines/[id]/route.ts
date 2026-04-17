import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type RoutineExercise = {
  videoId: null
  name: string
  targetArea: string
  sets: number
  reps: number | null
  holdSeconds: number | null
  rationale: string
  study: string
  isFoamRoll?: boolean
}

type RoutinePhase = {
  pillar: 'prep' | 'release' | 'activation' | 'range'
  phaseDescription: string
  exercises: RoutineExercise[]
}

type Routine = {
  routineTitle: string
  summary: string
  difficultyLevel: string
  totalExercises: number
  phases: RoutinePhase[]
  evidenceSummary: string
}

type SaveRoutineRequest = {
  userId: string
  routine: Routine
  sport?: string | null
  areas?: string[]
  duration?: number
  goal?: string | null
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { userId, routine, sport, areas, duration, goal } = await req.json() as SaveRoutineRequest

    if (!userId || !routine) {
      return NextResponse.json({ error: 'Missing required routine save payload.' }, { status: 400 })
    }

    const targetAreas = areas && areas.length > 0 ? areas : ['hips', 'shoulders', 'spine']

    const { data: savedRoutine, error: routineError } = await supabase
      .from('routines')
      .insert([{
        user_id: userId,
        title: routine.routineTitle,
        sport: sport || null,
        areas: targetAreas,
        goal: goal || null,
        duration_minutes: duration || null,
        difficulty: routine.difficultyLevel,
        summary: routine.summary,
        evidence_summary: routine.evidenceSummary,
      }])
      .select()
      .single()

    if (routineError) {
      throw routineError
    }

    const items: Array<{
      routine_id: number
      video_id: null
      pillar: string
      exercise_name: string
      target_area: string
      sets: number
      reps: number | null
      hold_seconds: number | null
      rationale: string
      study_citation: string
      order_index: number
    }> = []

    routine.phases.forEach((phase, phaseIndex) => {
      phase.exercises.forEach((exercise, exerciseIndex) => {
        items.push({
          routine_id: savedRoutine.id,
          video_id: null,
          pillar: phase.pillar,
          exercise_name: exercise.name,
          target_area: exercise.targetArea,
          sets: exercise.sets,
          reps: exercise.reps || null,
          hold_seconds: exercise.holdSeconds || null,
          rationale: exercise.rationale,
          study_citation: exercise.study,
          order_index: phaseIndex * 10 + exerciseIndex,
        })
      })
    })

    if (items.length > 0) {
      const { error: itemsError } = await supabase.from('routine_items').insert(items)
      if (itemsError) {
        throw itemsError
      }
    }

    return NextResponse.json({ savedId: savedRoutine.id })
  } catch (err: unknown) {
    console.error('[routines.save]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
