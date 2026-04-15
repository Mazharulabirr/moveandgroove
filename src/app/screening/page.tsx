'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { IconCheckin, IconGeneral, IconHips, IconShoulders, IconSpine } from '@/components/Icons'
import { createClient } from '@/lib/supabase/client'
import { getIsPro } from '@/lib/profiles'
import { readStoredScreening, writeStoredScreening } from '@/lib/screening-storage'

type Option = { id: string; label: string; value: number }
type Region = 'hips' | 'shoulders' | 'spine' | 'general'
type Question = {
  id: string
  region: Region
  regionLabel: string
  RegionIcon: typeof IconHips
  text: string
  sub: string
  instruction: string
  photo: string | null
  ytSearch: string | null
  options: Option[]
}
type Scores = Record<string, { raw: number; max: number; pct: number }>
type LatestScreening = {
  assessed_at?: string | null
  created_at?: string | null
  completed_at?: string | null
  responses?: Record<string, number> | null
} | null

const UC = 'uppercase' as const
const CA = 'center' as const

const QUESTIONS: Question[] = [
  {
    id: 'activity_level',
    region: 'general',
    regionLabel: 'GENERAL',
    RegionIcon: IconGeneral,
    text: 'HOW ACTIVE ARE YOU?',
    sub: 'Helps us calibrate intensity and volume.',
    instruction: 'Think about a typical week - training, gym, sport, or walking.',
    photo: null,
    ytSearch: null,
    options: [
      { id: 'sedentary', label: 'Sedentary - mostly sitting', value: 1 },
      { id: 'light', label: 'Light - casual walks or gym', value: 2 },
      { id: 'moderate', label: 'Moderate - 3 to 4 times a week', value: 3 },
      { id: 'very', label: 'Very active - daily training', value: 4 },
    ],
  },
  {
    id: 'pain_presence',
    region: 'general',
    regionLabel: 'GENERAL',
    RegionIcon: IconGeneral,
    text: 'ANY CURRENT PAIN?',
    sub: 'Flags areas that need modified loading or extra care.',
    instruction: 'Think about the last 2 weeks - any aches or injuries anywhere.',
    photo: null,
    ytSearch: null,
    options: [
      { id: 'none', label: 'No pain at all', value: 0 },
      { id: 'mild', label: 'Mild - barely noticeable', value: 1 },
      { id: 'moderate', label: 'Moderate - notice it daily', value: 2 },
      { id: 'severe', label: 'Severe - limits movement', value: 3 },
    ],
  },
  {
    id: 'hip_flexion',
    region: 'hips',
    regionLabel: 'HIPS',
    RegionIcon: IconHips,
    text: 'KNEE TO CHEST - HOW FAR?',
    sub: 'Tests hip flexion - how well your hip folds toward your body.',
    instruction: 'Lie flat on your back. Pull one knee toward your chest with both hands. Keep your lower back pressed flat and do not let the other leg lift.',
    photo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=700&q=80&fit=crop',
    ytSearch: 'knee+to+chest+hip+flexion+mobility+self+test',
    options: [
      { id: 'full', label: 'Knee touches my chest', value: 3 },
      { id: 'good', label: 'Close - a few cm away', value: 2 },
      { id: 'limited', label: 'Noticeable pull - stops short', value: 1 },
      { id: 'very', label: 'Very stiff - barely moves', value: 0 },
    ],
  },
  {
    id: 'hip_rotation',
    region: 'hips',
    regionLabel: 'HIPS',
    RegionIcon: IconHips,
    text: 'HIP ROTATION - BOTH WAYS?',
    sub: 'Tests how freely your hip rotates - critical for sport.',
    instruction: 'Sit on a chair edge with feet hanging. Rotate one foot inward then outward. Thigh stays still and only the lower leg moves.',
    photo: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=700&q=80&fit=crop',
    ytSearch: 'hip+internal+external+rotation+mobility+self+test+seated',
    options: [
      { id: 'full', label: 'Full equal range both ways', value: 3 },
      { id: 'slight', label: 'Slight restriction one side', value: 2 },
      { id: 'moderate', label: 'Restricted both directions', value: 1 },
      { id: 'pain', label: 'Painful or very limited', value: 0 },
    ],
  },
  {
    id: 'hip_stiffness',
    region: 'hips',
    regionLabel: 'HIPS',
    RegionIcon: IconHips,
    text: 'MORNING HIP STIFFNESS?',
    sub: 'Prolonged stiffness is a key indicator of joint restriction.',
    instruction: 'When you first get out of bed, how do your hips feel and how long until they loosen off?',
    photo: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=700&q=80&fit=crop',
    ytSearch: 'morning+hip+stiffness+mobility+assessment',
    options: [
      { id: 'none', label: 'No stiffness at all', value: 3 },
      { id: 'brief', label: 'Clears within 5 minutes', value: 2 },
      { id: 'prolonged', label: 'Stiff for 30+ minutes', value: 1 },
      { id: 'all_day', label: 'Persists most of the day', value: 0 },
    ],
  },
  {
    id: 'shoulder_overhead',
    region: 'shoulders',
    regionLabel: 'SHOULDERS',
    RegionIcon: IconShoulders,
    text: 'ARMS OVERHEAD - FULLY VERTICAL?',
    sub: 'Tests shoulder flexion and upper back mobility.',
    instruction: 'Stand back flat against a wall. Raise both arms overhead with thumbs aiming to touch the wall while keeping the lower back flat.',
    photo: 'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?w=700&q=80&fit=crop',
    ytSearch: 'shoulder+overhead+mobility+wall+test+assessment',
    options: [
      { id: 'full', label: 'Both arms vertical, back flat', value: 3 },
      { id: 'good', label: 'Almost - back stays mostly flat', value: 2 },
      { id: 'limited', label: 'Stops before vertical', value: 1 },
      { id: 'pain', label: 'Painful or very restricted', value: 0 },
    ],
  },
  {
    id: 'shoulder_rotation',
    region: 'shoulders',
    regionLabel: 'SHOULDERS',
    RegionIcon: IconShoulders,
    text: 'SCRATCH TEST - REACH BOTH WAYS?',
    sub: 'Tests internal and external shoulder rotation.',
    instruction: 'One hand reaches up your back from below and the other comes down from above. Try to touch fingers and compare both sides.',
    photo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=700&q=80&fit=crop',
    ytSearch: 'apley+scratch+test+shoulder+rotation+mobility',
    options: [
      { id: 'full', label: 'Fingers overlap both sides', value: 3 },
      { id: 'slight', label: 'Almost touch - small gap', value: 2 },
      { id: 'moderate', label: 'Large gap one or both sides', value: 1 },
      { id: 'severe', label: 'Very restricted or painful', value: 0 },
    ],
  },
  {
    id: 'shoulder_stability',
    region: 'shoulders',
    regionLabel: 'SHOULDERS',
    RegionIcon: IconShoulders,
    text: 'SHOULDERS STABLE WHEN PUSHING?',
    sub: 'Reflects rotator cuff strength and joint integrity.',
    instruction: 'Think about push-ups, overhead press, or pushing a door. Do your shoulders feel solid, or do they shift, click, or feel like they might give way?',
    photo: 'https://images.unsplash.com/photo-1616803689943-5601631c7fec?w=700&q=80&fit=crop',
    ytSearch: 'shoulder+stability+rotator+cuff+self+assessment',
    options: [
      { id: 'stable', label: 'Fully stable and in control', value: 3 },
      { id: 'mostly', label: 'Mostly - minor clicking', value: 2 },
      { id: 'unstable', label: 'Sometimes shifts or grinds', value: 1 },
      { id: 'very', label: 'Unstable, painful, gives way', value: 0 },
    ],
  },
  {
    id: 'thoracic_rotation',
    region: 'spine',
    regionLabel: 'SPINE',
    RegionIcon: IconSpine,
    text: 'SEATED ROTATION - HOW FAR?',
    sub: 'Tests thoracic rotation - often restricted in athletes.',
    instruction: 'Sit upright with feet flat and arms crossed over chest. Rotate upper body left then right while hips and legs stay still.',
    photo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80&fit=crop',
    ytSearch: 'thoracic+spine+rotation+mobility+seated+test',
    options: [
      { id: 'full', label: 'Equal rotation both ways', value: 3 },
      { id: 'good', label: 'Good - slightly more one side', value: 2 },
      { id: 'limited', label: 'Noticeably restricted', value: 1 },
      { id: 'pain', label: 'Painful to rotate', value: 0 },
    ],
  },
  {
    id: 'lumbar_flexion',
    region: 'spine',
    regionLabel: 'SPINE',
    RegionIcon: IconSpine,
    text: 'TOE TOUCH - HOW FAR?',
    sub: 'Screens lower back and hamstring flexibility.',
    instruction: 'Stand with feet together and legs straight. Bend forward slowly without bouncing and note where your fingertips reach.',
    photo: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=700&q=80&fit=crop',
    ytSearch: 'toe+touch+test+lumbar+flexibility+assessment',
    options: [
      { id: 'floor', label: 'Palms flat on the floor', value: 3 },
      { id: 'toes', label: 'Fingertips reach toes', value: 2 },
      { id: 'shin', label: 'Mid-shin or above', value: 1 },
      { id: 'knee', label: 'Knees or higher', value: 0 },
    ],
  },
  {
    id: 'spine_pain',
    region: 'spine',
    regionLabel: 'SPINE',
    RegionIcon: IconSpine,
    text: 'BACK OR NECK PAIN - HOW OFTEN?',
    sub: 'Baseline to track improvement over time.',
    instruction: 'Over the last 4 weeks, how often did you feel pain or aching anywhere in your back or neck?',
    photo: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=700&q=80&fit=crop',
    ytSearch: null,
    options: [
      { id: 'never', label: 'Never', value: 3 },
      { id: 'rarely', label: 'Rarely - once a month', value: 2 },
      { id: 'sometimes', label: 'Sometimes - weekly', value: 1 },
      { id: 'daily', label: 'Daily or almost every day', value: 0 },
    ],
  },
]

