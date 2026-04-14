'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildReadinessAdjustmentSnapshot } from '@/lib/readiness'
import { writeStoredPreSessionReadiness } from '@/lib/readiness-storage'

const UC = 'uppercase' as const

const QUESTIONS = [
  {
    id: 'sleep',
    text: 'HOW DID YOU SLEEP?',
    sub: 'Sleep quality shapes recovery and how much training load makes sense today.',
    options: [
      { value: 4, label: 'Great - fully rested' },
      { value: 3, label: 'Good - slept well enough' },
      { value: 2, label: 'Average - not ideal' },
      { value: 1, label: 'Poor - feel under-recovered' },
    ],
  },
  {
    id: 'soreness',
    text: 'HOW SORE DO YOU FEEL?',
    sub: 'This helps us keep intensity honest and work around sensitive areas.',
    options: [
      { value: 4, label: 'Fresh - no real soreness' },
      { value: 3, label: 'Mild - a little tight' },
      { value: 2, label: 'Moderate - definitely sore' },
      { value: 1, label: 'High - movement feels limited' },
    ],
  },
  {
    id: 'mood',
    text: 'WHAT IS YOUR MOOD LIKE?',
    sub: 'Mood tells us how much complexity and pressure fits today.',
    options: [
      { value: 4, label: 'Focused - ready to train' },
      { value: 3, label: 'Fine - steady and okay' },
      { value: 2, label: 'Flat - hard to get going' },
      { value: 1, label: 'Off - not in a great headspace' },
    ],
  },
] as const

const SORENESS_AREAS = ['Neck', 'Shoulders', 'Upper back', 'Lower back', 'Hips', 'Knees', 'Ankles'] as const

type Props = {
  open: boolean
  allowClose?: boolean
  onClose?: () => void
  onComplete?: () => void
}

