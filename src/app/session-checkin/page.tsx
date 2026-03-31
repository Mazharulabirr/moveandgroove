'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

const UC = 'uppercase' as const

type CheckinType = 'pre' | 'post'

const PRE_QUESTIONS = [
  {
    id: 'focus',
    text: 'WHAT IS YOUR FOCUS TODAY?',
    sub: 'This shapes which pillar we emphasise in your session.',
    icon: '🎯',
    options: [
      { value: 4, label: 'Flexibility — I want more range',     emoji: '🧘' },
      { value: 3, label: 'Strength — I want more control',      emoji: '💪' },
      { value: 2, label: 'Balanced — equal across all pillars', emoji: '⚖️' },
      { value: 1, label: 'Recovery — light and easy today',     emoji: '🫧' },
    ],
  },
  {
    id: 'time',
    text: 'HOW LONG DO YOU HAVE?',
    sub: 'We will scale exercises and hold times to fit your window.',
    icon: '⏱️',
    options: [
      { value: 4, label: '30+ minutes — plenty of time',        emoji: '🟢' },
      { value: 3, label: '20–30 minutes — solid window',        emoji: '🟡' },
      { value: 2, label: '15–20 minutes — short session',       emoji: '🟠' },
      { value: 1, label: 'Under 15 minutes — quick hit',        emoji: '🔴' },
    ],
  },
  {
    id: 'pain',
    text: 'ANY PAIN OR DISCOMFORT?',
    sub: 'Helps us flag which areas to avoid or modify today.',
    icon: '⚠️',
    options: [
      { value: 4, label: 'None — feeling great',                emoji: '✅' },
      { value: 3, label: 'Mild — slight tightness only',        emoji: '🟡' },
      { value: 2, label: 'Moderate — need to be careful',       emoji: '🟠' },
      { value: 1, label: 'High — significant pain today',       emoji: '🔴' },
    ],
  },
]

const POST_QUESTIONS = [
  {
    id: 'completion',
    text: 'DID YOU COMPLETE THE SESSION?',
    sub: 'Tracks your adherence and helps us assess progress.',
    icon: '✅',
    options: [
      { value: 4, label: 'Fully — every exercise done',         emoji: '🌟' },
      { value: 3, label: 'Mostly — skipped one or two',         emoji: '✅' },
      { value: 2, label: 'Partially — got through about half',  emoji: '😐' },
      { value: 1, label: 'Barely — had to cut it short',        emoji: '❌' },
    ],
  },
  {
    id: 'rpe',
    text: 'HOW HARD DID IT FEEL?',
    sub: 'Rate of perceived exertion — how challenging was the session?',
    icon: '💦',
    options: [
      { value: 1, label: 'Very easy — barely felt it',          emoji: '😴' },
      { value: 2, label: 'Moderate — good challenge',           emoji: '😤' },
      { value: 3, label: 'Hard — pushed myself',                emoji: '🔥' },
      { value: 4, label: 'Very hard — gave everything',         emoji: '💀' },
    ],
  },
  {
    id: 'feel',
    text: 'HOW DO YOU FEEL NOW?',
    sub: 'Post-session feedback helps us calibrate future sessions.',
    icon: '🌟',
    options: [
      { value: 4, label: 'Great — looser and energised',        emoji: '🚀' },
      { value: 3, label: 'Good — noticeably better',            emoji: '😊' },
      { value: 2, label: 'Same — not much difference',          emoji: '😐' },
      { value: 1, label: 'Tired — need to rest now',            emoji: '😴' },
    ],
  },
  {
    id: 'areas',
    text: 'ANY AREAS THAT NEED MORE WORK?',
    sub: 'Flags which regions to prioritise in your next session.',
    icon: '📍',
    options: [
      { value: 4, label: 'Hips — still feel restricted',        emoji: '🦵' },
      { value: 3, label: 'Shoulders — need more work',          emoji: '💪' },
      { value: 2, label: 'Spine — still tight through back',    emoji: '🦴' },
      { value: 1, label: 'All good — felt balanced',            emoji: '✅' },
    ],
  },
]

