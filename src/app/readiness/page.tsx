'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { IconCheckin, IconEnergy, IconMotivation, IconSleep, IconSoreness, IconStress } from '@/components/Icons'
import { createClient } from '@/lib/supabase/client'
import { READINESS_QUESTIONS, readinessLabel, readinessScore } from '@/lib/readiness'

const UC = 'uppercase' as const
const TOTAL = READINESS_QUESTIONS.length
const READINESS_ICONS = {
  sleep: IconSleep,
  soreness: IconSoreness,
  energy: IconEnergy,
  stress: IconStress,
  motivation: IconMotivation,
}

export default function ReadinessPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  const question = READINESS_QUESTIONS[step - 1]
  const progress = step === 0 ? 0 : Math.round((step / TOTAL) * 100)
  const score = readinessScore(answers)
  const result = readinessLabel(score)

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
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) {
        await supabase.from('readiness_logs').insert([
          {
            user_id: uid,
            responses: answers,
            readiness_score: score,
            checked_at: new Date().toISOString(),
          },
        ])
      }
    } catch (error) {
      console.error('[readiness]', error)
    }
    setSaving(false)
    setDone(true)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=1920&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
        <div className="mg-page-shell" style={{ maxWidth: 1000 }}>
          {step === 0 && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Daily Check-in</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 24 }}>
                HOW ARE YOU
                <br />
                TODAY?
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 56, maxWidth: 620 }}>
                5 quick questions in under a minute. Your readiness score shapes today&apos;s session recommendation.
              </p>
              <div className="mg-grid-5" style={{ gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 56 }}>
                {READINESS_QUESTIONS.map((item) => {
                  const ReadinessIcon = READINESS_ICONS[item.id as keyof typeof READINESS_ICONS]
                  return (
                    <div key={item.id} style={{ background: 'var(--black2)', padding: '32px 16px', textAlign: 'center' }}>
                      <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><ReadinessIcon size={28} color="var(--cyan)" /></span>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: 'var(--silver3)', textTransform: UC }}>{item.id}</p>
                    </div>
                  )
                })}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>BACK</button>
                <button className="btn-primary" onClick={() => setStep(1)}>START CHECK-IN</button>
              </div>
            </div>
          )}

          {step > 0 && !done && question && (
            <div key={step} style={{ animation: 'fadeUp 0.35s ease forwards' }}>
              <div style={{ width: '100%', height: 3, background: 'var(--border)', marginBottom: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,var(--silver3),var(--cyan))', transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 44, textTransform: UC }}>Question {step} of {TOTAL}</p>

              {(() => {
                const ReadinessIcon = READINESS_ICONS[question.id as keyof typeof READINESS_ICONS]
                return <span style={{ display: 'flex', marginBottom: 24 }}><ReadinessIcon size={48} color="var(--cyan)" /></span>
              })()}
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 56, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.1, marginBottom: 20 }}>{question.text}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', marginBottom: 48, lineHeight: 1.6 }}>{question.sub}</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 48 }}>
                {question.options.map((option, index) => {
                  const selected = answers[question.id] === option.value
                  return (
                    <div key={option.value} onClick={() => pick(question.id, option.value)} style={{ background: selected ? 'var(--black3)' : 'var(--black2)', padding: '28px 48px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 28, borderLeft: selected ? '6px solid var(--cyan)' : '6px solid transparent' }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, letterSpacing: 2, color: selected ? 'var(--cyan)' : 'var(--silver4)', minWidth: 32, flexShrink: 0 }}>{index + 1}</span>
                      <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, fontWeight: selected ? 600 : 400, color: selected ? 'var(--white)' : 'var(--silver)', lineHeight: 1.4 }}>{option.label}</span>
                      {selected && <span style={{ marginLeft: 'auto', display: 'flex' }}><IconCheckin size={26} color="var(--cyan)" /></span>}
                    </div>
                  )
                })}
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={back}>BACK</button>
                <button className="btn-primary" disabled={answers[question.id] === undefined} onClick={next}>
                  {step === TOTAL ? (saving ? 'SAVING...' : 'SEE MY SCORE') : 'CONTINUE'}
                </button>
              </div>
            </div>
          )}

          {done && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Today&apos;s Readiness</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 56 }}>YOUR SCORE</p>

              <div style={{ border: '1px solid var(--border)', background: 'var(--black2)', padding: '80px 56px', marginBottom: 2, textAlign: 'center' }}>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 160, fontWeight: 700, color: result.color, lineHeight: 1, letterSpacing: 4 }}>{score}</p>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, letterSpacing: 6, color: 'var(--silver2)', marginTop: 16 }}>READINESS SCORE</p>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 4, color: result.color, marginTop: 20 }}>{result.label}</p>
              </div>

              <div className="mg-grid-5" style={{ gap: 2, background: 'var(--border)', border: '1px solid var(--border)', borderTop: 'none', marginBottom: 2 }}>
                {READINESS_QUESTIONS.map((item) => {
                  const value = answers[item.id] ?? 0
                  const pct = (value / 4) * 100
                  const color = pct >= 75 ? '#00b4d8' : pct >= 50 ? '#4ac8e8' : pct >= 25 ? '#e8a94a' : '#e74c3c'
                  const ReadinessIcon = READINESS_ICONS[item.id as keyof typeof READINESS_ICONS]
                  return (
                    <div key={item.id} style={{ background: 'var(--black2)', padding: '32px 16px', textAlign: 'center' }}>
                      <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><ReadinessIcon size={26} color={color} /></span>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: 'var(--silver3)', marginBottom: 16, textTransform: UC }}>{item.id}</p>
                      <div style={{ height: 3, background: 'var(--silver4)', marginBottom: 12, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: color }} />
                      </div>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 32, fontWeight: 700, color }}>{value}<span style={{ fontSize: 14, color: 'var(--silver3)' }}>/4</span></p>
                    </div>
                  )
                })}
              </div>

              <div style={{ borderLeft: `6px solid ${result.color}`, border: `1px solid ${result.color}30`, background: 'var(--black2)', padding: '36px 48px', marginBottom: 48 }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 3, color: result.color, marginBottom: 16, textTransform: UC }}>Today&apos;s Recommendation</p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', lineHeight: 1.7 }}>{result.recommendation}</p>
              </div>

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => router.push('/quiz')}>BUILD TODAY&apos;S ROUTINE</button>
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