export default function PreSessionReadinessModal({ open, allowClose = false, onClose, onComplete }: Props) {
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [sorenessAreas, setSorenessAreas] = useState<string[]>([])
  const [sorenessSeverity, setSorenessSeverity] = useState(0)
  const [sorenessNotes, setSorenessNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  if (!open) {
    return null
  }

  const question = QUESTIONS[step]
  const progress = Math.round(((step + 1) / QUESTIONS.length) * 100)

  function resetAndClose() {
    setStep(0)
    setAnswers({})
    setSorenessAreas([])
    setSorenessSeverity(0)
    setSorenessNotes('')
    setSaving(false)
    setError('')
    onClose?.()
  }

  function toggleArea(area: string) {
    setSorenessAreas((prev) => (prev.includes(area) ? prev.filter((item) => item !== area) : [...prev, area]))
  }

  async function finish() {
    setSaving(true)
    setError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id

      if (!uid) {
        throw new Error('Sign in required')
      }

      const checkedAt = new Date().toISOString()
      const responses = {
        ...answers,
        sorenessAreas,
        sorenessSeverity,
        sorenessNotes: sorenessNotes.trim() || null,
      }
      const snapshot = buildReadinessAdjustmentSnapshot({
        answers,
        sorenessAreas,
        sorenessSeverity,
        sorenessNotes,
        checkedAt,
      })

      writeStoredPreSessionReadiness(snapshot)

      const { error: insertError } = await supabase.from('readiness_logs').insert([
        {
          user_id: uid,
          responses,
          readiness_score: snapshot.readinessScore,
          checkin_type: 'pre',
          checked_at: checkedAt,
        },
      ])

      if (insertError) {
        console.warn('[pre-session-readiness.insert]', insertError)
      }

      window.localStorage.setItem('mg_pre_session_ready_at', checkedAt)
      setStep(0)
      setAnswers({})
      setSorenessAreas([])
      setSorenessSeverity(0)
      setSorenessNotes('')
      onComplete?.()
    } catch (err: unknown) {
      console.error('[pre-session-readiness]', err)
      try {
        const checkedAt = new Date().toISOString()
        const snapshot = buildReadinessAdjustmentSnapshot({
          answers,
          sorenessAreas,
          sorenessSeverity,
          sorenessNotes,
          checkedAt,
        })
        writeStoredPreSessionReadiness(snapshot)
        window.localStorage.setItem('mg_pre_session_ready_at', checkedAt)
        setStep(0)
        setAnswers({})
        setSorenessAreas([])
        setSorenessSeverity(0)
        setSorenessNotes('')
        onComplete?.()
      } catch {
        setError(err instanceof Error ? err.message : 'Could not save readiness check')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.76)', backdropFilter: 'blur(10px)', padding: '24px 16px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 900, margin: '36px auto', background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(8,10,14,0.98) 100%)', border: '1px solid rgba(139,231,255,0.18)', padding: '30px 28px 26px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 22 }}>
          <div>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>
              {'// Pre Training Readiness Check'}
            </div>
            <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(22px,4vw,38px)', fontWeight: 700, letterSpacing: 3, color: 'var(--white)', lineHeight: 1.15, marginBottom: 12 }}>
              CHECK IN
              <br />
              BEFORE YOU TRAIN
            </div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.75, maxWidth: 620 }}>
              This happens before session generation so today&apos;s routine matches how your body actually feels right now.
            </div>
          </div>
          {allowClose && (
            <button className="btn-outline" onClick={resetAndClose}>
              CLOSE
            </button>
          )}
        </div>

        <div style={{ width: '100%', height: 3, background: 'var(--border)', marginBottom: 26, position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,var(--silver3),var(--cyan))', transition: 'width 0.3s ease' }} />
        </div>

        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 3, color: 'var(--silver3)', marginBottom: 16, textTransform: UC }}>
          Question {step + 1} of {QUESTIONS.length}
        </div>
        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(20px,3vw,32px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.2, marginBottom: 12 }}>
          {question.text}
        </div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.7, marginBottom: 22 }}>
          {question.sub}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 22 }}>
          {question.options.map((option) => {
            const selected = answers[question.id] === option.value
            return (
              <button
                key={option.value}
                onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.value }))}
                style={{
                  textAlign: 'left',
                  padding: '18px 18px',
                  background: selected ? 'rgba(0,180,216,0.1)' : 'rgba(255,255,255,0.03)',
                  border: selected ? '1px solid rgba(0,180,216,0.28)' : '1px solid rgba(255,255,255,0.08)',
                  color: selected ? 'var(--white)' : 'var(--silver2)',
                  cursor: 'pointer',
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 16,
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>

        {question.id === 'soreness' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', padding: '20px 18px', marginBottom: 22 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 14, textTransform: UC }}>
              Soreness Details
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
              {SORENESS_AREAS.map((area) => {
                const selected = sorenessAreas.includes(area)
                return (
                  <button
                    key={area}
                    onClick={() => toggleArea(area)}
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 10,
                      letterSpacing: 2,
                      padding: '9px 12px',
                      border: selected ? '1px solid rgba(0,180,216,0.28)' : '1px solid rgba(255,255,255,0.08)',
                      background: selected ? 'rgba(0,180,216,0.1)' : 'rgba(255,255,255,0.03)',
                      color: selected ? 'var(--white)' : 'var(--silver2)',
                      cursor: 'pointer',
                      textTransform: UC,
                    }}
                  >
                    {area}
                  </button>
                )
              })}
            </div>
            <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 10 }}>
              HOW MUCH? {sorenessSeverity}/10
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={sorenessSeverity}
              onChange={(event) => setSorenessSeverity(parseInt(event.target.value, 10))}
              style={{ width: '100%', accentColor: '#00b4d8', marginBottom: 18 }}
            />
            <textarea
              value={sorenessNotes}
              onChange={(event) => setSorenessNotes(event.target.value)}
              rows={3}
              placeholder="Optional note, e.g. left shoulder pinch overhead..."
              style={{
                width: '100%',
                background: 'var(--black2)',
                color: 'var(--silver2)',
                border: '1px solid var(--border)',
                padding: '12px 14px',
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 15,
                lineHeight: 1.6,
                resize: 'vertical',
              }}
            />
          </div>
        )}

        {error && (
          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#ff8f8f', marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {step > 0 && (
            <button className="btn-outline" onClick={() => setStep((current) => current - 1)}>
              BACK
            </button>
          )}
          {step < QUESTIONS.length - 1 ? (
            <button className="btn-primary" disabled={answers[question.id] === undefined} onClick={() => setStep((current) => current + 1)}>
              CONTINUE
            </button>
          ) : (
            <button className="btn-primary" disabled={answers[question.id] === undefined || saving} onClick={finish}>
              {saving ? 'SAVING...' : 'START SESSION'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