const TOTAL = QUESTIONS.length

function calcScores(answers: Record<string, number>): Scores {
  const regions: Array<'hips' | 'shoulders' | 'spine'> = ['hips', 'shoulders', 'spine']
  const scores: Scores = {}

  for (const region of regions) {
    const regionQuestions = QUESTIONS.filter((question) => question.region === region)
    const max = regionQuestions.length * 3
    const raw = regionQuestions.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0)
    scores[region] = { raw, max, pct: Math.round((raw / max) * 100) }
  }

  const all = QUESTIONS.filter((question) => question.region !== 'general')
  const totalMax = all.length * 3
  const totalRaw = all.reduce((sum, question) => sum + (answers[question.id] ?? 0), 0)
  scores.overall = { raw: totalRaw, max: totalMax, pct: Math.round((totalRaw / totalMax) * 100) }
  return scores
}

function scoreLabel(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: 'EXCELLENT', color: '#00b4d8' }
  if (pct >= 60) return { label: 'GOOD', color: '#4ac8e8' }
  if (pct >= 40) return { label: 'FAIR', color: '#e8a94a' }
  return { label: 'NEEDS WORK', color: '#e74c3c' }
}

const REGION_COLORS: Record<Region, string> = {
  hips: '#00b4d8',
  shoulders: '#4ac8e8',
  spine: '#7ecfe0',
  general: '#8e9aa8',
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function addDays(dateStr: string | null, days: number) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date
}

