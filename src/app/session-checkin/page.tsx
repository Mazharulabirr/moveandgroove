'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Icon, type IconName } from '@/components/Icons'
import { createClient } from '@/lib/supabase/client'

const UC = 'uppercase' as const

type CheckinType = 'pre' | 'post'
type Question = {
  id: string
  text: string
  sub: string
  icon: IconName
  options: { value: number; label: string }[]
}

const PRE_QUESTIONS: Question[] = [
  {
    id: 'pain',
    text: 'ANY PAIN OR DISCOMFORT TODAY?',
    sub: 'This helps flag whether the session should stay clean and low-risk.',
    icon: 'pain',
    options: [
      { value: 4, label: 'None' },
      { value: 3, label: 'Mild' },
      { value: 2, label: 'Moderate' },
      { value: 1, label: 'Significant' },
    ],
  },
  {
    id: 'energy',
    text: 'HOW IS YOUR ENERGY RIGHT NOW?',
    sub: 'A quick check on how much quality work you can handle today.',
    icon: 'energy',
    options: [
      { value: 4, label: 'High' },
      { value: 3, label: 'Good' },
      { value: 2, label: 'Low' },
      { value: 1, label: 'Very Low' },
    ],
  },
]

const POST_QUESTIONS: Question[] = [
  {
    id: 'completion',
    text: 'DID YOU COMPLETE THE SESSION?',
    sub: 'Tracks adherence and gives context for your progress.',
    icon: 'checkbox',
    options: [
      { value: 4, label: 'Fully - every exercise done' },
      { value: 3, label: 'Mostly - skipped one or two' },
      { value: 2, label: 'Partially - got through about half' },
      { value: 1, label: 'Barely - had to cut it short' },
    ],
  },
  {
    id: 'rpe',
    text: 'HOW HARD DID IT FEEL?',
    sub: 'Rate of perceived exertion across the whole session.',
    icon: 'battery',
    options: [
      { value: 1, label: 'Very easy - barely felt it' },
      { value: 2, label: 'Moderate - good challenge' },
      { value: 3, label: 'Hard - pushed myself' },
      { value: 4, label: 'Very hard - gave everything' },
    ],
  },
  {
    id: 'feel',
    text: 'HOW DO YOU FEEL NOW?',
    sub: 'Post-session feedback helps calibrate future sessions.',
    icon: 'readiness',
    options: [
      { value: 4, label: 'Great - looser and energised' },
      { value: 3, label: 'Good - noticeably better' },
      { value: 2, label: 'Same - not much difference' },
      { value: 1, label: 'Tired - need to rest now' },
    ],
  },
  {
    id: 'areas',
    text: 'ANY AREAS THAT NEED MORE WORK?',
    sub: 'Flags which regions to prioritise in your next session.',
    icon: 'focus',
    options: [
      { value: 4, label: 'Hips feel tight' },
      { value: 3, label: 'Shoulders feel tight' },
      { value: 2, label: 'Spine feels tight' },
      { value: 1, label: 'Felt balanced' },
    ],
  },
]

