import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import type { ReadinessAdjustmentSnapshot } from '@/lib/readiness'

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

const SPORT_AREA_PRIORITY: Record<string, string[]> = {
  golf: ['hips', 'spine', 'shoulders'],
  afl: ['hips', 'spine', 'shoulders'],
  rugby: ['spine', 'hips', 'shoulders'],
  soccer: ['hips', 'spine', 'shoulders'],
  wrestling: ['shoulders', 'spine', 'hips'],
  weightlifting: ['shoulders', 'spine', 'hips'],
  cricket: ['shoulders', 'spine', 'hips'],
  tennis: ['shoulders', 'spine', 'hips'],
  basketball: ['hips', 'spine', 'shoulders'],
  volleyball: ['shoulders', 'spine', 'hips'],
  netball: ['hips', 'shoulders', 'spine'],
  bjj: ['hips', 'spine', 'shoulders'],
  kickboxing: ['hips', 'spine', 'shoulders'],
  muaythai: ['hips', 'spine', 'shoulders'],
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
  readiness?: ReadinessAdjustmentSnapshot | null
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

function buildPhaseSlots(goal: string, exerciseTarget: number, areaCount: number) {
  const minimumRelease = Math.min(Math.max(areaCount, 1), 3)

  let releaseCount = 1
  if (goal === 'flexibility') {
    releaseCount = Math.max(minimumRelease, Math.ceil(exerciseTarget * 0.5))
  } else if (goal === 'balanced') {
    releaseCount = Math.max(minimumRelease, Math.ceil(exerciseTarget * 0.4))
  } else if (goal === 'performance') {
    releaseCount = Math.max(1, Math.ceil(exerciseTarget * 0.25))
  } else {
    releaseCount = Math.max(1, Math.ceil(exerciseTarget * 0.25))
  }

  releaseCount = Math.min(releaseCount, exerciseTarget - 2)
  const remaining = exerciseTarget - releaseCount
  const activationCount = Math.ceil(remaining / 2)
  const rangeCount = remaining - activationCount

  const slots: Array<'release' | 'activation' | 'range'> = [
    ...Array.from({ length: releaseCount }, () => 'release' as const),
    ...Array.from({ length: activationCount }, () => 'activation' as const),
    ...Array.from({ length: rangeCount }, () => 'range' as const),
  ]

  return slots
}

function releaseSetCount(goal: string) {
  return goal === 'flexibility' ? 2 : 1
}

function normalizeRoutineForGoal(routine: GeneratedRoutine, goal: string): GeneratedRoutine {
  return {
    ...routine,
    phases: routine.phases.map((phase) => ({
      ...phase,
      exercises: phase.exercises.map((exercise) => (
        phase.pillar === 'release'
          ? { ...exercise, sets: releaseSetCount(goal) }
          : exercise
      )),
    })),
  }
}

function formatAreaLabel(area: string) {
  if (area === 'spine') return 'spine and trunk'
  return area
}

function joinLabels(labels: string[]) {
  if (labels.length <= 1) return labels[0] || ''
  if (labels.length === 2) return `${labels[0]} and ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')}, and ${labels[labels.length - 1]}`
}

function buildRoutineSummary(goal: string, chosenAreas: string[], sport: string | null, mode: 'sport' | 'area') {
  const areaText = joinLabels(chosenAreas.map(formatAreaLabel))
  if (mode === 'sport' && sport) {
    return `This ${goal} ${sport.toLowerCase()} session starts by opening the ${areaText}, then layers control and strength-through-range work so the mobility carries over into how you move and train.`
  }

  return `This ${goal} mobility session starts by opening the ${areaText}, then layers control and strength-through-range work so the mobility carries over into usable movement quality rather than passive flexibility alone.`
}

function buildRoutineEvidenceSummary(goal: string, chosenAreas: string[], readiness: ReadinessAdjustmentSnapshot | null | undefined) {
  const areaText = joinLabels(chosenAreas.map(formatAreaLabel))
  const goalLead =
    goal === 'flexibility'
      ? 'The session leans heavily into release first, because flexibility responds best when surrounding tissues are given enough time to down-regulate before active work.'
      : goal === 'performance'
        ? 'The session keeps the opening work efficient, then shifts quickly into activation and end-range strength so the new range is immediately expressed under control.'
        : goal === 'strength'
          ? 'The session uses enough release to free up the target joints, then prioritizes activation and loaded range so mobility is reinforced with strength.'
          : 'The session balances release, activation, and range-strength work so the joints are first opened, then actively controlled, then reinforced under load.'

  const readinessNote =
    readiness && readiness.modificationMode !== 'normal'
      ? ` It also biases away from irritated areas when possible, so the ${areaText} can still be trained without forcing the sore regions.`
      : ''

  return `${goalLead} Covering the ${areaText} this way is more effective than isolated stretching, because the session improves tissue tolerance, motor control, and usable range together.${readinessNote}`
}

function resolveTargetAreas(mode: 'sport' | 'area', sport: string | null, areas: string[] | null) {
  if (areas && areas.length > 0) {
    return areas
  }

  if (mode === 'sport' && sport && SPORT_AREA_PRIORITY[sport]) {
    return SPORT_AREA_PRIORITY[sport]
  }

  return ['hips', 'shoulders', 'spine']
}

function getRoutineAreas(targetAreas: string[], readiness: ReadinessAdjustmentSnapshot | null | undefined) {
  const base = targetAreas.length > 0 ? targetAreas : ['hips', 'shoulders', 'spine']
  if (!readiness || (readiness.modificationMode !== 'avoid_sore_areas' && readiness.modificationMode !== 'recovery')) {
    return base
  }

  const restricted = new Set(readiness.restrictedAreas)
  const filtered = base.filter((area) => !restricted.has(area))
  return filtered.length > 0 ? filtered : base
}

function buildFallbackRoutine({
  mode,
  sport,
  targetAreas,
  duration,
  goal,
  prepPhase,
  readiness,
}: {
  mode: 'sport' | 'area'
  sport: string | null
  targetAreas: string[]
  duration: number
  goal: string
  prepPhase: RoutinePhase | null
  readiness?: ReadinessAdjustmentSnapshot | null
}): GeneratedRoutine {
  const pillars: Array<'release' | 'activation' | 'range'> = ['release', 'activation', 'range']
  const exerciseTarget = Math.max(4, Math.min(8, Math.round(duration / 4)))
  const chosenAreas = getRoutineAreas(targetAreas, readiness)
  const phaseSlots = buildPhaseSlots(goal, exerciseTarget, chosenAreas.length)
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
    const pillar = phaseSlots[index % phaseSlots.length]
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
    summary: buildRoutineSummary(goal, chosenAreas, sport, mode),
    difficultyLevel: readiness?.modificationMode === 'recovery' ? 'Beginner' : goal === 'performance' ? 'Intermediate' : 'Beginner',
    totalExercises,
    phases: filteredPhases.map((phase) => ({
      ...phase,
      exercises: phase.exercises.map((exercise) => (
        phase.pillar === 'release'
          ? { ...exercise, sets: releaseSetCount(goal) }
          : exercise
      )),
    })),
    evidenceSummary: buildRoutineEvidenceSummary(goal, chosenAreas, readiness),
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
  let readiness: ReadinessAdjustmentSnapshot | null = null

  try {
    ;({ userId, mode, sport, areas, duration, goal, includeFoamRoll, readiness = null } = await req.json() as GenerateRequest)

    const targetAreas = resolveTargetAreas(mode, sport, areas)
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
      readiness,
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
    const baseExerciseCount = Math.max(4, Math.round(aiDuration / 4))
    const exerciseCount =
      goal === 'balanced' || goal === 'flexibility'
        ? Math.max(baseExerciseCount, aiDuration >= 18 ? 6 : 5)
        : baseExerciseCount

    const prompt = `You are an expert sports physiotherapist and strength and conditioning coach building an evidence-based joint mobility routine.

USER PROFILE:
- Mode: ${mode === 'sport' ? 'Sport-specific' : 'Body area focus'}
${sportFocus ? `- Sport: ${sport} (key demands: ${sportFocus})` : ''}
- Focus Areas: ${areasText}
- Session Duration: ${aiDuration} minutes
- Primary Goal: ${goal}
${readiness ? `- Readiness Score: ${readiness.readinessScore}
- Readiness State: ${readiness.readinessLabel}
- Soreness Areas: ${readiness.sorenessAreas.join(', ') || 'none'}
- Soreness Severity: ${readiness.sorenessSeverity}/10
- Restricted Areas: ${readiness.restrictedAreas.join(', ') || 'none'}
- Modification Mode: ${readiness.modificationMode}
- Readiness Note: ${readiness.sorenessNotes || 'none'}` : ''}

SESSION STRUCTURE — THREE PHASES ONLY:

1. RELEASE — Loosen soft tissue surrounding target joints.
   Use: Static stretches, dynamic stretches, PNF, passive holds, joint distractions.
   DO NOT include foam rolling or roller-based exercises.

2. ACTIVATION — Build neuromuscular control through the released range.
   Use: Isometric holds, eccentric loading, CARs, lift-offs, and controlled active mobility.

3. RANGE — Integrate strength and flexibility at end range.
   Use: loaded end-range holds, controlled end-range isometrics, active mobility, and simple strength-through-range work.

PILLAR WEIGHTING BY GOAL:
- flexibility  → 50% release, 25% activation, 25% range
- strength     → 25% release, 50% activation, 25% range
- balanced     → meaningful release first, then activation and range
- performance  → 25% release, 25% activation, 50% range

Create ${exerciseCount} total exercises. Cite REAL peer-reviewed studies (JOSPT, BJSM, JSCR, IJSPT).
Release phase must contain ONLY stretching — no foam rolling.
Unless the goal is flexibility, release exercises should default to 1 set each so the session can cover more surrounding structures. Only use 2 sets for release when the goal is flexibility.
Do not use or mention PAILs or RAILs in this standard routine builder.
For balanced and flexibility sessions, release must be substantial rather than token. Cover multiple structures around the joint, not just one stretch per region.
For sport-specific balanced sessions, release should usually contain at least 3 exercises when the session length allows it.
Do not give a balanced session just one pec stretch and one hip stretch and call release covered.
If mode is sport-specific, bias the session toward the top biomechanical demands of that sport instead of spreading attention evenly across every joint. Around 60-70% of the session should support the primary sport demands.
If readiness indicates soreness or restriction:
- avoid aggressive loading and aggressive end-range work for restricted areas
- where possible, shift focus away from sore areas instead of hammering them
- if the only selected focus area is sore, keep the work gentle, recovery-biased, and non-provocative
- if modification mode is recovery, keep the full session restorative and conservative

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
      const routine = normalizeRoutineForGoal(JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as GeneratedRoutine, goal)

      if (prepPhase) {
        routine.phases.unshift(prepPhase)
        routine.totalExercises += prepPhase.exercises.length
      }

      return NextResponse.json(routine)
    } catch (error) {
      if (error instanceof Error && error.message === 'Anthropic request timed out') {
        console.warn('[generate.ai] Anthropic timed out, returning fallback routine')
      } else {
        console.error('[generate.ai]', error)
      }
      return NextResponse.json(fallbackRoutine)
    }

  } catch (err: unknown) {
    console.error('[generate]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
