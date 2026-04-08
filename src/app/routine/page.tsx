'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

type Exercise = {
  videoId: number | null
  name: string
  targetArea: string
  sets: number
  reps: number | null
  holdSeconds: number | null
  rationale: string
  study: string
  isFoamRoll?: boolean
}

type Phase = {
  pillar: 'prep' | 'release' | 'activation' | 'range'
  phaseDescription: string
  exercises: Exercise[]
}

type Routine = {
  routineTitle: string
  summary: string
  difficultyLevel: string
  totalExercises: number
  phases: Phase[]
  evidenceSummary: string
  savedId?: number
}

type RoutineMeta = {
  routine: Routine
  mode?: 'sport' | 'area'
  sport?: string | null
  areas?: string[]
  duration?: number
  goal?: string | null
  source?: 'recovery' | string
}

const PHASE_STYLES: Record<Phase['pillar'], { label: string; color: string; border: string; bg: string }> = {
  prep: { label: 'PREP', color: 'var(--silver2)', border: 'var(--silver4)', bg: 'var(--black3)' },
  release: { label: 'RELEASE', color: 'var(--silver2)', border: 'var(--silver4)', bg: 'var(--black3)' },
  activation: { label: 'ACTIVATION', color: 'var(--white)', border: 'rgba(200,205,212,0.25)', bg: 'var(--black4)' },
  range: { label: 'RANGE', color: 'var(--cyan)', border: 'rgba(0,180,216,0.35)', bg: 'rgba(0,180,216,0.05)' },
}

function useTimer(sets: number, holdSeconds: number) {
  const [active, setActive] = useState(false)
  const [currentSet, setCurrentSet] = useState(1)
  const [secondsLeft, setSecondsLeft] = useState(holdSeconds)
  const [isRest, setIsRest] = useState(false)
  const [done, setDone] = useState(false)
  const REST = 15

  useEffect(() => {
    if (!active || done) return

    const interval = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (!isRest) {
            if (currentSet < sets) {
              setIsRest(true)
              return REST
            }
            setDone(true)
            setActive(false)
            return 0
          }

          setIsRest(false)
          setCurrentSet((value) => value + 1)
          return holdSeconds
        }

        return prev - 1
      })
    }, 1000)

    return () => window.clearInterval(interval)
  }, [active, currentSet, done, holdSeconds, isRest, sets])

  function start() {
    setActive(true)
  }

  function pause() {
    setActive(false)
  }

  function reset() {
    setActive(false)
    setCurrentSet(1)
    setSecondsLeft(holdSeconds)
    setIsRest(false)
    setDone(false)
  }

  return { active, currentSet, secondsLeft, isRest, done, start, pause, reset }
}

