import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

function readRequiredEnv(name: string) {
  const raw = process.env[name]

  if (!raw) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return raw
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/[\r\n]+/g, '')
}

function createAnthropicClient() {
  return new Anthropic({ apiKey: readRequiredEnv('ANTHROPIC_API_KEY') })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SPORTS: Record<string, string> = {
  golf:          'Hip rotation, thoracic spine mobility, shoulder turn, lateral flexion',
  afl:           'Hip mobility, ankle dorsiflexion, shoulder overhead, thoracic rotation',
  rugby:         'Neck mobility, thoracic spine, hip flexors, shoulder internal rotation',
  soccer:        'Hip adductors, ankle dorsiflexion, thoracic rotation, hip flexors',
  wrestling:     'Shoulder internal rotation, thoracic spine, hip mobility, neck',
  weightlifting: 'Thoracic extension, ankle dorsiflexion, shoulder overhead, hip flexion',
  cricket:       'Hip rotation, thoracic spine, shoulder external rotation, wrist',
  tennis:        'Hip mobility, shoulder external rotation, thoracic rotation, ankle',
  basketball:    'Hip flexor, ankle dorsiflexion, thoracic extension, shoulder',
  volleyball:    'Shoulder overhead, thoracic extension, hip mobility, ankle',
  netball:       'Hip mobility, ankle dorsiflexion, shoulder, knee',
  bjj:           'Hip mobility, spinal rotation, shoulder internal rotation, neck, wrist',
  kickboxing:    'Hip flexors, hip rotation, thoracic spine, shoulder, ankle dorsiflexion',
  muaythai:      'Hip flexors, hip rotation, thoracic spine, shoulder, knee, ankle',
}

type FoamRollExercise = {
  name: string
  area: string
  notes: string
}

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

type GeneratedRoutine = {
  routineTitle: string
  summary: string
  difficultyLevel: string
  totalExercises: number
  phases: RoutinePhase[]
  evidenceSummary: string
  savedId?: number
}

type GenerateRequest = {
  userId: string | null
  mode: 'sport' | 'area'
  sport: string | null
  areas: string[] | null
  duration: number
  goal: string
  includeFoamRoll: boolean
}

type MessageBlock = {
  type: string
  text?: string
}

const FOAM_ROLL_LIBRARY: Record<string, FoamRollExercise[]> = {
  hips: [
    { name: 'IT Band Roll',            area: 'hips',      notes: 'Side lying, roll hip to knee — pause on tender spots 5–10s.' },
    { name: 'Glute / Piriformis Roll', area: 'hips',      notes: 'Figure 4 position on roller — cross leg for deeper pressure.' },
    { name: 'Hip Flexor Roll',         area: 'hips',      notes: 'Prone, roller under anterior hip — TFL and iliopsoas.' },
    { name: 'Hamstring Roll',          area: 'hips',      notes: 'Seated on roller — proximal to distal, cross leg for more pressure.' },
    { name: 'Quad Roll',               area: 'hips',      notes: 'Prone, roller under thigh — rectus femoris and vastus lateralis.' },
  ],
  shoulders: [
    { name: 'Thoracic Spine Roll',     area: 'shoulders', notes: 'Slow roll T1 to T12 — pause on tender spots, arms crossed.' },
    { name: 'Lat Roll',                area: 'shoulders', notes: 'Side lying arm overhead — latissimus dorsi and teres major.' },
    { name: 'Pec Minor Roll',          area: 'shoulders', notes: 'Prone, roller near shoulder — rotate to find pec minor.' },
    { name: 'Posterior Shoulder Roll', area: 'shoulders', notes: 'Side lying, roller on posterior capsule — gentle rotation.' },
  ],
  spine: [
    { name: 'Thoracic Spine Roll',    area: 'spine', notes: 'Slow roll T1 to T12 — pause on tender spots, breathe into each segment.' },
    { name: 'Thoracic Rotation Roll', area: 'spine', notes: 'T-spine rotation over roller — lateral thoracic and rib cage release.' },
    { name: 'Lumbar Paraspinal Roll', area: 'spine', notes: 'Feet flat, hips up — roll slowly along paraspinals.' },
    { name: 'QL / Hip Roll',          area: 'spine', notes: 'Side lying at 45° — quadratus lumborum and iliolumbar fascia.' },
  ],
}

function selectFoamRollExercises(areas: string[], duration: number) {
  const maxExercises = duration <= 20 ? 2 : duration <= 30 ? 3 : 4
  const selected: Array<FoamRollExercise & { sets: number; holdSeconds: number; reps: null }> = []
  const seen = new Set<string>()

  for (const area of areas) {
    const library = FOAM_ROLL_LIBRARY[area] || []
    for (const ex of library) {
      if (selected.length >= maxExercises) break
      if (!seen.has(ex.name)) {
        seen.add(ex.name)
        selected.push({ ...ex, sets: 2, holdSeconds: 60, reps: null })
      }
    }
    if (selected.length >= maxExercises) break
  }
  return selected
}

export async function POST(req: NextRequest) {
  try {
    const anthropic = createAnthropicClient()
    const { userId, mode, sport, areas, duration, goal, includeFoamRoll } = await req.json() as GenerateRequest

    const targetAreas = areas && areas.length > 0 ? areas : ['hips', 'shoulders', 'spine']
    const sportFocus  = sport ? SPORTS[sport] : null
    const areasText   = targetAreas.join(', ')

    // Build PREP phase from local library
    let prepPhase: RoutinePhase | null = null
    if (includeFoamRoll) {
      const foamRollExercises = selectFoamRollExercises(targetAreas, duration)
      if (foamRollExercises.length > 0) {
        prepPhase = {
          pillar: 'prep',
          phaseDescription: 'Myofascial release to reduce tissue tension and prepare the target joints for loading.',
          exercises: foamRollExercises.map((ex) => ({
            videoId:      null,
            name:         ex.name,
            targetArea:   ex.area,
            sets:         ex.sets,
            reps:         null,
            holdSeconds:  ex.holdSeconds,
            rationale:    ex.notes,
            study:        'Cheatham et al. (2015). The effects of self-myofascial release using a foam roll on joint ROM, muscle recovery, and performance. IJSPT.',
            isFoamRoll:   true,
          })),
        }
      }
    }

    const prepMinutes   = prepPhase ? prepPhase.exercises.length * 3 : 0
    const aiDuration    = duration - prepMinutes
    const exerciseCount = Math.max(4, Math.round(aiDuration / 4))

    const prompt = `You are an expert sports physiotherapist and strength and conditioning coach building an evidence-based joint mobility routine.

USER PROFILE:
- Mode: ${mode === 'sport' ? 'Sport-specific' : 'Body area focus'}
${sportFocus ? `- Sport: ${sport} (key demands: ${sportFocus})` : ''}
- Focus Areas: ${areasText}
- Session Duration: ${aiDuration} minutes
- Primary Goal: ${goal}

SESSION STRUCTURE — THREE PHASES ONLY:

1. RELEASE — Loosen soft tissue surrounding target joints.
   Use: Static stretches, dynamic stretches, PNF, passive holds, joint distractions.
   DO NOT include foam rolling or roller-based exercises.

2. ACTIVATION — Build neuromuscular control through the released range.
   Use: Isometric holds, eccentric loading, CARs, PNE.

3. RANGE — Integrate strength and flexibility at end range.
   Use: PAILS & RAILS, loaded end-range holds, end-range isometrics.

PILLAR WEIGHTING BY GOAL:
- flexibility  → 50% release, 25% activation, 25% range
- strength     → 25% release, 50% activation, 25% range
- balanced     → 33% each
- performance  → 25% release, 25% activation, 50% range

Create ${exerciseCount} total exercises. Cite REAL peer-reviewed studies (JOSPT, BJSM, JSCR, IJSPT).
Release phase must contain ONLY stretching — no foam rolling.

Respond ONLY in valid JSON (no markdown):
{
  "routineTitle": "string",
  "summary": "2 sentence overview",
  "difficultyLevel": "Beginner|Intermediate|Advanced",
  "totalExercises": number,
  "phases": [
    {
      "pillar": "release|activation|range",
      "phaseDescription": "one sentence",
      "exercises": [
        {
          "videoId": null,
          "name": "string",
          "targetArea": "string",
          "sets": number,
          "reps": number or null,
          "holdSeconds": number or null,
          "rationale": "2 sentences",
          "study": "Author et al. (Year). Title. Journal."
        }
      ]
    }
  ],
  "evidenceSummary": "2-3 sentences"
}`

    const message = await anthropic.messages.create({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages:   [{ role: 'user', content: prompt }],
    })

    // --- FIXED: robust JSON extraction ---
    const raw = (message.content as MessageBlock[]).map((block) => block.text || '').join('')
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const jsonStart = cleaned.indexOf('{')
    const jsonEnd   = cleaned.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error(`AI returned non-JSON response: ${cleaned.slice(0, 200)}`)
    }
    const routine = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as GeneratedRoutine
    // --- END FIX ---

    if (prepPhase) {
      routine.phases.unshift(prepPhase)
      routine.totalExercises += prepPhase.exercises.length
    }

    // Save to DB if user is logged in
    if (userId) {
      const { data: savedRoutine, error: routineError } = await supabase
        .from('routines')
        .insert([{
          user_id:          userId,
          title:            routine.routineTitle,
          sport:            sport || null,
          areas:            targetAreas,
          goal,
          duration_minutes: duration,
          difficulty:       routine.difficultyLevel,
          summary:          routine.summary,
          evidence_summary: routine.evidenceSummary,
        }])
        .select()
        .single()

      if (routineError) throw routineError

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
      routine.phases.forEach((phase, pi) => {
        phase.exercises.forEach((ex, ei) => {
          items.push({
            routine_id:     savedRoutine.id,
            video_id:       null,
            pillar:         phase.pillar,
            exercise_name:  ex.name,
            target_area:    ex.targetArea,
            sets:           ex.sets,
            reps:           ex.reps || null,
            hold_seconds:   ex.holdSeconds || null,
            rationale:      ex.rationale,
            study_citation: ex.study,
            order_index:    pi * 10 + ei,
          })
        })
      })

      await supabase.from('routine_items').insert(items)
      routine.savedId = savedRoutine.id
    }

    return NextResponse.json(routine)

  } catch (err: unknown) {
    console.error('[generate]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
