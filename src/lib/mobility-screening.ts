import { IconHips, IconShoulders, IconSpine } from '@/components/Icons'

export type MobilityRegion = 'shoulders' | 'hips' | 'spine'

export type MobilityScreeningTest = {
  id: string
  region: MobilityRegion
  name: string
  subtitle: string
  steps: string[]
  options: {
    id: string
    label: string
    value: number
    description: string
  }[]
}

export const mobilityScreeningTests: MobilityScreeningTest[] = [
  {
    id: 'shoulder-back-scratch',
    region: 'shoulders',
    name: 'Back scratch test',
    subtitle: 'Tests full shoulder range - abduction, rotation, and reach',
    steps: [
      'Reach one hand over your shoulder and down your back.',
      'Reach the other hand up your back from below.',
      'Try to touch or overlap your fingertips. Swap arms and repeat.',
    ],
    options: [
      { id: 'easy', label: 'Easy / Fingertips Overlap', value: 4, description: 'Both sides touch or overlap easily with no pain.' },
      { id: 'good', label: 'Small Gap', value: 3, description: 'Close on both sides, with only a small gap or mild stiffness.' },
      { id: 'fair', label: 'Moderate Gap', value: 2, description: 'One or both sides are clearly limited, but you can still reach behind.' },
      { id: 'hard', label: 'Very Hard', value: 1, description: 'Large gap, strong asymmetry, or very restricted reach.' },
      { id: 'pain', label: 'Pain / Cannot Do', value: 0, description: 'Pain stops the movement or you cannot get into position.' },
    ],
  },
  {
    id: 'shoulder-wall-angel',
    region: 'shoulders',
    name: 'Wall angel',
    subtitle: 'Tests shoulder mobility and scapular control',
    steps: [
      'Stand with back flat against a wall, feet a small step out.',
      "Press your lower back, upper back, and head into the wall. Arms in a 'W' shape, also touching the wall.",
      "Slide arms up the wall to a 'Y' shape and back down. Do 5 slow reps.",
    ],
    options: [
      { id: 'easy', label: 'Easy / Full Wall Contact', value: 4, description: 'Arms stay on the wall and your lower back stays flat the whole way.' },
      { id: 'good', label: 'Slight Lift-Off', value: 3, description: 'Mostly good, with only a small loss of wall contact or tiny arch.' },
      { id: 'fair', label: 'Moderate Compensation', value: 2, description: 'Arms peel away or your lower back starts to arch during the reps.' },
      { id: 'hard', label: 'Very Hard', value: 1, description: 'You cannot get overhead cleanly without obvious arching or losing contact.' },
      { id: 'pain', label: 'Pain / Cannot Do', value: 0, description: 'Painful, blocked, or not achievable against the wall.' },
    ],
  },
  {
    id: 'hip-single-leg-squat',
    region: 'hips',
    name: 'Single leg balance squat',
    subtitle: 'Tests hip strength, stability, and control',
    steps: [
      'Stand on one leg, lift the other foot slightly off the floor.',
      'Slowly bend the standing knee to about a quarter squat and hold 2 seconds.',
      'Return to standing. Do 5 slow reps each side.',
    ],
    options: [
      { id: 'easy', label: 'Easy / Stable Control', value: 4, description: 'Pelvis stays level, knee tracks cleanly, and balance stays solid.' },
      { id: 'good', label: 'Slight Wobble', value: 3, description: 'A little shake, but you keep control and the knee stays mostly aligned.' },
      { id: 'fair', label: 'Moderate Collapse', value: 2, description: 'The knee caves in a bit, the hip drops, or the trunk leans noticeably.' },
      { id: 'hard', label: 'Very Hard', value: 1, description: 'Strong loss of balance, clear knee cave, or repeated compensations.' },
      { id: 'pain', label: 'Pain / Cannot Do', value: 0, description: 'Painful, unstable, or you need support to complete it.' },
    ],
  },
  {
    id: 'hip-seated-rotation',
    region: 'hips',
    name: 'Seated hip rotation',
    subtitle: 'Tests hip joint mobility - often the first sign of hip trouble',
    steps: [
      'Sit on a chair, feet flat, knees at 90 degrees.',
      'Internal rotation: keep the knee still and swing your foot outward. How far does it go?',
      'External rotation: swing your foot inward. Compare both legs - should feel equal and smooth.',
    ],
    options: [
      { id: 'easy', label: 'Easy / Smooth Both Ways', value: 4, description: 'Both hips rotate smoothly and feel similar with no pinching.' },
      { id: 'good', label: 'Slight Difference', value: 3, description: 'A small side-to-side difference, but still mostly smooth and comfortable.' },
      { id: 'fair', label: 'Moderate Restriction', value: 2, description: 'One hip clearly rotates less or feels notably stiffer.' },
      { id: 'hard', label: 'Very Hard', value: 1, description: 'Rotation is very limited, blocked, or hard to control.' },
      { id: 'pain', label: 'Pain / Cannot Do', value: 0, description: 'Pinching, catching, groin pain, or you cannot complete the test.' },
    ],
  },
  {
    id: 'spine-seated-rotation',
    region: 'spine',
    name: 'Quadruped T rotation',
    subtitle: 'Tests thoracic spine rotation and upper-back control',
    steps: [
      'Start on all fours with one hand lightly behind your head.',
      'Rotate your chest open, bringing the elbow toward the ceiling without shifting your hips.',
      'Return under control and repeat on both sides. Compare how far and how smoothly you rotate.',
    ],
    options: [
      { id: 'easy', label: 'Easy / Smooth Rotation', value: 4, description: 'You rotate well on both sides and the hips stay quiet.' },
      { id: 'good', label: 'Slight Stiffness', value: 3, description: 'Mostly smooth, with a mild difference side to side.' },
      { id: 'fair', label: 'Moderate Restriction', value: 2, description: 'One side is clearly stiffer or you have to shift to get the rotation.' },
      { id: 'hard', label: 'Very Hard', value: 1, description: 'Very little upper-back rotation or strong compensation through the hips.' },
      { id: 'pain', label: 'Pain / Cannot Do', value: 0, description: 'Painful, blocked, or not achievable today.' },
    ],
  },
  {
    id: 'spine-toe-touch',
    region: 'spine',
    name: 'Toe touch',
    subtitle: 'Tests lumbar mobility and posterior chain length',
    steps: [
      'Stand tall, feet hip-width, knees straight.',
      'Slowly bend forward, reaching your fingertips toward the floor. No bouncing.',
      'Note how close your fingers get to the floor - and whether your spine bends evenly or hitches to one side.',
    ],
    options: [
      { id: 'easy', label: 'Easy / Floor or Near Floor', value: 4, description: 'Fingertips reach the floor or close, and the movement looks even.' },
      { id: 'good', label: 'Slight Restriction', value: 3, description: 'You get close, with only a small gap or mild stiffness.' },
      { id: 'fair', label: 'Moderate Restriction', value: 2, description: 'A noticeable gap to the floor or some uneven rounding appears.' },
      { id: 'hard', label: 'Very Hard', value: 1, description: 'Large gap, strong pull, or the torso shifts to one side.' },
      { id: 'pain', label: 'Pain / Cannot Do', value: 0, description: 'Sharp pain, blocked movement, or you cannot bend forward comfortably.' },
    ],
  },
]

