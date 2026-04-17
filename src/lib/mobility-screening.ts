import { IconHips, IconShoulders, IconSpine } from '@/components/Icons'

export type MobilityRegion = 'shoulders' | 'hips' | 'spine'

export type MobilityScreeningTest = {
  id: string
  region: MobilityRegion
  name: string
  subtitle: string
  steps: string[]
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
  },
]

export const MOBILITY_REGION_ORDER: MobilityRegion[] = ['shoulders', 'hips', 'spine']

export const MOBILITY_REGION_META = {
  shoulders: { label: 'Shoulders', color: '#00b4d8', Icon: IconShoulders },
  hips: { label: 'Hips', color: '#d8e4ea', Icon: IconHips },
  spine: { label: 'Spine', color: '#7ecfe0', Icon: IconSpine },
} as const

export const SCREENING_RESULT_OPTIONS = [
  { id: 'easy', label: 'Easy / Full Range', value: 4, description: 'Moves cleanly, evenly, and without discomfort.' },
  { id: 'good', label: 'Slight Restriction', value: 3, description: 'Mostly good, with a small limitation or asymmetry.' },
  { id: 'fair', label: 'Moderate Restriction', value: 2, description: 'Noticeably stiff or harder to control.' },
  { id: 'hard', label: 'Very Hard', value: 1, description: 'Very limited, unstable, or difficult to complete well.' },
  { id: 'pain', label: 'Pain / Cannot Do', value: 0, description: 'Painful, blocked, or not achievable today.' },
] as const

const SCREENING_MAX_SCORE = SCREENING_RESULT_OPTIONS[0].value

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
