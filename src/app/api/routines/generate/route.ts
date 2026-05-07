import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { readBasicDailyRoutineLimit } from '@/lib/app-config'
import { buildApprovedExercisePoolText, CURATED_ROUTINE_LIBRARY } from '@/lib/curated-mobility'
import {
  deriveRoutineReadinessModifiers,
  readTodayReadinessAdjustmentSnapshot,
  type ReadinessAdjustmentSnapshot,
} from '@/lib/readiness'
import { SPORT_PROFILE_MAP } from '@/lib/sports'
import { createAccessTokenClient, createAuthClient } from '@/lib/supabase/admin'

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
  process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

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
  readiness?: ReadinessAdjustmentSnapshot | null
}

function startOfTodayUtcIso() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)).toISOString()
}

function readAccessToken(req: NextRequest) {
  const authHeader = req.headers.get('authorization') || ''
  return authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : ''
}

async function validateAuthenticatedUser(req: NextRequest, requestedUserId: string | null) {
  const accessToken = readAccessToken(req)

  if (!accessToken || !requestedUserId) {
    return null
  }

  const authClient = createAuthClient(accessToken)
  const {
    data: { user },
    error,
  } = await authClient.auth.getUser(accessToken)

  if (error || !user || user.id !== requestedUserId) {
    throw new Error('Routine generation request is not authenticated.')
  }

  return user.id
}

type CuratedPillar = 'release' | 'activation' | 'range'

type MessageBlock = {
  type: string
  text?: string
}

const FOAM_ROLL_LIBRARY: Record<string, FoamRollExercise[]> = {
  hips: [
    { name: 'IT Band Roll',            area: 'hips',      notes: 'Side lying, roll hip to knee - pause on tender spots 5-10s.' },
    { name: 'Glute / Piriformis Roll', area: 'hips',      notes: 'Figure 4 position on roller - cross leg for deeper pressure.' },
    { name: 'Hip Flexor Roll',         area: 'hips',      notes: 'Prone, roller under anterior hip - TFL and iliopsoas.' },
    { name: 'Hamstring Roll',          area: 'hips',      notes: 'Seated on roller - proximal to distal, cross leg for more pressure.' },
    { name: 'Quad Roll',               area: 'hips',      notes: 'Prone, roller under thigh - rectus femoris and vastus lateralis.' },
  ],
  shoulders: [
    { name: 'Thoracic Spine Roll',     area: 'shoulders', notes: 'Slow roll T1 to T12 - pause on tender spots, arms crossed.' },
    { name: 'Lat Roll',                area: 'shoulders', notes: 'Side lying arm overhead - latissimus dorsi and teres major.' },
    { name: 'Pec Minor Roll',          area: 'shoulders', notes: 'Prone, roller near shoulder - rotate to find pec minor.' },
    { name: 'Posterior Shoulder Roll', area: 'shoulders', notes: 'Side lying, roller on posterior capsule - gentle rotation.' },
  ],
  spine: [
    { name: 'Thoracic Spine Roll',    area: 'spine', notes: 'Slow roll T1 to T12 - pause on tender spots, breathe into each segment.' },
    { name: 'Thoracic Rotation Roll', area: 'spine', notes: 'T-spine rotation over roller - lateral thoracic and rib cage release.' },
    { name: 'Lumbar Paraspinal Roll', area: 'spine', notes: 'Feet flat, hips up - roll slowly along paraspinals.' },
    { name: 'QL / Hip Roll',          area: 'spine', notes: 'Side lying at 45 degrees - quadratus lumborum and iliolumbar fascia.' },
  ],
}