export default function SessionCheckinPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [type,    setType]    = useState<CheckinType | null>(null)
  const [step,    setStep]    = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(false)

  const questions = type === 'pre' ? PRE_QUESTIONS : POST_QUESTIONS
  const q         = questions[step - 1]
  const TOTAL     = questions.length
  const progress  = step === 0 ? 0 : Math.round((step / TOTAL) * 100)

  function pick(qId: string, value: number) {
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }

  function next() {
    if (step < TOTAL) setStep(s => s + 1)
    else finish()
  }

  function back() {
    if (step === 0) { setType(null); setStep(0); setAnswers({}) }
    else setStep(s => s - 1)
  }

  async function finish() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) {
        await supabase.from('readiness_logs').insert([{
          user_id:     uid,
          responses:   answers,
          checkin_type: type,
          checked_at:  new Date().toISOString(),
        }])
      }
    } catch (err) { console.error('[session-checkin]', err) }
    setSaving(false)
    setDone(true)
  }

  function reset() {
    setType(null)
    setStep(0)
    setAnswers({})
    setDone(false)
  }

  const accentColor = type === 'pre' ? '#00b4d8' : '#4ac8e8'

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 80px' }}>

          {/* ── TYPE SELECTION ── */}
          {!type && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Session Check-in</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 24 }}>PRE OR POST<br />SESSION?</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 56, maxWidth: 620 }}>
                Check in before your session to set your intention, or after to log how it went.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 56 }}>
                {[
                  { id: 'pre' as CheckinType, icon: '🌅', label: 'PRE-SESSION', sub: 'Set your focus, flag pain, confirm time available.', questions: 3 },
                  { id: 'post' as CheckinType, icon: '🌙', label: 'POST-SESSION', sub: 'Log completion, RPE, how you feel, areas to work on.', questions: 4 },
                ].map(t => (
                  <div
                    key={t.id}
                    onClick={() => { setType(t.id); setStep(1) }}
                    style={{ background: 'var(--black2)', padding: '56px 40px', cursor: 'pointer', transition: 'background 0.2s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--black3)'}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--black2)'}
                  >
                    <span style={{ fontSize: 56, display: 'block', marginBottom: 24 }}>{t.icon}</span>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 3, color: 'var(--cyan)', marginBottom: 16 }}>{t.label}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 20, color: 'var(--silver2)', lineHeight: 1.6, marginBottom: 20 }}>{t.sub}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 3, color: 'var(--silver3)', textTransform: UC }}>{t.questions} questions</p>
                  </div>
                ))}
              </div>
              <button className="btn-outline" onClick={() => router.push('/dashboard')}>← BACK</button>
            </div>
          )}

          {/* ── QUESTIONS ── */}
          {type && !done && q && (
            <div key={step} style={{ animation: 'fadeUp 0.35s ease forwards' }}>
              {/* Progress */}
              <div style={{ width: '100%', height: 3, background: 'var(--border)', marginBottom: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: progress + '%', background: 'linear-gradient(90deg,var(--silver3),' + accentColor + ')', transition: 'width 0.4s ease' }} />
              </div>

              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 44, textTransform: UC }}>
                {type === 'pre' ? 'Pre-Session' : 'Post-Session'} · Question {step} of {TOTAL}
              </p>

              <span style={{ fontSize: 64, display: 'block', marginBottom: 24 }}>{q.icon}</span>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 52, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.1, marginBottom: 20 }}>{q.text}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', marginBottom: 48, lineHeight: 1.6 }}>{q.sub}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 48 }}>
                {q.options.map(opt => {
                  const sel = answers[q.id] === opt.value
                  return (
                    <div
                      key={opt.value}
                      onClick={() => pick(q.id, opt.value)}
                      style={{ background: sel ? 'var(--black3)' : 'var(--black2)', padding: '28px 48px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 28, borderLeft: sel ? '6px solid ' + accentColor : '6px solid transparent' }}
                      onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--black3)' }}
                      onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--black2)' }}
                    >
                      <span style={{ fontSize: 28, flexShrink: 0 }}>{opt.emoji}</span>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, fontWeight: sel ? 600 : 400, color: sel ? 'var(--white)' : 'var(--silver)', lineHeight: 1.4 }}>{opt.label}</span>
                      {sel && <span style={{ marginLeft: 'auto', flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--black)', fontWeight: 700 }}>✓</span>}
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={back}>← BACK</button>
                <button className="btn-primary" disabled={answers[q.id] === undefined} onClick={next}>
                  {step === TOTAL ? (saving ? 'SAVING…' : 'FINISH →') : 'CONTINUE →'}
                </button>
              </div>
            </div>
          )}

          {/* ── DONE ── */}
          {done && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>
                {type === 'pre' ? 'Pre-Session' : 'Post-Session'} Complete
              </p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 32 }}>
                {type === 'pre' ? 'LET\'S GO!' : 'WELL DONE!'}
              </p>

              <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '48px', marginBottom: 48 }}>
                {type === 'pre' ? (
                  <>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: 'var(--cyan)', marginBottom: 16, textTransform: UC }}>Your session is ready</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', lineHeight: 1.7 }}>
                      Your pre-session check-in is logged. Head into your routine — your answers have been saved and will inform your progress tracking.
                    </p>
                  </>
                ) : (
                  <>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: 'var(--cyan)', marginBottom: 16, textTransform: UC }}>Session logged</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', lineHeight: 1.7 }}>
                      Great work today. Your post-session feedback has been saved. Keep showing up consistently and your mobility scores will reflect it.
                    </p>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {type === 'pre' && <button className="btn-primary" onClick={() => router.push('/quiz')}>START ROUTINE →</button>}
                {type === 'post' && <button className="btn-primary" onClick={() => router.push('/results')}>VIEW MY RESULTS →</button>}
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