export const MOBILITY_REGION_ORDER: MobilityRegion[] = ['shoulders', 'hips', 'spine']

export const MOBILITY_REGION_META = {
  shoulders: { label: 'Shoulders', color: '#00b4d8', Icon: IconShoulders },
  hips: { label: 'Hips', color: '#d8e4ea', Icon: IconHips },
  spine: { label: 'Spine', color: '#7ecfe0', Icon: IconSpine },
} as const

const SCREENING_MAX_SCORE = 4

export function calculateMobilityScreeningScores(answers: Record<string, number>) {
  const byRegion = Object.fromEntries(
    MOBILITY_REGION_ORDER.map((region) => {
      const tests = mobilityScreeningTests.filter((test) => test.region === region)
      const raw = tests.reduce((sum, test) => sum + (answers[test.id] ?? 0), 0)
      const max = tests.length * SCREENING_MAX_SCORE
      const pct = max === 0 ? 0 : Math.round((raw / max) * 100)
      return [region, { raw, max, pct }]
    }),
  ) as Record<MobilityRegion, { raw: number; max: number; pct: number }>

  const overallRaw = MOBILITY_REGION_ORDER.reduce((sum, region) => sum + byRegion[region].raw, 0)
  const overallMax = MOBILITY_REGION_ORDER.reduce((sum, region) => sum + byRegion[region].max, 0)

  return {
    shoulders: byRegion.shoulders,
    hips: byRegion.hips,
    spine: byRegion.spine,
    overall: {
      raw: overallRaw,
      max: overallMax,
      pct: overallMax === 0 ? 0 : Math.round((overallRaw / overallMax) * 100),
    },
  }
}

export function getMobilityScreeningAdvice(scores: ReturnType<typeof calculateMobilityScreeningScores>) {
  const ranked = MOBILITY_REGION_ORDER
    .map((region) => ({ region, score: scores[region].pct }))
    .sort((a, b) => a.score - b.score)

  const weakest = ranked[0]
  const strongest = ranked[ranked.length - 1]

  const focusCopy: Record<MobilityRegion, { title: string; summary: string; next: string }> = {
    shoulders: {
      title: 'Shoulders are your priority area',
      summary: 'Your shoulder tests showed the most restriction. Overhead position, rotation, or scapular control likely need the most attention right now.',
      next: 'Bias your next routines toward shoulder mobility, upper-back control, and cleaner overhead mechanics.',
    },
    hips: {
      title: 'Hips are your priority area',
      summary: 'Your hip tests showed the biggest limitation. Rotation, single-leg control, or lower-body stability are likely the main bottlenecks.',
      next: 'Bias your next routines toward hip rotation, single-leg control, and stronger movement through the hips.',
    },
    spine: {
      title: 'Spine is your priority area',
      summary: 'Your spine tests showed the most restriction. Thoracic rotation or posterior-chain flexibility likely need the most work right now.',
      next: 'Bias your next routines toward thoracic rotation, spinal movement quality, and posterior-chain range.',
    },
  }

  const overall =
    scores.overall.pct >= 80
      ? 'Strong overall mobility baseline. Keep training balanced and reassess after your next block.'
      : scores.overall.pct >= 60
        ? 'Solid baseline with a few restrictions worth cleaning up. Keep sessions targeted rather than trying to fix everything at once.'
        : scores.overall.pct >= 40
          ? 'There are some meaningful restrictions here. Your next phase should stay simple and focused on the lowest-scoring region first.'
          : 'Your screening shows clear mobility restrictions. Keep the next routines conservative, consistent, and focused on control before intensity.'

  return {
    overall,
    weakestRegion: weakest.region,
    strongestRegion: strongest.region,
    weakestTitle: focusCopy[weakest.region].title,
    weakestSummary: focusCopy[weakest.region].summary,
    nextStep: focusCopy[weakest.region].next,
  }
}