const FALLBACK_LIBRARY: Record<string, Record<'release' | 'activation' | 'range', RoutineExercise[]>> = {
  hips: {
    release: [
      { videoId: null, name: '90/90 Hip Stretch', targetArea: 'hips', sets: 2, reps: 6, holdSeconds: null, rationale: 'Opens internal and external hip rotation through controlled movement to reduce stiffness before loading.', study: 'Behm et al. (2016). Acute effects of muscle stretching on physical performance. Applied Physiology, Nutrition, and Metabolism.' },
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
      { videoId: null, name: 'Tall-Kneeling Overhead Reach', targetArea: 'shoulders', sets: 3, reps: 6, holdSeconds: null, rationale: 'Integrates thoracic extension with loaded overhead positioning.', study: 'Manske et al. (2013). Current concepts in shoulder examination and treatment. IJSPT.' },
      { videoId: null, name: 'Push-Up Plus', targetArea: 'shoulders', sets: 3, reps: 8, holdSeconds: null, rationale: 'Strengthens serratus-driven control at end range.', study: 'Ludewig et al. (2004). Relative balance of serratus anterior and upper trapezius muscle activity during push-up exercises. AJSM.' },
    ],
  },
  spine: {
    release: [
      { videoId: null, name: 'Open Book Rotation', targetArea: 'spine', sets: 2, reps: 6, holdSeconds: null, rationale: 'Restores thoracic rotation and ribcage motion for cleaner trunk mechanics.', study: 'Page (2012). Current concepts in muscle stretching for exercise and rehabilitation. IJSPT.' },
      { videoId: null, name: 'Childs Pose Reach', targetArea: 'spine', sets: 2, reps: null, holdSeconds: 40, rationale: 'Reduces global trunk stiffness while opening lats and thoracic segments.', study: 'Behm et al. (2016). Acute effects of muscle stretching on physical performance. Applied Physiology, Nutrition, and Metabolism.' },
      { videoId: null, name: 'Segmental Cat-Camel', targetArea: 'spine', sets: 1, reps: 6, holdSeconds: null, rationale: 'Improves spinal segmentation and reduces stiffness before stronger loading or active control work.', study: 'McGill (2010). Core training: evidence translating to better performance and injury prevention. Strength and Conditioning Journal.' },
    ],
    activation: [
      { videoId: null, name: 'Quadruped T-Spine Rotation', targetArea: 'spine', sets: 2, reps: 6, holdSeconds: null, rationale: 'Trains thoracic rotation while keeping the lumbar spine controlled.', study: 'Cook et al. (2014). Movement: functional movement systems. On Target Publications.' },
      { videoId: null, name: 'Dead Bug Iso Press', targetArea: 'spine', sets: 3, reps: null, holdSeconds: 20, rationale: 'Builds trunk stability so mobility gains do not leak through the lower back.', study: 'McGill (2010). Core training: evidence translating to better performance and injury prevention. Strength and Conditioning Journal.' },
    ],
    range: [
      { videoId: null, name: 'Half-Kneeling Windmill', targetArea: 'spine', sets: 2, reps: 6, holdSeconds: null, rationale: 'Integrates thoracic rotation and hip control under light load.', study: 'Cook et al. (2014). Movement: functional movement systems. On Target Publications.' },
      { videoId: null, name: 'Side Plank Reach-Through', targetArea: 'spine', sets: 2, reps: 6, holdSeconds: null, rationale: 'Builds trunk strength and rotation control while loading the new spinal range under tension.', study: 'McGill (2010). Core training: evidence translating to better performance and injury prevention. Strength and Conditioning Journal.' },
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

const RELEASE_REP_SECONDS = 4
const ACTIVE_REP_SECONDS = 3.5
const HOLD_REST_SECONDS = 15
const REP_REST_SECONDS = 12
const EXERCISE_SETUP_SECONDS = 15

function estimateExerciseDurationSeconds(
  exercise: Pick<RoutineExercise, 'sets' | 'reps' | 'holdSeconds'>,
  pillar: RoutinePhase['pillar'],
) {
  const setCount = Math.max(exercise.sets, 1)

  if (exercise.holdSeconds) {
    return EXERCISE_SETUP_SECONDS + (setCount * exercise.holdSeconds) + (Math.max(setCount - 1, 0) * HOLD_REST_SECONDS)
  }

  const repCount = Math.max(exercise.reps || 0, 1)
  const repSeconds = pillar === 'release' ? RELEASE_REP_SECONDS : ACTIVE_REP_SECONDS
  return EXERCISE_SETUP_SECONDS + (setCount * repCount * repSeconds) + (Math.max(setCount - 1, 0) * REP_REST_SECONDS)
}

function estimatePhaseDurationMinutes(phase: RoutinePhase | null) {
  if (!phase) return 0
  const totalSeconds = phase.exercises.reduce(
    (sum, exercise) => sum + estimateExerciseDurationSeconds(exercise, phase.pillar),
    0,
  )
  return totalSeconds / 60
}

function estimateRoutineDurationMinutes(routine: GeneratedRoutine) {
  return routine.phases.reduce((sum, phase) => sum + estimatePhaseDurationMinutes(phase), 0)
}

function estimateTargetMainDurationMinutes(duration: number, prepPhase: RoutinePhase | null) {
  const prepMinutes = estimatePhaseDurationMinutes(prepPhase)
  return Math.max(6, duration - prepMinutes)
}

function buildExerciseTargetFromDuration({
  duration,
  goal,
  areaCount,
}: {
  duration: number
  goal: string
  areaCount: number
}) {
  const minimumDoseCount = areaCount * 3
  const averageExtraExerciseMinutes = goal === 'flexibility' ? 1.6 : 1.4
  const minimumDoseMinutes = areaCount * 3.9
  const remainingMinutes = Math.max(0, duration - minimumDoseMinutes)
  return minimumDoseCount + Math.max(0, Math.round(remainingMinutes / averageExtraExerciseMinutes))
}

function isRoutineDurationOutsideWindow(routine: GeneratedRoutine, requestedDuration: number) {
  const estimatedDuration = estimateRoutineDurationMinutes(routine)
  const lowerBound = Math.max(6, requestedDuration * 0.8)
  const upperBound = Math.max(lowerBound + 2, requestedDuration * 1.2)
  return estimatedDuration < lowerBound || estimatedDuration > upperBound
}

function shouldUseLighterRangeSetScheme(goal: string, readiness: ReadinessAdjustmentSnapshot | null | undefined) {
  return goal === 'performance'
    || goal === 'flexibility'
    || readiness?.modificationMode === 'recovery'
}

function normalizeRoutineForGoal(
  routine: GeneratedRoutine,
  options?: { goal?: string; readiness?: ReadinessAdjustmentSnapshot | null },
): GeneratedRoutine {
  return {
    ...routine,
    phases: routine.phases.map((phase) => applyFallbackPhaseSetRules(phase, options)),
  }
}

function countExercisesForPillar(routine: GeneratedRoutine, pillar: 'release' | 'activation' | 'range') {
  return routine.phases
    .filter((phase) => phase.pillar === pillar)
    .reduce((sum, phase) => sum + phase.exercises.length, 0)
}

function routineHasPillar(routine: GeneratedRoutine, pillar: 'release' | 'activation' | 'range') {
  return routine.phases.some((phase) => phase.pillar === pillar && phase.exercises.length > 0)
}

function routineTargetsArea(routine: GeneratedRoutine, area: string) {
  return routine.phases.some((phase) =>
    phase.exercises.some((exercise) => exercise.targetArea === area),
  )
}

function applyFallbackPhaseSetRules(
  phase: RoutinePhase,
  options?: { goal?: string; readiness?: ReadinessAdjustmentSnapshot | null },
): RoutinePhase {
  const lighterRangeScheme = shouldUseLighterRangeSetScheme(options?.goal || 'balanced', options?.readiness)

  return {
    ...phase,
    exercises: phase.exercises.map((exercise, index) => {
      if (phase.pillar === 'release') {
        return { ...exercise, sets: 1 }
      }

      if (phase.pillar === 'activation') {
        return { ...exercise, sets: index < 2 ? 2 : 1 }
      }

      if (phase.pillar === 'range') {
        if (lighterRangeScheme) {
          const prioritizeTwoRangeDrills = phase.exercises.length >= 4 ? index < 2 : index === 0
          return { ...exercise, sets: prioritizeTwoRangeDrills ? 2 : 1 }
        }

        return { ...exercise, sets: 2 }
      }

      return exercise
    }),
  }
}

function phaseTargetsArea(
  routine: GeneratedRoutine,
  pillar: 'release' | 'activation' | 'range',
  area: string,
) {
  return routine.phases.some(
    (phase) =>
      phase.pillar === pillar &&
      phase.exercises.some((exercise) => exercise.targetArea === area),
  )
}

function needsCuratedFallback(routine: GeneratedRoutine, goal: string, targetAreas: string[]) {
  const releaseCount = countExercisesForPillar(routine, 'release')
  const activationCount = countExercisesForPillar(routine, 'activation')
  const rangeCount = countExercisesForPillar(routine, 'range')
  const normalizedAreas = targetAreas.length > 0 ? targetAreas : ['hips', 'shoulders', 'spine']
  const areaCoverage = normalizedAreas.filter((area) => routineTargetsArea(routine, area)).length

  if (!routineHasPillar(routine, 'release') || !routineHasPillar(routine, 'activation') || !routineHasPillar(routine, 'range')) {
    return true
  }

  if (normalizedAreas.some((area) =>
    !phaseTargetsArea(routine, 'release', area)
    || !phaseTargetsArea(routine, 'activation', area)
    || !phaseTargetsArea(routine, 'range', area)
  )) {
    return true
  }

  if (goal === 'balanced') {
    if (releaseCount < Math.min(Math.max(normalizedAreas.length, 2), 3)) return true
    if (activationCount < 2) return true
    if (rangeCount < 1) return true
    if (areaCoverage < normalizedAreas.length) return true

    const requiredActivationAreas = normalizedAreas.slice(0, Math.min(normalizedAreas.length, activationCount))
    if (requiredActivationAreas.some((area) => !phaseTargetsArea(routine, 'activation', area))) {
      return true
    }
  }

  if (goal === 'flexibility' && releaseCount < 3) {
    return true
  }

  if (areaCoverage < Math.min(normalizedAreas.length, 2)) {
    return true
  }

  return false
}

function canAddAnyExercise(
  phases: RoutinePhase[],
  targetAreas: string[],
  pillar: CuratedPillar,
) {
  return targetAreas.some((area) => {
    const phase = phases.find((item) => item.pillar === pillar)
    const library = getCuratedLibrary(area, pillar)
    return Boolean(phase && library.some((exercise) => !phase.exercises.some((existing) => existing.name === exercise.name)))
  })
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
  const sportProfile = sport ? SPORT_PROFILE_MAP[sport] : null
  if (mode === 'sport' && sport) {
    return `This ${goal} ${(sportProfile?.label || sport).toLowerCase()} session starts by opening the ${areaText}, then layers control and strength-through-range work so the mobility carries over into how you move and train.`
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

function buildRoutineTitle({
  mode,
  sport,
  chosenAreas,
  goal,
}: {
  mode: 'sport' | 'area'
  sport: string | null
  chosenAreas: string[]
  goal: string
}) {
  const sportLabel = sport ? SPORT_PROFILE_MAP[sport]?.label || sport : null
  const primaryArea = chosenAreas[0] || 'Mobility'
  const focusLabel =
    primaryArea === 'hips'
      ? 'Hip Mobility'
      : primaryArea === 'shoulders'
        ? 'Shoulder Activation'
        : primaryArea === 'spine'
          ? 'Spine Mobility'
          : 'Mobility Flow'

  if (mode === 'sport' && sportLabel) {
    const shortSport = sportLabel.split(' ').slice(0, 2).join(' ')
    const context = goal === 'performance' ? `${shortSport} Prep` : goal === 'flexibility' ? `${shortSport} Reset` : `${shortSport} Series`
    return `${focusLabel} — ${context}`
  }

  const context =
    goal === 'performance'
      ? 'Pre-Session'
      : goal === 'flexibility'
        ? 'Recovery Session'
        : goal === 'strength'
          ? 'Control Series'
          : 'Daily Session'

  return `${focusLabel} — ${context}`
}

function resolveTargetAreas(mode: 'sport' | 'area', sport: string | null, areas: string[] | null) {
  if (areas && areas.length > 0) {
    return areas
  }

  if (mode === 'sport' && sport && SPORT_PROFILE_MAP[sport]) {
    return SPORT_PROFILE_MAP[sport].targetAreas
  }

  return ['hips', 'shoulders', 'spine']
}

function getRoutineAreas(targetAreas: string[]) {
  const base = targetAreas.length > 0 ? targetAreas : ['hips', 'shoulders', 'spine']
  return base
}

function getAreaCycleForPillar({
  targetAreas,
  pillar,
  reducedTargetAreas,
  releaseBiasAreas,
}: {
  targetAreas: string[]
  pillar: CuratedPillar
  reducedTargetAreas: string[]
  releaseBiasAreas: string[]
}) {
  const base = targetAreas.length > 0 ? targetAreas : ['hips', 'shoulders', 'spine']
  const reduced = new Set(reducedTargetAreas)

  if (pillar === 'release' && releaseBiasAreas.length > 0) {
    const preferred = [...releaseBiasAreas.filter((area) => base.includes(area))]
    const remaining = base.filter((area) => !preferred.includes(area))
    return [...preferred, ...remaining]
  }

  const preferred = base.filter((area) => !reduced.has(area))
  const reducedAreas = base.filter((area) => reduced.has(area))
  return [...preferred, ...reducedAreas]
}

function readSportSeed(sport: string | null, area: string, pillar: CuratedPillar) {
  const source = `${sport || 'generic'}:${area}:${pillar}`
  return Array.from(source).reduce((sum, character) => sum + character.charCodeAt(0), 0)
}

function addExerciseToPhase({
  phases,
  pillar,
  area,
  preferredIndex = 0,
}: {
  phases: RoutinePhase[]
  pillar: CuratedPillar
  area: string
  preferredIndex?: number
}) {
  const phase = phases.find((item) => item.pillar === pillar)
  const library = getCuratedLibrary(area, pillar)

  if (!phase || library.length === 0) {
    return false
  }

  const orderedLibrary = library.map((exercise, index) => ({
    exercise,
    index,
    distance: (index - preferredIndex + library.length) % library.length,
  }))

  const nextPick =
    orderedLibrary
      .sort((left, right) => left.distance - right.distance)
      .map((entry) => entry.exercise)
      .find((exercise) => !phase.exercises.some((existing) => existing.name === exercise.name))
    || library[preferredIndex % library.length]

  if (!nextPick || phase.exercises.some((exercise) => exercise.name === nextPick.name)) {
    return false
  }

  phase.exercises.push(toRoutineExercise(nextPick))
  return true
}

function getCuratedLibrary(area: string, pillar: CuratedPillar) {
  if (area in CURATED_ROUTINE_LIBRARY) {
    return CURATED_ROUTINE_LIBRARY[area as keyof typeof CURATED_ROUTINE_LIBRARY][pillar]
  }

  return []
}

function toRoutineExercise(template: (typeof CURATED_ROUTINE_LIBRARY)['hips']['release'][number]): RoutineExercise {
  return {
    videoId: null,
    name: template.name,
    targetArea: template.targetArea,
    sets: template.sets,
    reps: template.reps,
    holdSeconds: template.holdSeconds,
    rationale: template.rationale,
    study: template.study,
  }
}

function normalizeExerciseName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function getApprovedExerciseCanonicalMap(targetAreas: string[]) {
  const allExercises = targetAreas
    .filter((area): area is keyof typeof CURATED_ROUTINE_LIBRARY => area in CURATED_ROUTINE_LIBRARY)
    .flatMap((area) => {
      const phases = CURATED_ROUTINE_LIBRARY[area]
      return [...phases.release, ...phases.activation, ...phases.range]
    })

  const map = new Map<string, string>()
  for (const exercise of allExercises) {
    map.set(normalizeExerciseName(exercise.name), exercise.name)
    for (const alias of exercise.aliases || []) {
      map.set(normalizeExerciseName(alias), exercise.name)
    }
  }
  return map
}

function normalizeRoutineExerciseNames(routine: GeneratedRoutine, targetAreas: string[]) {
  const approvedMap = getApprovedExerciseCanonicalMap(targetAreas)

  return {
    ...routine,
    phases: routine.phases.map((phase) => ({
      ...phase,
      exercises: phase.exercises.map((exercise) => {
        const canonicalName = approvedMap.get(normalizeExerciseName(exercise.name))
        return canonicalName
          ? { ...exercise, name: canonicalName }
          : exercise
      }),
    })),
  }
}

async function persistGeneratedRoutine({
  supabaseClient,
  userId,
  routine,
  sport,
  areas,
  duration,
  goal,
}: {
  supabaseClient: ReturnType<typeof createAccessTokenClient>
  userId: string
  routine: GeneratedRoutine
  sport: string | null
  areas: string[]
  duration: number
  goal: string
}) {
  const { data: savedRoutine, error: routineError } = await supabaseClient
    .from('routines')
    .insert([{
      user_id: userId,
      title: routine.routineTitle,
      sport: sport || null,
      areas,
      goal: goal || null,
      duration_minutes: duration || null,
      difficulty: routine.difficultyLevel,
      summary: routine.summary,
      evidence_summary: routine.evidenceSummary,
    }])
    .select('id')
    .single<{ id: number }>()

  if (routineError) {
    throw new Error(`[generate.persistRoutine] ${routineError.message}`)
  }

  const items = routine.phases.flatMap((phase, phaseIndex) =>
    phase.exercises.map((exercise, exerciseIndex) => ({
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
    })),
  )

  if (items.length > 0) {
    const { error: itemsError } = await supabaseClient.from('routine_items').insert(items)
    if (itemsError) {
      throw new Error(`[generate.persistRoutineItems] ${itemsError.message}`)
    }
  }

  return savedRoutine.id
}

async function maybePersistRoutineForAuthenticatedUser({
  authenticatedUserId,
  authenticatedSupabase,
  routine,
  sport,
  targetAreas,
  sessionDuration,
  effectiveGoal,
}: {
  authenticatedUserId: string | null
  authenticatedSupabase: ReturnType<typeof createAccessTokenClient> | null
  routine: GeneratedRoutine
  sport: string | null
  targetAreas: string[]
  sessionDuration: number
  effectiveGoal: string
}) {
  if (!authenticatedUserId || !authenticatedSupabase) {
    return routine
  }

  const savedId = await persistGeneratedRoutine({
    supabaseClient: authenticatedSupabase,
    userId: authenticatedUserId,
    routine,
    sport,
    areas: targetAreas,
    duration: sessionDuration,
    goal: effectiveGoal,
  })

  return { ...routine, savedId }
}

function buildFallbackRoutine({
  mode,
  sport,
  targetAreas,
  duration,
  goal,
  prepPhase,
  readiness,
  reducedTargetAreas = [],
  releaseBiasAreas = [],
}: {
  mode: 'sport' | 'area'
  sport: string | null
  targetAreas: string[]
  duration: number
  goal: string
  prepPhase: RoutinePhase | null
  readiness?: ReadinessAdjustmentSnapshot | null
  reducedTargetAreas?: string[]
  releaseBiasAreas?: string[]
}): GeneratedRoutine {
  const pillars: Array<'release' | 'activation' | 'range'> = ['release', 'activation', 'range']
  const chosenAreas = getRoutineAreas(targetAreas)
  const minimumDoseExerciseCount = chosenAreas.length * pillars.length
  const targetMainDuration = estimateTargetMainDurationMinutes(duration, prepPhase)
  const exerciseTarget = Math.max(
    minimumDoseExerciseCount,
    buildExerciseTargetFromDuration({
      duration: targetMainDuration,
      goal,
      areaCount: chosenAreas.length,
    }),
  )
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

  for (const area of chosenAreas) {
    addExerciseToPhase({ phases, pillar: 'release', area, preferredIndex: readSportSeed(sport, area, 'release') })
    addExerciseToPhase({ phases, pillar: 'activation', area, preferredIndex: readSportSeed(sport, area, 'activation') })
    addExerciseToPhase({ phases, pillar: 'range', area, preferredIndex: readSportSeed(sport, area, 'range') })
  }

  for (let index = minimumDoseExerciseCount; index < exerciseTarget; index += 1) {
    const pillar = phaseSlots[index % phaseSlots.length]
    const areaCycle = getAreaCycleForPillar({
      targetAreas: chosenAreas,
      pillar,
      reducedTargetAreas,
      releaseBiasAreas,
    })
    const area = areaCycle[index % areaCycle.length]
    addExerciseToPhase({
      phases,
      pillar,
      area,
      preferredIndex: readSportSeed(sport, area, pillar) + Math.floor(index / Math.max(areaCycle.length, 1)),
    })
  }

  let currentMainDuration = phases.reduce((sum, phase) => sum + estimatePhaseDurationMinutes(phase), 0)
  const desiredMainDuration = Math.max(6, targetMainDuration * 0.9)
  let fillIndex = exerciseTarget
  let stalledPasses = 0

  while (currentMainDuration < desiredMainDuration && stalledPasses < phaseSlots.length * Math.max(chosenAreas.length, 1)) {
    const pillar = phaseSlots[fillIndex % phaseSlots.length]
    const areaCycle = getAreaCycleForPillar({
      targetAreas: chosenAreas,
      pillar,
      reducedTargetAreas,
      releaseBiasAreas,
    })
    const area = areaCycle[fillIndex % Math.max(areaCycle.length, 1)]
    const added = addExerciseToPhase({
      phases,
      pillar,
      area,
      preferredIndex: readSportSeed(sport, area, pillar) + Math.floor(fillIndex / Math.max(areaCycle.length, 1)),
    })

    if (added) {
      currentMainDuration = phases.reduce((sum, phase) => sum + estimatePhaseDurationMinutes(phase), 0)
      stalledPasses = 0
    } else if (!canAddAnyExercise(phases, chosenAreas, pillar)) {
      stalledPasses += areaCycle.length
    } else {
      stalledPasses += 1
    }

    fillIndex += 1
  }

  for (const pillar of pillars) {
    const phase = phases.find((item) => item.pillar === pillar)
    if (!phase || phase.exercises.length > 0) continue
    const area = chosenAreas[0]
    const fallbackPick = getCuratedLibrary(area, pillar)[0]
    if (fallbackPick) {
      phase.exercises.push(toRoutineExercise(fallbackPick))
    }
  }

  const filteredPhases = phases.filter((phase) => phase.exercises.length > 0)
  if (prepPhase) {
    filteredPhases.unshift(prepPhase)
  }

  const totalExercises = filteredPhases.reduce((sum, phase) => sum + phase.exercises.length, 0)

  return {
    routineTitle: buildRoutineTitle({ mode, sport, chosenAreas, goal }),
    summary: buildRoutineSummary(goal, chosenAreas, sport, mode),
    difficultyLevel: readiness?.modificationMode === 'recovery' ? 'Beginner' : goal === 'performance' ? 'Intermediate' : 'Beginner',
    totalExercises,
      phases: filteredPhases.map((phase) => applyFallbackPhaseSetRules(phase, { goal, readiness })),
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
    const authenticatedUserId = await validateAuthenticatedUser(req, userId)
    const accessToken = authenticatedUserId ? readAccessToken(req) : ''
    const authenticatedSupabase = authenticatedUserId && accessToken
      ? createAccessTokenClient(accessToken)
      : null

    if (authenticatedUserId) {
      const startOfToday = startOfTodayUtcIso()
      const [{ count: routinesToday, error: routinesError }, { data: profile, error: profileError }, dailyLimit] = await Promise.all([
        supabase
          .from('routines')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authenticatedUserId)
          .gte('created_at', startOfToday),
        supabase
          .from('profiles')
          .select('is_pro')
          .eq('id', authenticatedUserId)
          .maybeSingle<{ is_pro?: boolean | null }>(),
        readBasicDailyRoutineLimit(supabase as never),
      ])

      if (routinesError) {
        throw new Error(routinesError.message)
      }

      if (profileError) {
        throw new Error(profileError.message)
      }

      const isPro = Boolean(profile?.is_pro)
      if (!isPro && (routinesToday || 0) >= dailyLimit) {
        return NextResponse.json({ error: 'DAILY_LIMIT_REACHED' }, { status: 429 })
      }
    }

    const sportProfile = sport ? SPORT_PROFILE_MAP[sport] : null
    const targetAreas = resolveTargetAreas(mode, sport, areas)
    const cloudReadiness = authenticatedUserId ? await readTodayReadinessAdjustmentSnapshot(supabase as never, authenticatedUserId).catch((error) => {
      console.warn('[generate.readiness]', error)
      return null
    }) : null
    const effectiveReadiness = cloudReadiness || readiness
    const readinessModifiers = deriveRoutineReadinessModifiers({
      readiness: effectiveReadiness,
      duration,
      goal,
    })
    const effectiveGoal = readinessModifiers.effectiveGoal
    const sessionDuration = readinessModifiers.adjustedDuration
    const approvedExercisePool = buildApprovedExercisePoolText(targetAreas)
    const sportFocus = sportProfile ? sportProfile.keyDemands.join(', ') : null
    const sportRisks = sportProfile ? sportProfile.mobilityRisks.join('; ') : null
    const areasText = targetAreas.join(', ')

    // Build PREP phase from local library
    let prepPhase: RoutinePhase | null = null
    if (includeFoamRoll) {
      const foamRollExercises = selectFoamRollExercises(targetAreas, sessionDuration)
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
      duration: sessionDuration,
      goal: effectiveGoal,
      prepPhase,
      readiness: effectiveReadiness,
      reducedTargetAreas: readinessModifiers.reducedTargetAreas,
      releaseBiasAreas: readinessModifiers.releaseBiasAreas,
    })

    let anthropic: Anthropic
    try {
      anthropic = createAnthropicClient()
    } catch (error) {
      console.error('[generate.env]', error)
      return NextResponse.json(await maybePersistRoutineForAuthenticatedUser({
        authenticatedUserId,
        authenticatedSupabase,
        routine: fallbackRoutine,
        sport,
        targetAreas,
        sessionDuration,
        effectiveGoal,
      }))
    }

    const aiDuration = estimateTargetMainDurationMinutes(sessionDuration, prepPhase)
    const exerciseCount = buildExerciseTargetFromDuration({
      duration: aiDuration,
      goal: effectiveGoal,
      areaCount: targetAreas.length,
    })

    const prompt = `You are an expert sports physiotherapist and strength and conditioning coach building an evidence-based joint mobility routine.

USER PROFILE:
- Mode: ${mode === 'sport' ? 'Sport relevant' : 'Body area focus'}
${sportProfile ? `- Sport: ${sportProfile.label}` : ''}
${sportFocus ? `- Key Demands: ${sportFocus}` : ''}
${sportRisks ? `- Mobility Risks: ${sportRisks}` : ''}
${sportProfile ? `- Routine Bias: ${sportProfile.routineBias}` : ''}
${sportProfile ? `- Last Reviewed: ${sportProfile.lastReviewed}` : ''}
- Focus Areas: ${areasText}
- Approved Exercise Pool:
${approvedExercisePool}
- Session Duration: ${aiDuration} minutes
- Primary Goal: ${effectiveGoal}
${effectiveReadiness ? `- Readiness Score: ${effectiveReadiness.readinessScore}
- Readiness State: ${effectiveReadiness.readinessLabel}
- Soreness Areas: ${effectiveReadiness.sorenessAreas.join(', ') || 'none'}
- Soreness Severity: ${effectiveReadiness.sorenessSeverity}/10
- Restricted Areas: ${effectiveReadiness.restrictedAreas.join(', ') || 'none'}
- Modification Mode: ${effectiveReadiness.modificationMode}
- Readiness Note: ${effectiveReadiness.sorenessNotes || 'none'}` : ''}
${readinessModifiers.hasTodayCheckin ? `- Readiness Modifiers:
${readinessModifiers.promptGuidance.map((note) => `  - ${note}`).join('\n')}` : ''}

SESSION STRUCTURE - THREE PHASES ONLY:

PRESCRIPTION RULES:
- Isometric and stretch exercises: set holdSeconds to a realistic hold (usually 30-60s) and set reps to null.
- Movement and rep-based exercises: set reps to a realistic count (usually 6-10) and set holdSeconds to null.
- Never set holdSeconds to 2 for a rep-based exercise. Controlled tempo belongs in the movement intent, not in holdSeconds.
- PAILS & RAILS: use holdSeconds (usually 10-20s per contraction) and reps null.
- CARs: use reps (usually 5-8) and holdSeconds null.

SET ASSIGNMENT RULES:
- Do not assign sets uniformly across a whole phase.
- RELEASE: every exercise must be exactly 1 set. Release is for tissue priming, not volume.
- ACTIVATION: assign 2 sets to the 2 most important activation exercises for the sport or area. Assign 1 set to all remaining activation exercises.
- RANGE: for normal training sessions, assign 2 sets to every range exercise. Range is the main loading block and should not feel like a long list of one-off drills.
- RANGE EXCEPTION: for recovery sessions, flexibility/recovery-biased sessions, and pre-game or pre-training prep sessions, you may use more range drills with lighter volume. In those lighter contexts, assign 2 sets to the top 1-2 most important range drills and 1 set to the remaining range drills.
- The doubled activation exercises should be the ones most directly preparing the dominant movement pattern.
- In lighter range blocks, the doubled range drill(s) should be the drill(s) requiring the most sport-relevant or end-range neuromuscular adaptation.

1. RELEASE - Loosen soft tissue surrounding target joints.
   Use: Static stretches, dynamic stretches, PNF, passive holds, joint distractions.
   DO NOT include foam rolling or roller-based exercises.
   RELEASE MUST COVER ALL RELEVANT STRUCTURES AROUND THE TARGET JOINT, not just one easy stretch.
   For hips, release must cover all four quadrants across the phase:
   - anterior: hip flexors, rectus femoris, iliopsoas
   - posterior: glutes, hamstrings, piriformis
   - lateral: TFL, IT band, abductors
   - medial: adductors, groin
   For shoulders, release must cover:
   - anterior: pec minor, anterior capsule, biceps tendon region
   - posterior: posterior capsule, infraspinatus, teres minor
   - superior: upper trapezius, levator scapulae
   - inferior: latissimus dorsi, teres major
   For spine, release must cover:
   - flexion: lumbar and thoracic flexion mobility
   - extension: thoracic extension, lumbar decompression
   - rotation: thoracic rotation, facet mobility
   - lateral flexion: quadratus lumborum, lateral trunk
   Use the approved exercise pool anatomy tags to make sure these structures are genuinely covered across the release block.

2. ACTIVATION - Build neuromuscular control through the released range.
   Use: Isometric holds, eccentric loading, CARs, lift-offs, and controlled active mobility.
   BEFORE WRITING ACTIVATION, decide whether the RANGE phase is dominated by rotational patterns or linear patterns.
   - Rotational patterns include hip 90/90 work, thoracic rotation, shoulder ER/IR end-range work, and other drills where the main adaptation is rotation control.
   - Linear patterns include hip flexion end range, Jefferson-curl-style loading, overhead holds, and other drills where the main adaptation is flexion, extension, or overhead line control.
   If the range phase is rotational, activation must target the structures that drive and control rotation, such as piriformis, deep hip rotators, external rotators, multifidus, and obliques.
   If the range phase is linear, activation must target the primary movers for that line of force, such as hip flexors, glutes, rectus femoris, erectors, and serratus anterior.
   ACTIVATION MUST NEVER BE GENERIC. It must directly prepare the neuromuscular structures that will be loaded in the range phase.
   Use the approved exercise pool movement-pattern tags and anatomy tags to justify the activation choices.

3. RANGE - Integrate strength and flexibility at end range.
   Use: loaded end-range holds, controlled end-range isometrics, active mobility, and simple strength-through-range work.
   This block must include a real strength element. Do not place pure mobility segmentation drills like Cat-Camel in RANGE.

PILLAR WEIGHTING BY GOAL:
- flexibility  -> 50% release, 25% activation, 25% range
- strength     -> 25% release, 50% activation, 25% range
- balanced     -> meaningful release first, then activation and range
- performance  -> 25% release, 25% activation, 50% range

Create ${exerciseCount} total exercises. Cite REAL peer-reviewed studies (JOSPT, BJSM, JSCR, IJSPT).
Prioritize the approved exercise pool before inventing new exercise names. Stay close to that movement language and phase logic.
Use ONLY the exact exercise names from the approved pool. Do not paraphrase, shorten, or rename any exercise.
Release phase must contain ONLY stretching - no foam rolling.
Unless the goal is flexibility, release exercises should default to 1 set each so the session can cover more surrounding structures. Only use 2 sets for release when the goal is flexibility.
Do not use or mention PAILs or RAILs in this standard routine builder.
For balanced and flexibility sessions, release must be substantial rather than token. Cover multiple structures around the joint, not just one stretch per region.
For sport relevant balanced sessions, release should usually contain at least 3 exercises when the session length allows it.
Do not give a balanced session just one pec stretch and one hip stretch and call release covered.
When the approved pool shows anatomy tags, use them deliberately so release covers the full joint surround and activation matches the dominant movement pattern of the range block.
If mode is sport relevant, bias the session toward the top biomechanical demands of that sport instead of spreading attention evenly across every joint. Around 60-70% of the session should support the primary sport demands.
If readiness indicates soreness or restriction:
- avoid aggressive loading and aggressive end-range work for restricted areas
- where possible, shift focus away from sore areas instead of hammering them
- if the only selected focus area is sore, keep the work gentle, recovery-biased, and non-provocative
- if modification mode is recovery, keep the full session restorative and conservative
MINIMUM DOSE RULE: Every targeted area MUST have at least 1 exercise in each phase (release, activation, range) regardless of readiness state or goal weighting. Readiness modifiers reduce volume within phases, never eliminate a phase. A routine missing any phase for a targeted area is clinically inadequate and will be rejected.
Routine names must be athletic, evocative, and professional.
Routine names must be concise, maximum 6 words.
Routine names must use this format: [Focus] — [Context]
Good examples:
- Hip Opening Protocol — Golf Series
- Thoracic Release — Pre-Match
- Shoulder Activation — Overhead Athlete
- Spine Mobility — Recovery Session
- End-Range Strength — BJJ Prep

Respond ONLY in valid JSON (no markdown):
{
  "routineTitle": "[Focus] — [Context]",
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
      const routine = normalizeRoutineExerciseNames(
        normalizeRoutineForGoal(
          JSON.parse(cleaned.slice(jsonStart, jsonEnd + 1)) as GeneratedRoutine,
          { goal: effectiveGoal, readiness: effectiveReadiness },
        ),
        targetAreas,
      )

      if (prepPhase) {
        routine.phases.unshift(prepPhase)
        routine.totalExercises += prepPhase.exercises.length
      }

      if (needsCuratedFallback(routine, effectiveGoal, targetAreas) || isRoutineDurationOutsideWindow(routine, sessionDuration)) {
        console.warn('[generate.ai] AI routine failed guardrails, returning curated fallback routine')
        return NextResponse.json(await maybePersistRoutineForAuthenticatedUser({
          authenticatedUserId,
          authenticatedSupabase,
          routine: fallbackRoutine,
          sport,
          targetAreas,
          sessionDuration,
          effectiveGoal,
        }))
      }

      return NextResponse.json(await maybePersistRoutineForAuthenticatedUser({
        authenticatedUserId,
        authenticatedSupabase,
        routine,
        sport,
        targetAreas,
        sessionDuration,
        effectiveGoal,
      }))
    } catch (error) {
      if (error instanceof Error && error.message === 'Anthropic request timed out') {
        console.warn('[generate.ai] Anthropic timed out, returning fallback routine')
      } else {
        console.error('[generate.ai]', error)
      }
      return NextResponse.json(await maybePersistRoutineForAuthenticatedUser({
        authenticatedUserId,
        authenticatedSupabase,
        routine: fallbackRoutine,
        sport,
        targetAreas,
        sessionDuration,
        effectiveGoal,
      }))
    }

  } catch (err: unknown) {
    console.error('[generate]', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