function ExerciseTimer({ sets, holdSeconds }: { sets: number; holdSeconds: number }) {
  const { active, currentSet, secondsLeft, isRest, done, start, pause, reset } = useTimer(sets, holdSeconds)
  const circumference = 2 * Math.PI * 36
  const total = isRest ? 15 : holdSeconds
  const offset = circumference * (1 - secondsLeft / total)

  if (done) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 10, letterSpacing: 2, color: 'var(--cyan)', padding: '8px 16px', border: '1px solid var(--cyan3)', borderRadius: 20 }}>
          COMPLETE / ALL {sets} SETS DONE
        </div>
        <button onClick={reset} style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 8, letterSpacing: 2, color: 'var(--silver3)', background: 'transparent', border: '1px solid var(--silver4)', padding: '6px 14px', borderRadius: 20, cursor: 'pointer' }}>
          REPEAT
        </button>
      </div>
    )
  }

  if (!active && currentSet === 1 && secondsLeft === holdSeconds) {
    return (
      <button onClick={start} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--black3)', border: '1px solid var(--cyan3)', padding: '8px 18px', borderRadius: 30, fontFamily: "'Syncopate',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan)', cursor: 'pointer', marginTop: 8 }}>
        START TIMER
      </button>
    )
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx="40" cy="40" r="36" fill="none" stroke="var(--black4)" strokeWidth="4" />
        <circle
          cx="40"
          cy="40"
          r="36"
          fill="none"
          stroke={isRest ? 'var(--silver3)' : 'var(--cyan)'}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear' }}
        />
      </svg>
      <div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--silver3)', textTransform: 'uppercase' }}>
          {isRest ? 'REST' : `SET ${currentSet} / ${sets}`}
        </div>
        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 36, fontWeight: 700, color: isRest ? 'var(--silver3)' : 'var(--white)', letterSpacing: 2, lineHeight: 1 }}>
          {secondsLeft}s
        </div>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'var(--cyan3)', textTransform: 'uppercase' }}>
          {isRest ? 'Get ready' : 'Hold position'}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={active ? pause : start} style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: 2, padding: '6px 14px', cursor: 'pointer', borderRadius: 20, background: 'transparent', color: 'var(--silver2)', border: '1px solid var(--silver4)' }}>
            {active ? 'PAUSE' : 'RESUME'}
          </button>
          <button onClick={reset} style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 8, fontWeight: 700, letterSpacing: 2, padding: '6px 14px', cursor: 'pointer', borderRadius: 20, background: 'transparent', color: 'var(--silver3)', border: '1px solid var(--silver4)' }}>
            RESET
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RoutinePage() {
  const router = useRouter()
  const supabase = createClient()
  const [storedMeta] = useState<RoutineMeta | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('mg_routine')
    if (!stored) return null

    try {
      return JSON.parse(stored) as RoutineMeta
    } catch {
      return null
    }
  })

  const routine = storedMeta?.routine ?? null
  const [savedId, setSavedId] = useState<number | null>(() => storedMeta?.routine?.savedId ?? null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => {
    if (!routine) {
      router.push('/quiz')
    }
  }, [routine, router])

  const sportLabel = storedMeta?.sport ? storedMeta.sport.toUpperCase() : null
  const areasLabel = storedMeta?.areas && storedMeta.areas.length > 0 ? storedMeta.areas.map((area) => area.toUpperCase()).join(' / ') : 'FULL BODY'
  const builderHref = storedMeta?.source === 'recovery' ? '/recovery' : '/quiz'
  const builderLabel = storedMeta?.source === 'recovery' ? 'REGENERATE RECOVERY' : 'GENERATE NEW ROUTINE'
  const isSaved = savedId !== null

  const studies = useMemo(
    () => (routine ? [...new Set(routine.phases.flatMap((phase) => phase.exercises).map((exercise) => exercise.study).filter(Boolean))] : []),
    [routine],
  )

  async function saveRoutine() {
    if (!storedMeta?.routine || isSaved || saving) {
      return
    }

    setSaving(true)
    setSaveError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      if (!userId) {
        throw new Error('Sign in to save routines to your library.')
      }

      const response = await fetch('/api/routines/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          routine: storedMeta.routine,
          sport: storedMeta.sport || null,
          areas: storedMeta.areas || [],
          duration: storedMeta.duration,
          goal: storedMeta.goal || null,
        }),
      })

      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload.error || `Server error ${response.status}`)
      }

      setSavedId(payload.savedId)

      const nextMeta = {
        ...storedMeta,
        routine: {
          ...storedMeta.routine,
          savedId: payload.savedId,
        },
      }

      localStorage.setItem('mg_routine', JSON.stringify(nextMeta))
    } catch (err: unknown) {
      console.error('[routine.save]', err)
      setSaveError(err instanceof Error ? err.message : 'Could not save routine')
    } finally {
      setSaving(false)
    }
  }

  if (!routine) {
    return (
      <>
        <Header />
        <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
          <div style={{ textAlign: 'center', padding: '100px 40px' }}>
            <div className="loading-ring" />
            <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, letterSpacing: 4, color: 'var(--silver3)' }}>LOADING</div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1920&q=80&fit=crop&crop=center)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.75) 50%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div className="mg-page-shell" style={{ maxWidth: 980 }}>
          <div className="mg-split-section" style={{ alignItems: 'flex-start', marginBottom: 48, paddingBottom: 32, borderBottom: '1px solid var(--border)', gap: 24 }}>
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 12, textTransform: 'uppercase' }}>
                {'// MOVE&GROOVE / '}{new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(30px,4vw,48px)', fontWeight: 600, color: 'var(--white)', lineHeight: 1.2, marginBottom: 16 }}>
                {routine.routineTitle}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {[`${storedMeta?.duration} MIN`, routine.difficultyLevel?.toUpperCase(), `${routine.totalExercises} EXERCISES`, sportLabel || areasLabel]
                  .filter(Boolean)
                  .map((tag) => (
                    <span key={tag} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'var(--silver)', border: '1px solid rgba(0,180,216,0.2)', padding: '5px 12px', textTransform: 'uppercase', background: 'var(--black2)' }}>
                      {tag}
                    </span>
                  ))}
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.7, maxWidth: 560 }}>
                {routine.summary}
              </div>
              <div style={{ marginTop: 22, maxWidth: 620, border: '1px solid rgba(139,231,255,0.18)', background: 'linear-gradient(180deg, rgba(0,180,216,0.08) 0%, rgba(8,10,14,0.96) 100%)', padding: '18px 20px' }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: 'uppercase' }}>
                  {'// Routine Library'}
                </div>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 10, textTransform: 'uppercase' }}>
                  {isSaved ? 'ROUTINE SAVED' : 'DO YOU WANT TO SAVE THIS ROUTINE?'}
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.75, marginBottom: saveError ? 10 : 0 }}>
                  {isSaved
                    ? 'This routine is now in your library and can be reopened later from your profile or programs view.'
                    : 'Save only the routines you want to keep. If not, this stays as a one-time session and your dashboard stays clean.'}
                </div>
                {saveError && (
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#ff8f8f', lineHeight: 1.6, marginTop: 10 }}>
                    {saveError}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
                  {!isSaved && (
                    <button className="btn-primary" onClick={saveRoutine} disabled={saving}>
                      {saving ? 'SAVING...' : 'SAVE TO LIBRARY'}
                    </button>
                  )}
                  <button className="btn-outline" onClick={() => router.push('/dashboard')}>
                    {isSaved ? 'BACK TO DASHBOARD' : 'NOT NOW'}
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
              <button className="btn-outline" onClick={() => router.push(builderHref)}>ADJUST</button>
              <button className="btn-primary" onClick={() => router.push(builderHref)}>REGENERATE</button>
            </div>
          </div>

          {routine.phases.map((phase, phaseIndex) => {
            const phaseStyle = PHASE_STYLES[phase.pillar]
            return (
              <div key={phaseIndex} style={{ marginBottom: 44 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border2)' }}>
                  <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 3, padding: '8px 20px', border: `1px solid ${phaseStyle.border}`, color: phaseStyle.color, background: phaseStyle.bg, textTransform: 'uppercase' }}>
                    {phaseStyle.label}
                  </div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)' }}>
                    {phase.phaseDescription}
                  </div>
                </div>

                {phase.exercises.map((exercise, exerciseIndex) => (
                  <div key={exerciseIndex} style={{ border: '1px solid var(--border)', marginBottom: 2, background: 'var(--black)', borderRadius: 4, overflow: 'hidden', transition: 'all 0.2s' }} onMouseEnter={(event) => { event.currentTarget.style.background = 'var(--black2)' }} onMouseLeave={(event) => { event.currentTarget.style.background = 'var(--black)' }}>
                    <div className="mg-grid-2" style={{ gridTemplateColumns: '240px 1fr' }}>
                      <div style={{ width: 240, minHeight: 160, background: 'var(--black3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, borderRight: '1px solid var(--border)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1" style={{ width: 28, opacity: 0.12 }}>
                          <rect x="2" y="4" width="20" height="16" rx="1" />
                          <polygon points="10,9 16,12 10,15" fill="currentColor" stroke="none" opacity="0.5" />
                        </svg>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'var(--silver4)', textTransform: 'uppercase' }}>
                          {exercise.isFoamRoll ? 'FOAM ROLL' : 'VIDEO'}
                        </div>
                      </div>

                      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--silver4)', textTransform: 'uppercase' }}>
                          {String(exerciseIndex + 1).padStart(2, '0')} / {phaseStyle.label}
                        </div>
                        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--white)', lineHeight: 1.3, letterSpacing: 2 }}>
                          {exercise.name}
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: 'var(--cyan)', textTransform: 'uppercase' }}>
                          {exercise.targetArea}
                        </div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver)', lineHeight: 1.8 }}>
                          {exercise.rationale}
                        </div>

                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--black3)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: 30, fontFamily: "'Syncopate',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', alignSelf: 'flex-start', marginTop: 4 }}>
                          {exercise.holdSeconds ? (
                            <>
                              {exercise.sets} SETS <span style={{ color: 'var(--cyan)', fontSize: 14 }}>×</span> <span style={{ color: 'var(--silver3)', fontSize: 9, letterSpacing: 3 }}>{exercise.holdSeconds}s EACH</span>
                            </>
                          ) : (
                            <>
                              {exercise.sets} SETS <span style={{ color: 'var(--cyan)', fontSize: 14 }}>×</span> <span style={{ color: 'var(--silver3)', fontSize: 9, letterSpacing: 3 }}>{exercise.reps} REPS</span>
                            </>
                          )}
                        </div>

                        {exercise.holdSeconds && <ExerciseTimer sets={exercise.sets} holdSeconds={exercise.holdSeconds} />}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}

          {routine.evidenceSummary && (
            <div style={{ border: '1px solid var(--border)', padding: '28px 32px', marginTop: 40, background: 'var(--black2)', borderLeft: '2px solid var(--cyan3)', borderRadius: 4 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'var(--cyan3)', marginBottom: 16, textTransform: 'uppercase' }}>
                {'// Evidence Base'}
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver)', lineHeight: 1.8, marginBottom: 20 }}>
                {routine.evidenceSummary}
              </div>
              {studies.length > 0 && (
                <>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'var(--silver4)', marginBottom: 12, textTransform: 'uppercase', paddingTop: 16, borderTop: '1px solid var(--border2)' }}>
                    {'// References'}
                  </div>
                  {studies.map((study, index) => (
                    <div key={index} style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--silver3)', lineHeight: 1.8, letterSpacing: 0.3, paddingLeft: 16, position: 'relative', marginBottom: 4 }}>
                      <span style={{ position: 'absolute', left: 0, color: 'var(--cyan3)' }}>-</span>
                      {study}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: '52px 0', flexWrap: 'wrap' }}>
            <button className="btn-outline" onClick={() => router.push('/dashboard')}>HOME</button>
            <button className="btn-primary" onClick={() => router.push(builderHref)}>{builderLabel}</button>
          </div>
        </div>
      </main>
    </>
  )
}
