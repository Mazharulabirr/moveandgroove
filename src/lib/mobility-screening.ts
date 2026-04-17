import { IconHips, IconShoulders, IconSpine } from '@/components/Icons'

export type MobilityRegion = 'shoulders' | 'hips' | 'spine'

export type MobilityScreeningTest = {
  id: string
  region: MobilityRegion
  name: string
  subtitle: string
  steps: string[]
  pass: string
  flag: string
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
    pass: 'Fingertips touch or nearly touch on both sides with no pain.',
    flag: 'One side is significantly harder, or pain stops the movement.',
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
    pass: 'Arms stay in contact with the wall the whole way, no arching of the lower back.',
    flag: 'Arms peel off the wall, or lower back has to arch to get arms up.',
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
    pass: 'Pelvis stays level, knee tracks over your 2nd toe, trunk stays upright.',
    flag: 'Knee collapses inward, hip drops on one side, or you need to grab something to balance.',
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
    pass: 'Both directions feel similar on both sides, no pinching or groin pain.',
    flag: 'One hip rotates noticeably less, or you feel pinching or catching in the groin.',
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
    pass: 'Rotation is smooth on both sides, chest opens clearly, and hips stay steady.',
    flag: 'One side is clearly stiffer, you cannot open through the upper back, or pain appears.',
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
    pass: 'Fingertips reach the floor or close, spine rounds evenly, no sharp pain.',
    flag: 'A significant gap to the floor, sharp pain, or your torso shifts sideways as you go down.',
  },
]

export const MOBILITY_REGION_ORDER: MobilityRegion[] = ['shoulders', 'hips', 'spine']

export const MOBILITY_REGION_META = {
  shoulders: { label: 'Shoulders', color: '#00b4d8', Icon: IconShoulders },
  hips: { label: 'Hips', color: '#d8e4ea', Icon: IconHips },
  spine: { label: 'Spine', color: '#7ecfe0', Icon: IconSpine },
} as const

export const SCREENING_RESULT_OPTIONS = [
  { id: 'pass', label: 'Pass', value: 1, description: 'Move looks clean and comfortable.' },
  { id: 'flag', label: 'Flag', value: 0.5, description: 'Concern noted, asymmetry, or compensation present.' },
  { id: 'skip', label: 'Skip', value: 0, description: "Didn't attempt this test today." },
] as const

export function calculateMobilityScreeningScores(answers: Record<string, number>) {
  const byRegion = Object.fromEntries(
    MOBILITY_REGION_ORDER.map((region) => {
      const tests = mobilityScreeningTests.filter((test) => test.region === region)
      const raw = tests.reduce((sum, test) => sum + (answers[test.id] ?? 0), 0)
      const max = tests.length
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
