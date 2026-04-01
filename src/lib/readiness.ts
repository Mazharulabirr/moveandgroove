import type { IconName } from '@/components/Icons'

export type ReadinessQuestion = {
  id: string
  text: string
  sub: string
  icon: IconName
  options: { value: number; label: string }[]
}

export const READINESS_QUESTIONS: ReadinessQuestion[] = [
  {
    id: 'sleep',
    text: 'HOW DID YOU SLEEP?',
    sub: 'Sleep quality directly affects tissue recovery and mobility.',
    icon: 'sleep',
    options: [
      { value: 4, label: 'Excellent - 8+ hours, feel great' },
      { value: 3, label: 'Good - 7 hours, mostly rested' },
      { value: 2, label: 'Fair - 5-6 hours, a bit tired' },
      { value: 1, label: 'Poor - under 5 hours, exhausted' },
    ],
  },
  {
    id: 'soreness',
    text: 'ANY MUSCLE SORENESS?',
    sub: 'Helps us adjust intensity and target areas needing recovery.',
    icon: 'soreness',
    options: [
      { value: 4, label: 'None - feeling fresh' },
      { value: 3, label: 'Mild - slight tightness' },
      { value: 2, label: 'Moderate - noticeably sore' },
      { value: 1, label: 'High - very sore or stiff' },
    ],
  },
  {
    id: 'energy',
    text: 'ENERGY LEVEL TODAY?',
    sub: 'Your energy level shapes the volume and intensity we recommend.',
    icon: 'energy',
    options: [
      { value: 4, label: 'High - ready to push hard' },
      { value: 3, label: 'Good - feeling solid' },
      { value: 2, label: 'Low - going through the motions' },
      { value: 1, label: 'Very low - consider rest today' },
    ],
  },
  {
    id: 'stress',
    text: 'STRESS LEVELS?',
    sub: 'High stress elevates cortisol and reduces recovery capacity.',
    icon: 'stress',
    options: [
      { value: 4, label: 'Low - calm and focused' },
      { value: 3, label: 'Mild - manageable' },
      { value: 2, label: 'Moderate - quite stressed' },
      { value: 1, label: 'High - very stressed' },
    ],
  },
  {
    id: 'motivation',
    text: 'MOTIVATION TO TRAIN?',
    sub: 'Honest answers help us recommend the right session type.',
    icon: 'motivation',
    options: [
      { value: 4, label: 'High - keen to get after it' },
      { value: 3, label: 'Good - ready to go' },
      { value: 2, label: 'Low - need a push' },
      { value: 1, label: 'Very low - not feeling it at all' },
    ],
  },
]

export function readinessScore(answers: Record<string, number>) {
  const total = Object.values(answers).reduce((sum, value) => sum + value, 0)
  const max = READINESS_QUESTIONS.length * 4
  return Math.round((total / max) * 100)
}

export function readinessLabel(score: number): { label: string; color: string; recommendation: string } {
  if (score >= 80) {
    return {
      label: 'READY TO PERFORM',
      color: '#00b4d8',
      recommendation: 'Your body is primed. Push intensity today and use the full session window.',
    }
  }
  if (score >= 60) {
    return {
      label: 'GOOD TO GO',
      color: '#4ac8e8',
      recommendation: 'You are ready for a solid session. Stick to the plan and stay aware of how your body responds.',
    }
  }
  if (score >= 40) {
    return {
      label: 'MODIFIED SESSION',
      color: '#e8a94a',
      recommendation: 'Consider a lighter session today with more prep, release work, and controlled range.',
    }
  }
  return {
    label: 'REST OR RECOVER',
    color: '#e74c3c',
    recommendation: 'Your body is asking for recovery. A gentle release session may serve you better than a hard training day.',
  }
}
