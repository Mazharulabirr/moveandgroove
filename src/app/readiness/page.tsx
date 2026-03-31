'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

const UC = 'uppercase' as const

type Question = {
  id: string
  text: string
  sub: string
  icon: string
  options: { value: number; label: string; emoji: string }[]
}

const QUESTIONS: Question[] = [
  {
    id: 'sleep',
    text: 'HOW DID YOU SLEEP?',
    sub: 'Sleep quality directly affects tissue recovery and mobility.',
    icon: '😴',
    options: [
      { value: 4, label: 'Excellent — 8+ hours, feel great',   emoji: '🌟' },
      { value: 3, label: 'Good — 7 hours, mostly rested',      emoji: '✅' },
      { value: 2, label: 'Fair — 5-6 hours, a bit tired',      emoji: '😐' },
      { value: 1, label: 'Poor — under 5 hours, exhausted',    emoji: '😴' },
    ],
  },
  {
    id: 'soreness',
    text: 'ANY MUSCLE SORENESS?',
    sub: 'Helps us adjust intensity and target areas needing recovery.',
    icon: '💪',
    options: [
      { value: 4, label: 'None — feeling fresh',               emoji: '🟢' },
      { value: 3, label: 'Mild — slight tightness',            emoji: '🟡' },
      { value: 2, label: 'Moderate — noticeably sore',         emoji: '🟠' },
      { value: 1, label: 'High — very sore or stiff',          emoji: '🔴' },
    ],
  },
  {
    id: 'energy',
    text: 'ENERGY LEVEL TODAY?',
    sub: 'Your energy level shapes the volume and intensity we recommend.',
    icon: '⚡',
    options: [
      { value: 4, label: 'High — ready to push hard',          emoji: '🚀' },
      { value: 3, label: 'Good — feeling solid',               emoji: '✅' },
      { value: 2, label: 'Low — going through the motions',    emoji: '😐' },
      { value: 1, label: 'Very low — consider rest today',     emoji: '🛑' },
    ],
  },
  {
    id: 'stress',
    text: 'STRESS LEVELS?',
    sub: 'High stress elevates cortisol and reduces recovery capacity.',
    icon: '🧠',
    options: [
      { value: 4, label: 'Low — calm and focused',             emoji: '😌' },
      { value: 3, label: 'Mild — manageable',                  emoji: '🙂' },
      { value: 2, label: 'Moderate — quite stressed',          emoji: '😟' },
      { value: 1, label: 'High — very stressed',               emoji: '😰' },
    ],
  },
  {
    id: 'motivation',
    text: 'MOTIVATION TO TRAIN?',
    sub: 'Honest answers help us recommend the right session type.',
    icon: '🎯',
    options: [
      { value: 4, label: 'High — keen to get after it',        emoji: '🔥' },
      { value: 3, label: 'Good — ready to go',                 emoji: '👍' },
      { value: 2, label: 'Low — need a push',                  emoji: '😑' },
      { value: 1, label: 'Very low — not feeling it at all',   emoji: '🚶' },
    ],
  },
]

const TOTAL = QUESTIONS.length

function readinessScore(answers: Record<string, number>) {
  const total  = Object.values(answers).reduce((s, v) => s + v, 0)
  const max    = TOTAL * 4
  return Math.round((total / max) * 100)
}

function readinessLabel(score: number): { label: string; color: string; recommendation: string } {
  if (score >= 80) return {
    label: 'READY TO PERFORM',
    color: '#00b4d8',
    recommendation: 'Your body is primed. Push intensity today — this is a great session for a full routine or new movement challenge.',
  }
  if (score >= 60) return {
    label: 'GOOD TO GO',
    color: '#4ac8e8',
    recommendation: 'You are ready for a solid session. Stick to your planned routine and listen to your body throughout.',
  }
  if (score >= 40) return {
    label: 'MODIFIED SESSION',
    color: '#e8a94a',
    recommendation: 'Consider a lighter session today — focus on release and activation work rather than pushing range or intensity.',
  }
  return {
    label: 'REST OR RECOVER',
    color: '#e74c3c',
    recommendation: 'Your body is telling you to recover. A gentle foam roll and walk may serve you better than a full session today.',
  }
}