function getScreeningDate(entry: LatestScreening) {
  return entry?.completed_at || entry?.assessed_at || entry?.created_at || null
}

export default function ScreeningPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [scores, setScores] = useState<Scores | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [latestScreening, setLatestScreening] = useState<LatestScreening>(null)
  const [eligibilityChecked, setEligibilityChecked] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveConfirmed, setSaveConfirmed] = useState(false)

  const question = QUESTIONS[step - 1]
  const progress = step === 0 ? 0 : Math.round((step / TOTAL) * 100)
  const regionColor = question ? REGION_COLORS[question.region] : 'var(--cyan)'
  const isGeneral = question && question.photo === null
  const latestScreeningDate = getScreeningDate(latestScreening)
  const screeningEligibilityDate = addDays(latestScreeningDate, 30)
  const screeningLocked = screeningEligibilityDate !== null && screeningEligibilityDate > new Date()
  const nextEligibleDate = screeningEligibilityDate

  useEffect(() => {
    async function loadEligibility() {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id

      if (!uid) {
        setEligibilityChecked(true)
        return
      }

      const [{ data: latest }, pro] = await Promise.all([
        supabase.from('screening_questionnaires').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        getIsPro(supabase as never, uid),
      ])

      const localSnapshot = readStoredScreening()
      setLatestScreening(latest || (localSnapshot ? {
        created_at: localSnapshot.created_at,
        completed_at: null,
        assessed_at: null,
        responses: localSnapshot.answers || null,
      } : null))
      setIsPro(pro)
      setEligibilityChecked(true)
    }

    void loadEligibility()
  }, [supabase])

  function pick(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function next() {
    if (step < TOTAL) {
      setStep((current) => current + 1)
      return
    }
    void finish()
  }

  function back() {
    if (step === 0) {
      router.push('/dashboard')
      return
    }
    setStep((current) => current - 1)
  }

  async function finish() {
    setSaving(true)
    setSaveError('')
    setSaveConfirmed(false)
    const nextScores = calcScores(answers)
    setScores(nextScores)
    const savedAt = new Date().toISOString()

    writeStoredScreening({
      overall_score: nextScores.overall.pct,
      hip_score: nextScores.hips.pct,
      shoulder_score: nextScores.shoulders.pct,
      spine_score: nextScores.spine.pct,
      answers,
      created_at: savedAt,
    })
    setSaveConfirmed(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) {
        console.warn('[screening] cloud save skipped until live screening schema is aligned')
      }
      setDone(true)
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Could not save your screening yet. Please try again.'

      console.error('[screening]', { error, message })
      setSaveError(message)
    }

    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
        <div className="mg-assessment-shell">
          {step === 0 && eligibilityChecked && screeningLocked && latestScreening && nextEligibleDate && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Mobility Screening</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(40px, 10vw, 72px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 28 }}>
                SCREENING
                <br />
                ALREADY SAVED
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4.5vw, 24px)', lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 42, maxWidth: 760 }}>
                Your most recent mobility screening was saved on {formatDate(latestScreeningDate!)}. To keep the profile meaningful, you can retake it once every 30 days.
              </p>
              <div style={{ border: '1px solid rgba(0,180,216,0.16)', background: 'rgba(8,10,14,0.94)', padding: '28px 32px', marginBottom: 42, maxWidth: 720 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 12, textTransform: UC }}>Next available</div>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 3, color: 'var(--white)' }}>{formatDate(nextEligibleDate!.toISOString())}</div>
              </div>
              <div className="mg-assessment-action-row">
                <button className="btn-primary" onClick={() => router.push('/results')}>VIEW MY SCORES</button>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>DASHBOARD</button>
              </div>
            </div>
          )}

          {step === 0 && eligibilityChecked && !screeningLocked && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Mobility Screening</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(42px, 11vw, 80px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 28 }}>
                UNDERSTAND
                <br />
                YOUR BODY
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4.5vw, 24px)', lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 32, maxWidth: 760 }}>
                11 questions across hips, shoulders, and spine. This is the first step for every member because it creates the baseline score that drives what comes next.
              </p>
              {latestScreening && nextEligibleDate && (
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, lineHeight: 1.75, color: 'var(--silver3)', marginBottom: 44, maxWidth: 760 }}>
                  Your last screening was on {formatDate(latestScreeningDate!)}. Since the 30-day window has passed, you can update your profile again now.
                </p>
              )}
              <div className="mg-assessment-grid-3" style={{ marginBottom: 64 }}>
                {[
                  { Icon: IconHips, label: 'Hips', color: REGION_COLORS.hips },
                  { Icon: IconShoulders, label: 'Shoulders', color: REGION_COLORS.shoulders },
                  { Icon: IconSpine, label: 'Spine', color: REGION_COLORS.spine },
                ].map((region) => (
                  <div key={region.label} style={{ background: 'var(--black2)', padding: '60px 24px', textAlign: CA }}>
                    <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><region.Icon size={56} color={region.color} /></span>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 3, color: region.color, marginBottom: 12 }}>{region.label}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 2, color: 'var(--silver3)' }}>3 questions</p>
                  </div>
                ))}
              </div>
              <div className="mg-assessment-action-row">
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>BACK</button>
                {latestScreening && <button className="btn-outline" onClick={() => router.push('/results')}>PREVIOUS SCORES</button>}
                <button className="btn-primary" onClick={() => setStep(1)}>{latestScreening ? 'UPDATE SCREENING' : 'BEGIN SCREENING'}</button>
              </div>
            </div>
          )}

          {step > 0 && !done && question && (
            <div key={step} style={{ animation: 'fadeUp 0.35s ease forwards' }}>
              <div style={{ width: '100%', height: 3, background: 'var(--border)', marginBottom: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,var(--silver3),${regionColor})`, transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 44, textTransform: UC }}>Question {step} of {TOTAL}</p>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, background: `${regionColor}20`, border: `1px solid ${regionColor}50`, padding: '18px 24px', marginBottom: 44, maxWidth: '100%' }}>
                <question.RegionIcon size={38} color={regionColor} />
                <span style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(16px, 4vw, 22px)', fontWeight: 700, letterSpacing: 3, color: regionColor, textTransform: UC }}>{question.regionLabel}</span>
              </div>

              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(30px, 8vw, 64px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.1, marginBottom: 20 }}>{question.text}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4.5vw, 24px)', color: 'var(--silver2)', marginBottom: 44, lineHeight: 1.6 }}>{question.sub}</p>

              {isGeneral && (
                <div style={{ marginBottom: 48 }}>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(16px, 4vw, 20px)', color: 'var(--silver)', marginBottom: 32, lineHeight: 1.7, maxWidth: 700, padding: '24px 28px', background: 'var(--black2)', border: '1px solid var(--border)' }}>{question.instruction}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {question.options.map((option, index) => {
                      const selected = answers[question.id] === option.value
                      return (
                        <div
                          key={option.id}
                          onClick={() => pick(question.id, option.value)}
                          style={{ background: selected ? 'var(--black3)' : 'var(--black2)', padding: '32px 24px', cursor: 'pointer', transition: 'background 0.2s', borderLeft: selected ? `6px solid ${regionColor}` : '6px solid transparent' }}
                          className="mg-assessment-option-row"
                        >
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, letterSpacing: 2, color: selected ? regionColor : 'var(--silver4)', minWidth: 32, flexShrink: 0 }}>{index + 1}</span>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4.6vw, 26px)', fontWeight: selected ? 600 : 400, color: selected ? 'var(--white)' : 'var(--silver)', lineHeight: 1.4 }}>{option.label}</span>
                          {selected && (
                            <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex' }}>
                              <IconCheckin size={26} color={regionColor} />
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {!isGeneral && (
                <div className="mg-assessment-test-grid">
                  <div style={{ background: 'var(--black2)', padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 28 }}>
                    <div>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: regionColor, marginBottom: 18, textTransform: UC }}>How to test yourself</p>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(16px, 4vw, 20px)', lineHeight: 1.85, color: 'var(--silver)' }}>{question.instruction}</p>
                    </div>
                    {question.photo && (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={question.photo} alt={question.regionLabel} style={{ width: '100%', display: 'block', opacity: 0.88 }} />
                        {question.ytSearch && (
                          <a href={`https://www.youtube.com/results?search_query=${question.ytSearch}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(255,0,0,0.12)', border: '1px solid rgba(255,0,0,0.3)', padding: '16px 20px', textDecoration: 'none', marginTop: 2 }}>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 2, color: '#ff6b6b' }}>FIND DEMO VIDEO</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)' }}>
                    {question.options.map((option, index) => {
                      const selected = answers[question.id] === option.value
                      return (
                        <div
                          key={option.id}
                          onClick={() => pick(question.id, option.value)}
                          style={{ flex: 1, background: selected ? 'var(--black3)' : 'var(--black2)', padding: '32px 24px', cursor: 'pointer', transition: 'background 0.2s', borderLeft: selected ? `6px solid ${regionColor}` : '6px solid transparent' }}
                          className="mg-assessment-option-row"
                        >
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, letterSpacing: 2, color: selected ? regionColor : 'var(--silver4)', minWidth: 32, flexShrink: 0 }}>{index + 1}</span>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4.6vw, 26px)', fontWeight: selected ? 600 : 400, color: selected ? 'var(--white)' : 'var(--silver)', lineHeight: 1.4 }}>{option.label}</span>
                          {selected && (
                            <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex' }}>
                              <IconCheckin size={26} color={regionColor} />
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="mg-assessment-action-row">
                <button className="btn-outline" onClick={back}>BACK</button>
                <button className="btn-primary" disabled={answers[question.id] === undefined} onClick={next}>
                  {step === TOTAL ? (saving ? 'SAVING...' : 'SEE MY RESULTS') : 'CONTINUE'}
                </button>
              </div>
              {saveError && (
                <div style={{ marginTop: 18, borderLeft: '3px solid #e74c3c', background: 'rgba(231,76,60,0.08)', padding: '14px 16px', fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: '#ffd7d2', lineHeight: 1.6 }}>
                  {saveError}
                </div>
              )}
            </div>
          )}

          {done && scores && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Your Mobility Profile</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(40px, 10vw, 72px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 60 }}>
                SCREENING
                <br />
                COMPLETE
              </p>

              <div style={{ border: '1px solid var(--border)', background: 'var(--black2)', padding: '56px 28px', marginBottom: 2, textAlign: CA }}>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(88px, 24vw, 160px)', fontWeight: 700, color: scoreLabel(scores.overall.pct).color, lineHeight: 1, letterSpacing: 4 }}>{scores.overall.pct}</p>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, letterSpacing: 6, color: 'var(--silver2)', marginTop: 16 }}>OVERALL MOBILITY SCORE</p>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 5, color: scoreLabel(scores.overall.pct).color, marginTop: 20 }}>{scoreLabel(scores.overall.pct).label}</p>
              </div>

              <div style={{ borderLeft: `6px solid ${saveConfirmed ? '#00b4d8' : '#e74c3c'}`, border: `1px solid ${saveConfirmed ? 'rgba(0,180,216,0.25)' : 'rgba(231,76,60,0.25)'}`, background: 'var(--black2)', padding: '22px 28px', marginBottom: 24 }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 4, color: saveConfirmed ? 'var(--cyan)' : '#ff8f8f', marginBottom: 10, textTransform: UC }}>
                  {saveConfirmed ? 'Score Saved' : 'Profile Save Failed'}
                </p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'var(--silver2)', lineHeight: 1.7 }}>
                  {saveConfirmed
                    ? 'Your mobility score is saved and will now drive your dashboard and results view.'
                    : saveError || 'Your score was calculated, but we could not save it to your profile. Please retake the screening or try again.'}
                </p>
              </div>

              <div className="mg-assessment-grid-3" style={{ borderTop: 'none', marginBottom: 48 }}>
                {(['hips', 'shoulders', 'spine'] as const).map((region) => {
                  const score = scores[region]
                  const status = scoreLabel(score.pct)
                  const RegionSummaryIcon = region === 'hips' ? IconHips : region === 'shoulders' ? IconShoulders : IconSpine
                  return (
                    <div key={region} style={{ background: 'var(--black2)', padding: '56px 32px', textAlign: CA }}>
                      <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><RegionSummaryIcon size={56} color={status.color} /></span>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 3, color: 'var(--silver)', marginBottom: 24, textTransform: UC }}>{region}</p>
                      <div style={{ height: 3, background: 'var(--silver4)', marginBottom: 16, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${score.pct}%`, background: status.color, transition: 'width 1.2s ease' }} />
                      </div>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 56, color: status.color, marginBottom: 10, letterSpacing: 2 }}>{score.pct}<span style={{ fontSize: 22, color: 'var(--silver3)' }}>%</span></p>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, letterSpacing: 4, color: status.color, textTransform: UC }}>{status.label}</p>
                    </div>
                  )
                })}
              </div>

              {(() => {
                const ranked: Array<'hips' | 'shoulders' | 'spine'> = ['hips', 'shoulders', 'spine']
                const weakest = [...ranked].sort((a, b) => scores[a].pct - scores[b].pct)[0]
                const status = scoreLabel(scores[weakest].pct)
                const regionLabel: Record<typeof weakest, string> = {
                  hips: 'Hip Mobility',
                  shoulders: 'Shoulder Mobility',
                  spine: 'Spinal Mobility',
                }
                return (
                  <div style={{ borderLeft: `6px solid ${status.color}`, border: `1px solid ${status.color}30`, background: 'var(--black2)', padding: '32px 24px', marginBottom: 52 }}>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: status.color, marginBottom: 18, textTransform: UC }}>Priority Area</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(22px, 5vw, 28px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 18 }}>{regionLabel[weakest]}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(17px, 4vw, 22px)', color: 'var(--silver2)', lineHeight: 1.7 }}>
                      Your {weakest} scored lowest at {scores[weakest].pct}%. Start your next routine with a {weakest}-focused session and reassess at the end of your current training block.
                    </p>
                  </div>
                )
              })()}

              <div className="mg-assessment-action-row">
                <button className="btn-primary" onClick={() => router.push(isPro ? '/battery' : '/quiz')}>{isPro ? 'CONTINUE TO BATTERY' : 'CHOOSE SPORT OR BODY AREA'}</button>
                <button className="btn-outline" onClick={() => router.push('/results')}>VIEW SAVED SCORES</button>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>DASHBOARD</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
