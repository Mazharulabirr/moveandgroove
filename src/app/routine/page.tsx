'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import PreSessionReadinessModal from '@/components/PreSessionReadinessModal'
import { getExerciseVideo, getExerciseVideoEmbedUrl, getExerciseVideoWatchUrl } from '@/lib/exercise-videos'
import type { ReadinessAdjustmentSnapshot } from '@/lib/readiness'
import { pickRoutineBackground } from '@/lib/routine-backgrounds'
import { createClient } from '@/lib/supabase/client'
import { hasPreSessionCheckinToday } from '@/lib/session-flow'

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
  readiness?: ReadinessAdjustmentSnapshot | null
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
  const [activePhaseIndex, setActivePhaseIndex] = useState(0)
  const [sessionFinished, setSessionFinished] = useState(false)
  const [showReadinessModal, setShowReadinessModal] = useState(false)
  const [hasTodayReadiness, setHasTodayReadiness] = useState(false)
  const [completedSets, setCompletedSets] = useState<Record<number, number>>({})

  useEffect(() => {
    if (!routine) {
      router.push('/quiz')
    }
  }, [routine, router])

  useEffect(() => {
    setActivePhaseIndex(0)
    setSessionFinished(false)
    setCompletedSets({})
  }, [routine])

  useEffect(() => {
    async function loadReadiness() {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) {
        return
      }

      try {
        const ready = await hasPreSessionCheckinToday(supabase as never, uid)
        setHasTodayReadiness(ready)
      } catch (error) {
        console.error(error)
      }
    }

    void loadReadiness()
  }, [supabase])

  const sportLabel = storedMeta?.sport ? storedMeta.sport.toUpperCase() : null
  const areasLabel = storedMeta?.areas && storedMeta.areas.length > 0 ? storedMeta.areas.map((area) => area.toUpperCase()).join(' / ') : 'FULL BODY'
  const builderHref = storedMeta?.source === 'recovery' ? '/recovery' : '/quiz'
  const builderLabel = storedMeta?.source === 'recovery' ? 'REGENERATE RECOVERY' : 'GENERATE NEW ROUTINE'
  const routineBackground = pickRoutineBackground({
    sport: storedMeta?.sport,
    areas: storedMeta?.areas,
  })
  const isSaved = savedId !== null
  const totalExerciseCount = routine ? routine.phases.reduce((sum, phase) => sum + phase.exercises.length, 0) : 0
  const totalCompletedSets = routine
    ? routine.phases.reduce((sum, phase, phaseIndex) => {
        let runningIndexBeforePhase = 0
        for (let i = 0; i < phaseIndex; i += 1) {
          runningIndexBeforePhase += routine.phases[i].exercises.length
        }

        return sum + phase.exercises.reduce((phaseSum, exercise, exerciseIndex) => {
          const flatIndex = runningIndexBeforePhase + exerciseIndex
          return phaseSum + Math.min(completedSets[flatIndex] || 0, exercise.sets)
        }, 0)
      }, 0)
    : 0
  const totalSetCount = routine
    ? routine.phases.reduce((sum, phase) => sum + phase.exercises.reduce((phaseSum, exercise) => phaseSum + exercise.sets, 0), 0)
    : 0

  const studies = useMemo(
    () => (routine ? [...new Set(routine.phases.flatMap((phase) => phase.exercises).map((exercise) => exercise.study).filter(Boolean))] : []),
    [routine],
  )
  const featuredEvidence = useMemo(
    () => (routine
      ? routine.phases
        .flatMap((phase) =>
          phase.exercises
            .filter((exercise) => exercise.study)
            .map((exercise) => ({
              pillar: phase.pillar,
              exerciseName: exercise.name,
              rationale: exercise.rationale,
              study: exercise.study,
            })))
        .filter((item, index, items) => items.findIndex((entry) => entry.study === item.study) === index)
        .slice(0, 2)
      : []),
    [routine],
  )
  const sidebarStudies = useMemo(() => studies.slice(0, 4), [studies])

  function scrollToEvidence() {
    if (typeof window === 'undefined') return
    const section = document.getElementById('routine-evidence-section')
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function isPhaseComplete(phaseIndex: number) {
    if (!routine) return false

    let runningIndexBeforePhase = 0
    for (let i = 0; i < phaseIndex; i += 1) {
      runningIndexBeforePhase += routine.phases[i].exercises.length
    }

    return routine.phases[phaseIndex].exercises.every((exercise, exerciseIndex) => {
      const flatIndex = runningIndexBeforePhase + exerciseIndex
      return (completedSets[flatIndex] || 0) >= exercise.sets
    })
  }

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

  function completeExerciseSet(phaseIndex: number, index: number, totalSets: number) {
    if (phaseIndex !== activePhaseIndex || sessionFinished) {
      return
    }

    setCompletedSets((prev) => {
      if ((prev[index] || 0) >= totalSets) {
        return prev
      }

      const nextCompleted = Math.min((prev[index] || 0) + 1, totalSets)
      const next = { ...prev, [index]: nextCompleted }

      const phaseExercises = routine?.phases[phaseIndex].exercises || []
      let runningIndexBeforePhase = 0
      for (let i = 0; i < phaseIndex; i += 1) {
        runningIndexBeforePhase += routine?.phases[i].exercises.length || 0
      }

      const phaseDone = phaseExercises.every((exercise, exerciseIndex) => {
        const flatIndex = runningIndexBeforePhase + exerciseIndex
        const completed = flatIndex === index ? nextCompleted : (next[flatIndex] || 0)
        return completed >= exercise.sets
      })

      if (phaseDone) {
        const nextPhaseIndex = phaseIndex + 1
        if (!routine || nextPhaseIndex >= routine.phases.length) {
          setSessionFinished(true)
        } else {
          setActivePhaseIndex(nextPhaseIndex)
        }
      }

      return next
    })
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
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: '#000' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${routineBackground.image})`,
            backgroundSize: 'min(1080px, 80vw) auto',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: routineBackground.position || 'center 16%',
            opacity: 0.38,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.6) 0%,rgba(0,0,0,0.58) 50%,rgba(0,0,0,0.78) 100%)' }} />
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
              {storedMeta?.readiness && storedMeta.readiness.modificationMode !== 'normal' && (
                <div style={{ marginTop: 16, maxWidth: 620, border: '1px solid rgba(0,180,216,0.18)', background: 'rgba(0,180,216,0.06)', padding: '14px 16px' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--cyan)', marginBottom: 8, textTransform: 'uppercase' }}>
                    {'// Today’s Readiness Adjustment'}
                  </div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.7 }}>
                    {storedMeta.readiness.userMessage}
                  </div>
                </div>
              )}
              <div className="mg-mobile-stack" style={{ marginTop: 18, alignItems: 'center' }}>
                <button className="btn-primary" onClick={() => setShowReadinessModal(true)}>
                  PRE TRAINING READINESS CHECK
                </button>
                <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: hasTodayReadiness ? 'var(--silver2)' : 'var(--cyan)' }}>
                  {hasTodayReadiness ? 'Today’s readiness check is logged.' : 'Complete this before you start the workout.'}
                </span>
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
                <div className="mg-mobile-stack" style={{ marginTop: 14 }}>
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
            <div style={{ flexShrink: 0, width: 'min(100%, 320px)' }}>
              <div className="mg-mobile-stack" style={{ marginBottom: 16 }}>
                <button className="btn-outline" onClick={() => router.push(builderHref)}>ADJUST</button>
                <button className="btn-primary" onClick={() => router.push(builderHref)}>REGENERATE</button>
              </div>
              {sidebarStudies.length > 0 && (
                <div
                  style={{
                    border: '1px solid rgba(0,180,216,0.16)',
                    background: 'linear-gradient(180deg, rgba(12,16,22,0.96) 0%, rgba(6,8,12,0.98) 100%)',
                    padding: '18px 18px 16px',
                    position: 'sticky',
                    top: 96,
                  }}
                >
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 10 }}>
                    Papers Involved
                  </div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--silver2)', lineHeight: 1.7, marginBottom: 14 }}>
                    Evidence-backed references used in the rationale behind this workout.
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    {sidebarStudies.map((study, index) => (
                      <div
                        key={index}
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          fontSize: 10,
                          color: 'var(--silver3)',
                          lineHeight: 1.7,
                          padding: '10px 10px 10px 12px',
                          borderLeft: '2px solid rgba(0,180,216,0.35)',
                          background: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        {study}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={scrollToEvidence}
                    style={{
                      marginTop: 14,
                      width: '100%',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.12)',
                      color: 'var(--silver2)',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 9,
                      letterSpacing: 2,
                      textTransform: 'uppercase',
                    }}
                  >
                    View Full Evidence
                  </button>
                </div>
              )}
            </div>
          </div>

          {routine.phases.map((phase, phaseIndex) => {
            const phaseStyle = PHASE_STYLES[phase.pillar]
            let runningIndexBeforePhase = 0
            for (let i = 0; i < phaseIndex; i += 1) {
              runningIndexBeforePhase += routine.phases[i].exercises.length
            }
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

                {phase.exercises.map((exercise, exerciseIndex) => {
                  const flatIndex = runningIndexBeforePhase + exerciseIndex
                  const isCurrentPhase = phaseIndex === activePhaseIndex && !sessionFinished
                  const completedSetCount = Math.min(completedSets[flatIndex] || 0, exercise.sets)
                  const isDone = completedSetCount >= exercise.sets
                  const isLocked = phaseIndex > activePhaseIndex && !sessionFinished
                  const mappedVideo = exercise.isFoamRoll ? null : getExerciseVideo(exercise.name)

                  return (
                  <div
                    key={exerciseIndex}
                    style={{
                      border: isCurrentPhase ? '1px solid rgba(0,180,216,0.28)' : '1px solid var(--border)',
                      marginBottom: 2,
                      background: isLocked ? 'rgba(255,255,255,0.015)' : 'var(--black)',
                      borderRadius: 4,
                      overflow: 'hidden',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(event) => { event.currentTarget.style.background = 'var(--black2)' }}
                    onMouseLeave={(event) => { event.currentTarget.style.background = isLocked ? 'rgba(255,255,255,0.015)' : 'var(--black)' }}
                  >
                    <div className="mg-routine-exercise-row">
                      <div className="mg-routine-media" style={{ background: 'var(--black3)', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'center', gap: 12, borderRight: '1px solid var(--border)', overflow: 'hidden' }}>
                        {mappedVideo ? (
                          <>
                            <iframe
                              src={getExerciseVideoEmbedUrl(mappedVideo.youtubeVideoId)}
                              title={mappedVideo.title}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              style={{ width: '100%', minHeight: 180, border: 'none', display: 'block' }}
                            />
                            <a
                              href={getExerciseVideoWatchUrl(mappedVideo.youtubeVideoId)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 12px', textDecoration: 'none', borderTop: '1px solid var(--border)', fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'var(--cyan)', textTransform: 'uppercase' }}
                            >
                              Watch on YouTube
                            </a>
                          </>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '18px', minHeight: 180, textAlign: 'center' }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1" style={{ width: 28, opacity: 0.12 }}>
                              <rect x="2" y="4" width="20" height="16" rx="1" />
                              <polygon points="10,9 16,12 10,15" fill="currentColor" stroke="none" opacity="0.5" />
                            </svg>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'var(--silver4)', textTransform: 'uppercase' }}>
                              {exercise.isFoamRoll ? 'FOAM ROLL' : 'VIDEO'}
                            </div>
                            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, lineHeight: 1.6, color: 'var(--silver3)', maxWidth: 180 }}>
                              {exercise.isFoamRoll ? 'Map this foam-roll drill to your unlisted YouTube library when ready.' : 'No linked exercise video yet. Add a YouTube mapping for this exercise.'}
                            </div>
                          </div>
                        )}
                      </div>

                      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8, minWidth: 0 }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--silver4)', textTransform: 'uppercase' }}>
                          {String(flatIndex + 1).padStart(2, '0')} / {phaseStyle.label}
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

                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
                          {Array.from({ length: exercise.sets }).map((_, setIndex) => {
                            const checked = isDone || setIndex < completedSetCount
                            const isNextSet = !checked && setIndex === completedSetCount
                            const canTickSet = !sessionFinished && isCurrentPhase && isNextSet
                            return (
                              <button
                                key={setIndex}
                                type="button"
                                onClick={() => {
                                  if (canTickSet) completeExerciseSet(phaseIndex, flatIndex, exercise.sets)
                                }}
                                disabled={!canTickSet}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: 7,
                                  borderRadius: 999,
                                  padding: '6px 10px',
                                  border: `1px solid ${checked ? 'rgba(67,209,122,0.35)' : canTickSet ? 'rgba(0,180,216,0.4)' : 'rgba(255,255,255,0.1)'}`,
                                  background: checked ? 'rgba(67,209,122,0.08)' : canTickSet ? 'rgba(0,180,216,0.08)' : 'rgba(255,255,255,0.03)',
                                  fontFamily: "'DM Mono',monospace",
                                  fontSize: 9,
                                  letterSpacing: 2,
                                  color: checked ? '#43d17a' : canTickSet ? 'var(--cyan)' : 'var(--silver3)',
                                  textTransform: 'uppercase',
                                  cursor: canTickSet ? 'pointer' : 'default',
                                  opacity: isLocked ? 0.55 : 1,
                                }}
                              >
                                <span
                                  style={{
                                    width: 12,
                                    height: 12,
                                    borderRadius: 3,
                                    border: `1px solid ${checked ? '#43d17a' : canTickSet ? 'var(--cyan)' : 'var(--silver4)'}`,
                                    background: checked ? '#43d17a' : 'transparent',
                                    display: 'inline-block',
                                  }}
                                />
                                {`Set ${setIndex + 1}`}
                              </button>
                            )
                          })}
                        </div>

                        {exercise.holdSeconds && <ExerciseTimer sets={exercise.sets} holdSeconds={exercise.holdSeconds} />}

                        <div className="mg-mobile-stack" style={{ marginTop: 10 }}>
                          {isDone && (
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: 'var(--cyan)', textTransform: 'uppercase' }}>
                              COMPLETED
                            </span>
                          )}
                          {!isDone && isCurrentPhase && (
                            <>
                              <button className="btn-primary" onClick={() => completeExerciseSet(phaseIndex, flatIndex, exercise.sets)}>
                                {exercise.sets === 1 ? 'TICK SET COMPLETE' : `TICK SET ${completedSetCount + 1} COMPLETE`}
                              </button>
                              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.65 }}>
                                {exercise.sets === 1
                                  ? 'Tick the set chip or button once you finish this exercise.'
                                  : `${completedSetCount} of ${exercise.sets} sets completed. You can tick the next set chip on any exercise in this block and run it like a circuit.`}
                              </span>
                            </>
                          )}
                          {isLocked && (
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: 'var(--silver3)', textTransform: 'uppercase' }}>
                              LOCKED / UNLOCKS WHEN THE CURRENT BLOCK IS COMPLETED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )})}
              </div>
            )
          })}

          <div style={{ border: '1px solid rgba(0,180,216,0.18)', padding: '22px 24px', marginTop: 12, background: 'linear-gradient(180deg, rgba(0,180,216,0.05) 0%, rgba(8,10,14,0.96) 100%)' }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: 'var(--cyan)', marginBottom: 10, textTransform: 'uppercase' }}>
              Session Progress
            </div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.7 }}>
              {sessionFinished
                ? 'All exercises confirmed. Finish with your post-session check-in.'
                : `${PHASE_STYLES[routine.phases[activePhaseIndex]?.pillar || 'release'].label} block is live. Tick sets across the exercises in any order, then the next block unlocks.`}
            </div>
            {!sessionFinished && (
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: 'var(--cyan)', marginTop: 10, textTransform: 'uppercase' }}>
                {totalCompletedSets} / {totalSetCount} total sets completed
              </div>
            )}
            {sessionFinished && (
              <div style={{ marginTop: 16 }}>
                <button className="btn-primary" onClick={() => router.push('/session-checkin?type=post&autostart=1')}>
                  POST SESSION CHECK-IN
                </button>
              </div>
            )}
          </div>

          {(routine.evidenceSummary || studies.length > 0) && (
            <div
              id="routine-evidence-section"
              style={{
                border: '1px solid rgba(0,180,216,0.2)',
                padding: '32px 34px',
                marginTop: 40,
                background: 'linear-gradient(180deg, rgba(14,18,24,0.98) 0%, rgba(5,7,10,0.98) 100%)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'var(--cyan3)', marginBottom: 10, textTransform: 'uppercase' }}>
                Research Rationale
              </div>
              <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(20px,3vw,28px)', letterSpacing: 2, color: 'var(--white)', marginBottom: 16 }}>
                PAPERS BEHIND THIS SESSION
              </div>
              {routine.evidenceSummary && (
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver)', lineHeight: 1.8, marginBottom: 20, maxWidth: 820 }}>
                  {routine.evidenceSummary}
                </div>
              )}
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2.5, color: 'var(--silver4)', marginBottom: 24, textTransform: 'uppercase' }}>
                Evidence-backed programming. Trusted by practitioners. References available if you want them.
              </div>

              {featuredEvidence.length > 0 && (
                <div className="mg-grid-2" style={{ gap: 14, marginBottom: 22 }}>
                  {featuredEvidence.map((item, index) => (
                    <div
                      key={`${item.study}-${index}`}
                      style={{
                        border: '1px solid rgba(255,255,255,0.08)',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(10,12,16,0.96) 100%)',
                        padding: '16px 16px 14px',
                      }}
                    >
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 10 }}>
                        {PHASE_STYLES[item.pillar]?.label || item.pillar} / {item.exerciseName}
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--silver3)', lineHeight: 1.8 }}>
                        {item.study}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {studies.length > 0 && (
                <details style={{ marginTop: 6, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 18 }}>
                  <summary
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 9,
                      letterSpacing: 3,
                      color: 'var(--silver3)',
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      listStyle: 'none',
                    }}
                  >
                    View Full Reference List ({studies.length})
                  </summary>
                  <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
                    {studies.map((study, index) => (
                      <div
                        key={index}
                        style={{
                          fontFamily: "'DM Mono',monospace",
                          fontSize: 11,
                          color: 'var(--silver3)',
                          lineHeight: 1.8,
                          letterSpacing: 0.2,
                          padding: '10px 12px',
                          border: '1px solid rgba(255,255,255,0.06)',
                          background: 'rgba(255,255,255,0.02)',
                        }}
                      >
                        {study}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          <div className="mg-mobile-stack" style={{ justifyContent: 'center', padding: '52px 0' }}>
            <button className="btn-outline" onClick={() => router.push('/dashboard')}>HOME</button>
            <button className="btn-primary" onClick={() => router.push(builderHref)}>{builderLabel}</button>
          </div>
        </div>
      </main>
      <PreSessionReadinessModal
        open={showReadinessModal}
        allowClose
        onClose={() => setShowReadinessModal(false)}
        onComplete={() => {
          setHasTodayReadiness(true)
          setShowReadinessModal(false)
        }}
      />
    </>
  )
}