export default function ReadinessPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step,    setStep]    = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(false)

  const q        = QUESTIONS[step - 1]
  const progress = step === 0 ? 0 : Math.round((step / TOTAL) * 100)
  const score    = readinessScore(answers)
  const result   = readinessLabel(score)

  function pick(qId: string, value: number) {
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }

  function next() {
    if (step < TOTAL) setStep(s => s + 1)
    else finish()
  }

  function back() {
    if (step === 0) router.push('/dashboard')
    else setStep(s => s - 1)
  }

  async function finish() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) {
        await supabase.from('readiness_logs').insert([{
          user_id:          uid,
          responses:        answers,
          readiness_score:  score,
          checked_at:       new Date().toISOString(),
        }])
      }
    } catch (err) { console.error('[readiness]', err) }
    setSaving(false)
    setDone(true)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1920&q=80&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '60px 80px' }}>

          {/* ── INTRO ── */}
          {step === 0 && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Daily Check-in</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 24 }}>HOW ARE YOU<br />TODAY?</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 56, maxWidth: 620 }}>
                5 quick questions — takes under a minute. Your readiness score shapes today's session recommendation.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 56 }}>
                {QUESTIONS.map(q => (
                  <div key={q.id} style={{ background: 'var(--black2)', padding: '32px 16px', textAlign: 'center' as const }}>
                    <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>{q.icon}</span>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: 'var(--silver3)', textTransform: UC }}>{q.id}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>← BACK</button>
                <button className="btn-primary" onClick={() => setStep(1)}>START CHECK-IN →</button>
              </div>
            </div>
          )}

          {/* ── QUESTIONS ── */}
          {step > 0 && !done && q && (
            <div key={step} style={{ animation: 'fadeUp 0.35s ease forwards' }}>
              {/* Progress */}
              <div style={{ width: '100%', height: 3, background: 'var(--border)', marginBottom: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: progress + '%', background: 'linear-gradient(90deg,var(--silver3),var(--cyan))', transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 44, textTransform: UC }}>Question {step} of {TOTAL}</p>

              <span style={{ fontSize: 64, display: 'block', marginBottom: 24 }}>{q.icon}</span>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 56, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.1, marginBottom: 20 }}>{q.text}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', marginBottom: 48, lineHeight: 1.6 }}>{q.sub}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 48 }}>
                {q.options.map(opt => {
                  const sel = answers[q.id] === opt.value
                  return (
                    <div
                      key={opt.value}
                      onClick={() => pick(q.id, opt.value)}
                      style={{ background: sel ? 'var(--black3)' : 'var(--black2)', padding: '28px 48px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 28, borderLeft: sel ? '6px solid var(--cyan)' : '6px solid transparent' }}
                      onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--black3)' }}
                      onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--black2)' }}
                    >
                      <span style={{ fontSize: 28, flexShrink: 0 }}>{opt.emoji}</span>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, fontWeight: sel ? 600 : 400, color: sel ? 'var(--white)' : 'var(--silver)', lineHeight: 1.4 }}>{opt.label}</span>
                      {sel && <span style={{ marginLeft: 'auto', flexShrink: 0, width: 32, height: 32, borderRadius: '50%', background: 'var(--cyan)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--black)', fontWeight: 700 }}>✓</span>}
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={back}>← BACK</button>
                <button className="btn-primary" disabled={answers[q.id] === undefined} onClick={next}>
                  {step === TOTAL ? (saving ? 'SAVING…' : 'SEE MY SCORE →') : 'CONTINUE →'}
                </button>
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {done && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Today's Readiness</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 56 }}>YOUR SCORE</p>

              {/* Big score */}
              <div style={{ border: '1px solid var(--border)', background: 'var(--black2)', padding: '80px 56px', marginBottom: 2, textAlign: 'center' as const }}>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 160, fontWeight: 700, color: result.color, lineHeight: 1, letterSpacing: 4 }}>{score}</p>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, letterSpacing: 6, color: 'var(--silver2)', marginTop: 16 }}>READINESS SCORE</p>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 4, color: result.color, marginTop: 20 }}>{result.label}</p>
              </div>

              {/* Per-question breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', borderTop: 'none', marginBottom: 2 }}>
                {QUESTIONS.map(q => {
                  const val = answers[q.id] ?? 0
                  const pct = (val / 4) * 100
                  const col = pct >= 75 ? '#00b4d8' : pct >= 50 ? '#4ac8e8' : pct >= 25 ? '#e8a94a' : '#e74c3c'
                  return (
                    <div key={q.id} style={{ background: 'var(--black2)', padding: '32px 16px', textAlign: 'center' as const }}>
                      <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>{q.icon}</span>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: 'var(--silver3)', marginBottom: 16, textTransform: UC }}>{q.id}</p>
                      <div style={{ height: 3, background: 'var(--silver4)', marginBottom: 12, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: pct + '%', background: col }} />
                      </div>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 32, fontWeight: 700, color: col }}>{val}<span style={{ fontSize: 14, color: 'var(--silver3)' }}>/4</span></p>
                    </div>
                  )
                })}
              </div>

              {/* Recommendation */}
              <div style={{ borderLeft: '6px solid ' + result.color, border: '1px solid ' + result.color + '30', background: 'var(--black2)', padding: '36px 48px', marginBottom: 48 }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 3, color: result.color, marginBottom: 16, textTransform: UC }}>Today's Recommendation</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', lineHeight: 1.7 }}>{result.recommendation}</p>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => router.push('/quiz')}>BUILD TODAY'S ROUTINE →</button>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>DASHBOARD</button>
                <button className="btn-outline" onClick={() => { setStep(0); setAnswers({}); setDone(false) }}>REDO CHECK-IN</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}