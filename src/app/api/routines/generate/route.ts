import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

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

const FALLBACK_LIBRARY: Record<string, Record<'release' | 'activation' | 'range', RoutineExercise[]>> = {
  hips: {
    release: [
      { videoId: null, name: '90/90 Hip Stretch', targetArea: 'hips', sets: 2, reps: null, holdSeconds: 40, rationale: 'Opens internal and external hip rotation to reduce stiffness before loading.', study: 'Behm et al. (2016). Acute effects of muscle stretching on physical performance. Applied Physiology, Nutrition, and Metabolism.' },
      { videoId: null, name: 'Half-Kneeling Hip Flexor Stretch', targetArea: 'hips', sets: 2, reps: null, holdSeconds: 40, rationale: 'Targets anterior hip tightness that commonly limits extension and stride mechanics.', study: 'Konrad et al. (2021). Effects of stretching training on range of motion. Sports Medicine.' },
    ],
    activation: [
      { videoId: null, name: 'Glute Bridge Iso Hold', targetArea: 'hips', sets: 3, reps: null, holdSeconds: 25, rationale: 'Builds glute engagement so the new hip range is supported with control.', study: 'Distefano et al. (2009). Gluteal muscle activation during common therapeutic exercises. JOSPT.' },
      { videoId: null, name: 'Standing Hip CARs', targetArea: 'hips', sets: 2, reps: 4, holdSeconds: null, rationale: 'Improves active hip control through the usable range rather than passive flexibility alone.', study: 'Frazer et al. (2020). Mobility training and movement control. Sports Medicine.' },
    ],
    range: [
      { videoId: null, name: 'Cossack Squat', targetArea: 'hips', sets: 3, reps: 6, holdSeconds: null, rationale: 'Strengthens lateral hip range and adductor length under load.', study: 'McCurdy et al. (2010). The effect of unilateral and bilateral lower-body resistance exercises on measures of strength and power. JSCR.' },
      { videoId: null, name: 'End-Range Split Squat Hold', targetArea: 'hips', sets: 2, reps: null, holdSeconds: 20, rationale: 'Builds strength and tolerance at hip extension end range.', study: 'Oranchuk et al. (2019). Isometric training and its effects on strength and dynamic performance. Sports.' },
    ],
  },
  shoulders: {
    release: [
      { videoId: null, name: 'Wall Lat Stretch', targetArea: 'shoulders', sets: 2, reps: null, holdSeconds: 40, rationale: 'Reduces lat and shoulder stiffness that can limit overhead range.', study: 'Konrad et al. (2021). Effects of stretching training on range of motion. Sports Medicine.' },
      { videoId: null, name: 'Doorway Pec Stretch', targetArea: 'shoulders', sets: 2, reps: null, holdSeconds: 35, rationale: 'Opens the anterior shoulder to improve posture and overhead mechanics.', study: 'Page (2012). Current concepts in muscle stretching for exercise and rehabilitation. IJSPT.' },
    ],
    activation: [
      { videoId: null, name: 'Wall Slide Lift-Off', targetArea: 'shoulders', sets: 3, reps: 8, holdSeconds: null, rationale: 'Improves upward rotation and cuff-supported overhead control.', study: 'Cools et al. (2007). Rehabilitation of scapular muscle balance. BJSM.' },
      { videoId: null, name: 'Band External Rotation Iso', targetArea: 'shoulders', sets: 3, reps: null, holdSeconds: 20, rationale: 'Builds rotator cuff control in a stable shoulder position.', study: 'Reinold et al. (2004). Electromyographic analysis of rotator cuff and deltoid musculature during common shoulder exercises. JOSPT.' },
    ],
    range: [
      { videoId: null, name: 'Tall-Kneeling Overhead Reach', targetArea: 'shoulders', sets: 3, reps: 6, holdSeconds: 5, rationale: 'Integrates thoracic extension with loaded overhead positioning.', study: 'Manske et al. (2013). Current concepts in shoulder examination and treatment. IJSPT.' },
      { videoId: null, name: 'Push-Up Plus', targetArea: 'shoulders', sets: 3, reps: 8, holdSeconds: null, rationale: 'Strengthens serratus-driven control at end range.', study: 'Ludewig et al. (2004). Relative balance of serratus anterior and upper trapezius muscle activity during push-up exercises. AJSM.' },
    ],
  },
  spine: {
    release: [
      { videoId: null, name: 'Open Book Rotation', targetArea: 'spine', sets: 2, reps: 6, holdSeconds: 5, rationale: 'Restores thoracic rotation and ribcage motion for cleaner trunk mechanics.', study: 'Page (2012). Current concepts in muscle stretching for exercise and rehabilitation. IJSPT.' },
      { videoId: null, name: 'Childs Pose Reach', targetArea: 'spine', sets: 2, reps: null, holdSeconds: 40, rationale: 'Reduces global trunk stiffness while opening lats and thoracic segments.', study: 'Behm et al. (2016). Acute effects of muscle stretching on physical performance. Applied Physiology, Nutrition, and Metabolism.' },
    ],
    activation: [
      { videoId: null, name: 'Quadruped T-Spine Rotation', targetArea: 'spine', sets: 2, reps: 6, holdSeconds: null, rationale: 'Trains thoracic rotation while keeping the lumbar spine controlled.', study: 'Cook et al. (2014). Movement: functional movement systems. On Target Publications.' },
      { videoId: null, name: 'Dead Bug Iso Press', targetArea: 'spine', sets: 3, reps: null, holdSeconds: 20, rationale: 'Builds trunk stability so mobility gains do not leak through the lower back.', study: 'McGill (2010). Core training: evidence translating to better performance and injury prevention. Strength and Conditioning Journal.' },
    ],
    range: [
      { videoId: null, name: 'Segmental Cat-Camel', targetArea: 'spine', sets: 2, reps: 6, holdSeconds: null, rationale: 'Improves spinal segmentation and usable flexion-extension range.', study: 'McGill (2010). Core training: evidence translating to better performance and injury prevention. Strength and Conditioning Journal.' },
      { videoId: null, name: 'Half-Kneeling Windmill', targetArea: 'spine', sets: 2, reps: 5, holdSeconds: 5, rationale: 'Integrates thoracic rotation and hip control under light load.', study: 'Cook et al. (2014). Movement: functional movement systems. On Target Publications.' },
    ],
  },
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

function goalBalancedPillars(goal: string) {
  if (goal === 'flexibility') return ['release', 'release', 'activation', 'range'] as const
  if (goal === 'strength') return ['activation', 'activation', 'release', 'range'] as const
  if (goal === 'performance') return ['range', 'activation', 'release', 'range'] as const
  return ['release', 'activation', 'range', 'activation'] as const
}

function buildFallbackRoutine({
  mode,
  sport,
  targetAreas,
  duration,
  goal,
  prepPhase,
}: {
  mode: 'sport' | 'area'
  sport: string | null
  targetAreas: string[]
  duration: number
  goal: string
  prepPhase: RoutinePhase | null
}): GeneratedRoutine {
  const pillars: Array<'release' | 'activation' | 'range'> = ['release', 'activation', 'range']
  const exerciseTarget = Math.max(4, Math.min(8, Math.round(duration / 4)))
  const emphasis = goalBalancedPillars(goal)
  const chosenAreas = targetAreas.length > 0 ? targetAreas : ['hips', 'shoulders', 'spine']
  const phases: RoutinePhase[] = pillars.map((pillar) => ({
    pillar,
    phaseDescription:
      pillar === 'release'
        ? 'Reduce stiffness around the target joints before loading.'
        : pillar === 'activation'
          ? 'Build control through the range you want to keep.'
          : 'Use the new range under strength and end-range tension.',
    exercises: [],
  }))

  for (let index = 0; index < exerciseTarget; index += 1) {
    const area = chosenAreas[index % chosenAreas.length]
    const pillar = emphasis[index % emphasis.length]
    const library = FALLBACK_LIBRARY[area]?.[pillar]
    const pick = library?.[Math.floor(index / chosenAreas.length) % library.length]
    if (!pick) continue
    const phase = phases.find((item) => item.pillar === pillar)
    if (phase && !phase.exercises.some((exercise) => exercise.name === pick.name)) {
      phase.exercises.push(pick)
    }
  }

  for (const pillar of pillars) {
    const phase = phases.find((item) => item.pillar === pillar)
    if (!phase || phase.exercises.length > 0) continue
    const area = chosenAreas[0]
    phase.exercises.push(FALLBACK_LIBRARY[area][pillar][0])
  }

  const filteredPhases = phases.filter((phase) => phase.exercises.length > 0)
  if (prepPhase) {
    filteredPhases.unshift(prepPhase)
  }

  const totalExercises = filteredPhases.reduce((sum, phase) => sum + phase.exercises.length, 0)
  const titleFocus = mode === 'sport' && sport ? `${sport.toUpperCase()} MOBILITY FLOW` : `${chosenAreas[0].toUpperCase()} MOBILITY FLOW`

  return {
    routineTitle: titleFocus,
    summary: 'This routine was assembled from the in-app exercise library so you still get a usable session immediately. It follows the same release, activation, and range structure as the AI flow.',
    difficultyLevel: goal === 'performance' ? 'Intermediate' : 'Beginner',
    totalExercises,
    phases: filteredPhases,
    evidenceSummary: 'This session uses the app fallback library built from common mobility, control, and end-range strength patterns so routine generation stays reliable when the AI call is slow or unavailable.',
  }
}

export async function POST(req: NextRequest) {
  let userId: string | null = null
  let mode: 'sport' | 'area' = 'area'
  let sport: string | null = null
  let areas: string[] | null = null
  let duration = 20
  let goal = 'balanced'
  let includeFoamRoll = false

  try {
    ;({ userId, mode, sport, areas, duration, goal, includeFoamRoll } = await req.json() as GenerateRequest)

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

    const fallbackRoutine = buildFallbackRoutine({
      mode,
      sport,
      targetAreas,
      duration,
      goal,
      prepPhase,
    })

    let anthropic: Anthropic
    try {
      anthropic = createAnthropicClient()
    } catch (error) {
      console.error('[generate.env]', error)
      return NextResponse.json(fallbackRoutine)
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

    try {
      const message = await Promise.race([
        anthropic.messages.create({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 4000,
          messages:   [{ role: 'user', content: prompt }],
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Anthropic request timed out')), 20000)
        }),
      ])

      const raw = (message.content as MessageBlock[]).map((block) => block.text || '').join('')
      const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      const jsonStart = cleaned.indexOf('{')
      const jsonEnd   = cleaned.lastIndexOf('}')
      if (jsonStart === -1 || jsonEnd === -1) {
        throw new Error(`AI returned non-JSON response: ${cleaned.slice(0, 200)}`)
      }
      const routine = JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as GeneratedRoutine

      if (prepPhase) {
        routine.phases.unshift(prepPhase)
        routine.totalExercises += prepPhase.exercises.length
      }

      return NextResponse.json(routine)
    } catch (error) {
      console.error('[generate.ai]', error)
      return NextResponse.json(fallbackRoutine)
    }

  } catch (err: unknown) {
    console.error('[generate]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
