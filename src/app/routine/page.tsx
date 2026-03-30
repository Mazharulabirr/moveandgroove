'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

interface Exercise {
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

interface Phase {
  pillar: 'prep' | 'release' | 'activation' | 'range'
  phaseDescription: string
  exercises: Exercise[]
}

interface Routine {
  routineTitle: string
  summary: string
  difficultyLevel: string
  totalExercises: number
  phases: Phase[]
  evidenceSummary: string
  savedId?: number
}

const PHASE_STYLES: Record<string, { label: string; color: string; border: string; bg: string }> = {
  prep:       { label: 'PREP',       color: 'var(--silver2)', border: 'var(--silver4)',        bg: 'var(--black3)' },
  release:    { label: 'RELEASE',    color: 'var(--silver2)', border: 'var(--silver4)',        bg: 'var(--black3)' },
  activation: { label: 'ACTIVATION', color: 'var(--white)',   border: 'rgba(200,205,212,0.25)', bg: 'var(--black4)' },
  range:      { label: 'RANGE',      color: 'var(--cyan)',    border: 'rgba(0,180,216,0.35)',  bg: 'rgba(0,180,216,0.05)' },
}

// Simple timer hook
function useTimer(sets: number, holdSeconds: number) {
  const [active, setActive]       = useState(false)
  const [currentSet, setCurrentSet] = useState(1)
  const [secondsLeft, setSecondsLeft] = useState(holdSeconds)
  const [isRest, setIsRest]       = useState(false)
  const [done, setDone]           = useState(false)
  const REST = 15

  useEffect(() => {
    if (!active || done) return
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          if (!isRest) {
            if (currentSet < sets) {
              setIsRest(true)
              return REST
            } else {
              setDone(true)
              setActive(false)
              return 0
            }
          } else {
            setIsRest(false)
            setCurrentSet(s => s + 1)
            return holdSeconds
          }
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [active, done, isRest, currentSet, sets, holdSeconds])

  function start()  { setActive(true) }
  function pause()  { setActive(false) }
  function reset()  { setActive(false); setCurrentSet(1); setSecondsLeft(holdSeconds); setIsRest(false); setDone(false) }

  return { active, currentSet, secondsLeft, isRest, done, start, pause, reset }
}

function ExerciseTimer({ sets, holdSeconds }: { sets: number; holdSeconds: number }) {
  const { active, currentSet, secondsLeft, isRest, done, start, pause, reset } = useTimer(sets, holdSeconds)
  const circ = 2 * Math.PI * 36
  const total = isRest ? 15 : holdSeconds
  const offset = circ * (1 - secondsLeft / total)

  if (done) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 10, letterSpacing: 2, color: 'var(--cyan)', padding: '8px 16px', border: '1px solid var(--cyan3)', borderRadius: 20 }}>
        ✓ COMPLETE — ALL {sets} SETS DONE
      </div>
      <button onClick={reset} style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 8, letterSpacing: 2, color: 'var(--silver3)', background: 'transparent', border: '1px solid var(--silver4)', padding: '6px 14px', borderRadius: 20, cursor: 'pointer' }}>
        ↺ REPEAT
      </button>
    </div>
  )

  if (!active && currentSet === 1 && secondsLeft === holdSeconds) return (
    <button onClick={start} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--black3)', border: '1px solid var(--cyan3)', padding: '8px 18px', borderRadius: 30, fontFamily: "'Syncopate',sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan)', cursor: 'pointer', marginTop: 8 }}>
      ▶ START TIMER
    </button>
  )

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
        <circle cx="40" cy="40" r="36" fill="none" stroke="var(--black4)" strokeWidth="4" />
        <circle cx="40" cy="40" r="36" fill="none"
          stroke={isRest ? 'var(--silver3)' : 'var(--cyan)'} strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circ}
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
  const [routine, setRoutine]   = useState<Routine | null>(null)
  const [meta, setMeta]         = useState<any>(null)

  useEffect(() => {
    const stored = localStorage.getItem('mg_routine')
    if (!stored) { router.push('/quiz'); return }
    const parsed = JSON.parse(stored)
    setRoutine(parsed.routine)
    setMeta(parsed)
  }, [])

  if (!routine) return (
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

  const sportLabel = meta?.sport ? meta.sport.toUpperCase() : null
  const areasLabel = meta?.areas?.length > 0 ? meta.areas.map((a: string) => a.toUpperCase()).join(' · ') : 'FULL BODY'

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'url(https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=1920&q=80&fit=crop&crop=center)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.75) 50%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '52px 48px' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 48, paddingBottom: 32, borderBottom: '1px solid var(--border)', gap: 24 }}>
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 12, textTransform: 'uppercase' }}>
                // MOVE&GROOVE · {new Date().toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 'clamp(30px,4vw,48px)', fontWeight: 600, color: 'var(--white)', lineHeight: 1.2, marginBottom: 16 }}>
                {routine.routineTitle}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                {[
                  `${meta?.duration} MIN`,
                  routine.difficultyLevel?.toUpperCase(),
                  `${routine.totalExercises} EXERCISES`,
                  sportLabel || areasLabel,
                ].filter(Boolean).map(tag => (
                  <span key={tag} style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'var(--silver)', border: '1px solid rgba(0,180,216,0.2)', padding: '5px 12px', textTransform: 'uppercase', background: 'var(--black2)' }}>
                    {tag}
                  </span>
                ))}
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.7, maxWidth: 560 }}>
                {routine.summary}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
              <button className="btn-outline" onClick={() => router.push('/quiz')}>← ADJUST</button>
              <button className="btn-primary" onClick={() => router.push('/quiz')}>REGENERATE</button>
            </div>
          </div>

          {/* Phases */}
          {routine.phases.map((phase, pi) => {
            const ps = PHASE_STYLES[phase.pillar] || PHASE_STYLES.release
            return (
              <div key={pi} style={{ marginBottom: 44 }}>
                {/* Phase header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--border2)' }}>
                  <div style={{
                    fontFamily: "'Syncopate',sans-serif", fontSize: 9, fontWeight: 700,
                    letterSpacing: 3, padding: '8px 20px', border: `1px solid ${ps.border}`,
                    color: ps.color, background: ps.bg, textTransform: 'uppercase',
                  }}>
                    {ps.label}
                  </div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)' }}>
                    {phase.phaseDescription}
                  </div>
                </div>

                {/* Exercises */}
                {phase.exercises.map((ex, ei) => (
                  <div key={ei} style={{ border: '1px solid var(--border)', marginBottom: 2, background: 'var(--black)', borderRadius: 4, overflow: 'hidden', transition: 'all 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--black2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--black)')}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr' }}>
                      {/* Video placeholder */}
                      <div style={{ width: 240, minHeight: 160, background: 'var(--black3)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, borderRight: '1px solid var(--border)' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" strokeWidth="1" style={{ width: 28, opacity: 0.12 }}>
                          <rect x="2" y="4" width="20" height="16" rx="1" />
                          <polygon points="10,9 16,12 10,15" fill="currentColor" stroke="none" opacity="0.5" />
                        </svg>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'var(--silver4)', textTransform: 'uppercase' }}>
                          {ex.isFoamRoll ? 'FOAM ROLL' : 'Video'}
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 8 }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--silver4)', textTransform: 'uppercase' }}>
                          {String(ei + 1).padStart(2, '0')} · {ps.label}
                        </div>
                        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--white)', lineHeight: 1.3, letterSpacing: 2 }}>
                          {ex.name}
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: 'var(--cyan)', textTransform: 'uppercase' }}>
                          {ex.targetArea}
                        </div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver)', lineHeight: 1.8 }}>
                          {ex.rationale}
                        </div>

                        {/* Prescription pill */}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'var(--black3)', border: '1px solid var(--border)', padding: '10px 20px', borderRadius: 30, fontFamily: "'Syncopate',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', alignSelf: 'flex-start', marginTop: 4 }}>
                          {ex.holdSeconds
                            ? <>{ex.sets} SETS <span style={{ color: 'var(--cyan)', fontSize: 14 }}>×</span> <span style={{ color: 'var(--silver3)', fontSize: 9, letterSpacing: 3 }}>{ex.holdSeconds}s EACH</span></>
                            : <>{ex.sets} SETS <span style={{ color: 'var(--cyan)', fontSize: 14 }}>×</span> <span style={{ color: 'var(--silver3)', fontSize: 9, letterSpacing: 3 }}>{ex.reps} REPS</span></>
                          }
                        </div>

                        {/* Timer */}
                        {ex.holdSeconds && (
                          <ExerciseTimer sets={ex.sets} holdSeconds={ex.holdSeconds} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })}

          {/* Evidence */}
          {routine.evidenceSummary && (
            <div style={{ border: '1px solid var(--border)', padding: '28px 32px', marginTop: 40, background: 'var(--black2)', borderLeft: '2px solid var(--cyan3)', borderRadius: 4 }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'var(--cyan3)', marginBottom: 16, textTransform: 'uppercase' }}>
                // Evidence Base
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver)', lineHeight: 1.8, marginBottom: 20 }}>
                {routine.evidenceSummary}
              </div>
              {routine.phases.flatMap(p => p.exercises).filter(e => e.study).length > 0 && (
                <>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 3, color: 'var(--silver4)', marginBottom: 12, textTransform: 'uppercase', paddingTop: 16, borderTop: '1px solid var(--border2)' }}>
                    // References
                  </div>
                  {[...new Set(routine.phases.flatMap(p => p.exercises).map(e => e.study).filter(Boolean))].map((study, i) => (
                    <div key={i} style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--silver3)', lineHeight: 1.8, letterSpacing: 0.3, paddingLeft: 16, position: 'relative', marginBottom: 4 }}>
                      <span style={{ position: 'absolute', left: 0, color: 'var(--cyan3)' }}>—</span>
                      {study}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* Footer */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: '52px 0', flexWrap: 'wrap' }}>
            <button className="btn-outline" onClick={() => router.push('/dashboard')}>← HOME</button>
            <button className="btn-primary" onClick={() => router.push('/quiz')}>GENERATE NEW ROUTINE</button>
          </div>

        </div>
      </main>
    </>
  )
}