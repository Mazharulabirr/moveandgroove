'use client'

import { useState } from 'react'
import { IconBattery, IconCheckin, IconCheckbox, IconFocus, IconPain, IconReadiness } from '@/components/Icons'
import { buildPostSessionCheckinInsert } from '@/lib/readiness-log'
import { createClient } from '@/lib/supabase/client'

const UC = 'uppercase' as const

type Question = {
  id: string
  text: string
  sub: string
  Icon: typeof IconPain
  options: { value: number; label: string }[]
}

const POST_QUESTIONS: Question[] = [
  {
    id: 'completion',
    text: 'DID YOU COMPLETE THE SESSION?',
    sub: 'Tracks adherence and gives context for your progress.',
    Icon: IconCheckbox,
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
    Icon: IconBattery,
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
    Icon: IconReadiness,
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
    Icon: IconFocus,
    options: [
      { value: 4, label: 'Hips feel tight' },
      { value: 3, label: 'Shoulders feel tight' },
      { value: 2, label: 'Spine feels tight' },
      { value: 1, label: 'Felt balanced' },
    ],
  },
]

type Props = {
  open: boolean
  onClose: () => void
  onComplete: () => void
}

export default function PostSessionCheckinModal({ open, onClose, onComplete }: Props) {
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [done, setDone] = useState(false)
  const [feedbackSynced, setFeedbackSynced] = useState(false)

  if (!open) {
    return null
  }

  const question = POST_QUESTIONS[step]
  const progress = Math.round(((step + 1) / POST_QUESTIONS.length) * 100)

  function resetState() {
    setStep(0)
    setAnswers({})
    setSaving(false)
    setSaveError('')
    setDone(false)
    setFeedbackSynced(false)
  }

  function closeModal() {
    resetState()
    onClose()
  }

  function pick(questionId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
  }

  function next() {
    if (step < POST_QUESTIONS.length - 1) {
      setStep((current) => current + 1)
      return
    }

    void finish()
  }

  function back() {
    if (step === 0) {
      closeModal()
      return
    }

    setStep((current) => current - 1)
  }

  async function finish() {
    setSaving(true)
    setSaveError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      const accessToken = session?.access_token

      if (!uid) {
        throw new Error('Sign in required')
      }

      const row = buildPostSessionCheckinInsert({
        userId: uid,
        answers,
      })

      if (!accessToken) {
        throw new Error('Missing access token for post-session check-in.')
      }

      const response = await fetch('/api/readiness-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ row }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Could not save post-session check-in.')
      }

      setFeedbackSynced(true)
      setDone(true)
      onComplete()
    } catch (error) {
      console.warn('[post-session-checkin]', {
        message: error instanceof Error ? error.message : 'Could not save post-session check-in.',
        error,
        answers,
      })
      setFeedbackSynced(false)
      setSaveError('')
      setDone(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 950, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)', padding: '24px 16px', overflowY: 'auto' }}>
      <div style={{ maxWidth: 920, margin: '36px auto', background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(8,10,14,0.98) 100%)', border: '1px solid rgba(139,231,255,0.18)', padding: '30px 28px 26px' }}>
        {!done && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', marginBottom: 22 }}>
              <div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>
                  {'// Post Session Check-in'}
                </div>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(22px,4vw,38px)', fontWeight: 700, letterSpacing: 3, color: 'var(--white)', lineHeight: 1.15, marginBottom: 12 }}>
                  LOG HOW
                  <br />
                  THE SESSION LANDED
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.75, maxWidth: 620 }}>
                  Your workout has already been saved to progress and fed into the dashboard. This check-in is optional feedback and should never block the end of your session.
                </div>
              </div>
              <button className="btn-outline" onClick={closeModal}>
                SKIP FOR NOW
              </button>
            </div>

            <div style={{ width: '100%', height: 3, background: 'var(--border)', marginBottom: 16, position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,var(--silver3),var(--cyan))', transition: 'width 0.4s ease' }} />
            </div>

            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 44, textTransform: UC }}>
              Post-Session · Question {step + 1} of {POST_QUESTIONS.length}
            </p>

            <span style={{ display: 'flex', marginBottom: 24 }}><question.Icon size={48} color="#4ac8e8" /></span>
            <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(28px, 7vw, 52px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.1, marginBottom: 20 }}>{question.text}</p>
            <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', marginBottom: 48, lineHeight: 1.6 }}>{question.sub}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 48 }}>
              {question.options.map((option, index) => {
                const selected = answers[question.id] === option.value
                return (
                  <div key={option.value} onClick={() => pick(question.id, option.value)} style={{ background: selected ? 'var(--black3)' : 'var(--black2)', padding: '22px clamp(18px, 5vw, 48px)', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 18, borderLeft: selected ? '6px solid #4ac8e8' : '6px solid transparent' }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, letterSpacing: 2, color: selected ? '#4ac8e8' : 'var(--silver4)', minWidth: 32, flexShrink: 0 }}>{index + 1}</span>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4.8vw, 24px)', fontWeight: selected ? 600 : 400, color: selected ? 'var(--white)' : 'var(--silver)', lineHeight: 1.4, minWidth: 0 }}>{option.label}</span>
                    {selected && <span style={{ marginLeft: 'auto', display: 'flex' }}><IconCheckin size={26} color="#4ac8e8" /></span>}
                  </div>
                )
              })}
            </div>

            {saveError && (
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#ff9f9f', marginBottom: 18, padding: '12px 14px', border: '1px solid rgba(255,143,143,0.18)', background: 'rgba(255,143,143,0.06)' }}>
                {saveError} Your workout stats are already saved, so you can skip this feedback and keep moving.
              </div>
            )}

            <div className="mg-mobile-stack">
              <button className="btn-outline" onClick={back}>BACK</button>
              <button className="btn-outline" onClick={closeModal} disabled={saving}>
                SKIP FOR NOW
              </button>
              <button className="btn-primary" disabled={answers[question.id] === undefined || saving} onClick={next}>
                {step === POST_QUESTIONS.length - 1 ? (saving ? 'SAVING...' : 'SAVE FEEDBACK') : 'CONTINUE'}
              </button>
            </div>
          </>
        )}

        {done && (
          <div style={{ animation: 'fadeUp 0.35s ease forwards' }}>
            <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>
              Post-Session Complete
            </p>
            <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(34px, 10vw, 72px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 32 }}>
              WELL DONE
            </p>

            <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '48px', marginBottom: 32 }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: 'var(--cyan)', marginBottom: 16, textTransform: UC }}>
                {feedbackSynced ? 'Session Feedback Saved' : 'Workout Already Counted'}
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', lineHeight: 1.7 }}>
                {feedbackSynced
                  ? 'Your workout was already counted in progress. This post-session feedback is now saved separately for future tuning.'
                  : 'Your workout was already counted in progress. The optional post-session feedback could not sync this time, but nothing is lost from your stats.'}
              </p>
            </div>

            <div className="mg-mobile-stack">
              <button className="btn-primary" onClick={closeModal}>RETURN TO WORKOUT</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