export default function SessionCheckinPage() {
  const router = useRouter()
  const supabase = createClient()
  const [type, setType] = useState<CheckinType | null>(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const questions = type === 'pre' ? PRE_QUESTIONS : POST_QUESTIONS
  const question = questions[step - 1]
  const total = questions.length
  const progress = step === 0 ? 0 : Math.round((step / total) * 100)
  const accentColor = type === 'pre' ? '#00b4d8' : '#4ac8e8'

  function pick(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function next() {
    if (step < total) {
      setStep((current) => current + 1)
      return
    }
    void finish()
  }

  function back() {
    if (step === 0) {
      setType(null)
      setStep(0)
      setAnswers({})
      return
    }
    setStep((current) => current - 1)
  }

  async function finish() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) {
        await supabase.from('readiness_logs').insert([
          {
            user_id: uid,
            responses: answers,
            checkin_type: type,
            checked_at: new Date().toISOString(),
          },
        ])
      }
    } catch (error) {
      console.error('[session-checkin]', error)
    }
    setSaving(false)
    setDone(true)
  }

  function reset() {
    setType(null)
    setStep(0)
    setAnswers({})
    setDone(false)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
        <div className="mg-page-shell" style={{ maxWidth: 1000 }}>
          {!type && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Session Check-in</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 24 }}>
                PRE OR POST
                <br />
                SESSION?
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 56, maxWidth: 620 }}>
                Check in before your session to flag pain and energy, or after to log how the session landed.
              </p>
              <div className="mg-grid-2" style={{ gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 56 }}>
                {[
                  { id: 'pre' as CheckinType, icon: 'readiness' as IconName, label: 'PRE-SESSION', sub: 'Pain and energy check before you start.', questions: 2 },
                  { id: 'post' as CheckinType, icon: 'checkin' as IconName, label: 'POST-SESSION', sub: 'Completion, effort, feel, and next focus.', questions: 4 },
                ].map((item) => (
                  <div key={item.id} onClick={() => { setType(item.id); setStep(1) }} style={{ background: 'var(--black2)', padding: '56px 40px', cursor: 'pointer', transition: 'background 0.2s' }}>
                    <span style={{ display: 'flex', marginBottom: 24 }}><Icon name={item.icon} size={42} color="var(--cyan)" /></span>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 3, color: 'var(--cyan)', marginBottom: 16 }}>{item.label}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 20, color: 'var(--silver2)', lineHeight: 1.6, marginBottom: 20 }}>{item.sub}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 3, color: 'var(--silver3)', textTransform: UC }}>{item.questions} questions</p>
                  </div>
                ))}
              </div>
              <button className="btn-outline" onClick={() => router.push('/dashboard')}>BACK</button>
            </div>
          )}

          {type && !done && question && (
            <div key={step} style={{ animation: 'fadeUp 0.35s ease forwards' }}>
              <div style={{ width: '100%', height: 3, background: 'var(--border)', marginBottom: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,var(--silver3),${accentColor})`, transition: 'width 0.4s ease' }} />
              </div>

              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 44, textTransform: UC }}>
                {type === 'pre' ? 'Pre-Session' : 'Post-Session'} · Question {step} of {total}
              </p>

              <span style={{ display: 'flex', marginBottom: 24 }}><Icon name={question.icon} size={48} color={accentColor} /></span>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 52, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.1, marginBottom: 20 }}>{question.text}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', marginBottom: 48, lineHeight: 1.6 }}>{question.sub}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 48 }}>
                {question.options.map((option, index) => {
                  const selected = answers[question.id] === option.value
                  return (
                    <div key={option.value} onClick={() => pick(question.id, option.value)} style={{ background: selected ? 'var(--black3)' : 'var(--black2)', padding: '28px 48px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 28, borderLeft: selected ? `6px solid ${accentColor}` : '6px solid transparent' }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, letterSpacing: 2, color: selected ? accentColor : 'var(--silver4)', minWidth: 32, flexShrink: 0 }}>{index + 1}</span>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, fontWeight: selected ? 600 : 400, color: selected ? 'var(--white)' : 'var(--silver)', lineHeight: 1.4 }}>{option.label}</span>
                      {selected && <span style={{ marginLeft: 'auto', display: 'flex' }}><Icon name="checkin" size={26} color={accentColor} /></span>}
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={back}>BACK</button>
                <button className="btn-primary" disabled={answers[question.id] === undefined} onClick={next}>
                  {step === total ? (saving ? 'SAVING...' : 'FINISH') : 'CONTINUE'}
                </button>
              </div>
            </div>
          )}

          {done && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>
                {type === 'pre' ? 'Pre-Session' : 'Post-Session'} Complete
              </p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 32 }}>
                {type === 'pre' ? 'LET’S GO' : 'WELL DONE'}
              </p>

              <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '48px', marginBottom: 48 }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: 'var(--cyan)', marginBottom: 16, textTransform: UC }}>
                  {type === 'pre' ? 'Your session is ready' : 'Session logged'}
                </p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', lineHeight: 1.7 }}>
                  {type === 'pre'
                    ? 'Your pre-session check-in is logged. Head into your routine and keep the day honest.'
                    : 'Great work today. Your post-session feedback has been saved for future planning.'}
                </p>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {type === 'pre' && <button className="btn-primary" onClick={() => router.push('/quiz')}>START ROUTINE</button>}
                {type === 'post' && <button className="btn-primary" onClick={() => router.push('/results')}>VIEW MY RESULTS</button>}
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>DASHBOARD</button>
                <button className="btn-outline" onClick={reset}>NEW CHECK-IN</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
