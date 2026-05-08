'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import {
  IconBalance,
  IconBattery,
  IconHinge,
  IconHips,
  IconLunge,
  IconPerformance,
  IconResults,
  IconRoutine,
  IconShoulders,
  IconSpine,
  IconSquat,
} from '@/components/Icons'
import { createClient } from '@/lib/supabase/client'
import { MAX_SAVED_WORKOUTS, readSavedWorkouts, removeWorkoutFromLibrary } from '@/lib/saved-workouts'
import { deriveScreeningSnapshot } from '@/lib/screening-cloud-v2'
import { readStoredScreening } from '@/lib/screening-storage'

const UC = 'uppercase' as const
const CA = 'center' as const

type ScreeningResult = {
  id: string
  overall_score: number
  hip_score: number
  shoulder_score: number
  spine_score: number
  created_at?: string | null
  completed_at?: string | null
}

type BatteryResult = {
  id: string
  total_score: number
  max_score: number
  scores: Record<string, number>
  assessed_at?: string | null
  created_at?: string | null
}

type RoutineSummary = {
  id: number
  title: string
  sport: string | null
  areas: string[]
  duration_minutes: number
  goal: string | null
  created_at: string
}

function scoreColor(pct: number) {
  if (pct >= 80) return '#00b4d8'
  if (pct >= 60) return '#4ac8e8'
  if (pct >= 40) return '#e8a94a'
  return '#e74c3c'
}

function scoreLabel(pct: number) {
  if (pct >= 80) return 'EXCELLENT'
  if (pct >= 60) return 'GOOD'
  if (pct >= 40) return 'FAIR'
  return 'NEEDS WORK'
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getAssessmentDate(entry: { assessed_at?: string | null; created_at?: string | null }) {
  return entry.assessed_at || entry.created_at || new Date().toISOString()
}

function getScreeningDate(entry: ScreeningResult) {
  return entry.completed_at || entry.created_at || new Date().toISOString()
}

function formatRoutineFocus(routine: RoutineSummary) {
  if (routine.sport) return routine.sport
  if (routine.areas.length === 1) return routine.areas[0]
  if (routine.areas.length === 2) return `${routine.areas[0]} + ${routine.areas[1]}`
  return 'General mobility'
}

function regionDeltaLabel(delta: number) {
  if (delta > 0) return `improved +${delta}%`
  if (delta < 0) return `declined ${delta}%`
  return 'held steady'
}

function compareScreeningAreas(current: ScreeningResult, previous: ScreeningResult) {
  const deltas = [
    { label: 'Hips', delta: current.hip_score - previous.hip_score },
    { label: 'Shoulders', delta: current.shoulder_score - previous.shoulder_score },
    { label: 'Spine', delta: current.spine_score - previous.spine_score },
  ].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

  return {
    strongest: deltas[0],
    secondary: deltas[1],
  }
}

const BATTERY_LABELS: Record<string, string> = {
  deep_squat: 'Deep Squat',
  hip_hinge: 'Hip Hinge',
  shoulder_press: 'Shoulder Press',
  single_leg_balance: 'Single-Leg Balance',
  lunge: 'Inline Lunge',
  rotation: 'Seated Rotation',
  push_up_control: 'Push-Up Control',
}

const BATTERY_ICONS = {
  deep_squat: IconSquat,
  hip_hinge: IconHinge,
  shoulder_press: IconBattery,
  single_leg_balance: IconBalance,
  lunge: IconLunge,
  rotation: IconBattery,
  push_up_control: IconPerformance,
}

function batteryPriority(scores: Record<string, number>) {
  const tests = Object.entries(scores)
    .map(([id, score]) => ({ id, score: score as number }))
    .sort((a, b) => a.score - b.score)

  if (tests.length === 0) {
    return null
  }

  const lowest = tests[0].score
  const highest = tests[tests.length - 1].score
  const lowestTests = tests.filter((test) => test.score === lowest)

  if (highest - lowest <= 1 && lowestTests.length >= 3) {
    return {
      label: 'Balanced movement profile',
      score: (lowest / 3) * 100,
      color: scoreColor((lowest / 3) * 100),
      action: 'Scores are similar across the battery, so keep your next block balanced rather than chasing one single pattern.',
    }
  }

  const worst = tests[0]
  const pct = (worst.score / 3) * 100
  return {
    label: BATTERY_LABELS[worst.id] || worst.id,
    score: pct,
    color: scoreColor(pct),
    action: 'Include this movement pattern in your current training block.',
  }
}

export default function ResultsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [screeningHistory, setScreeningHistory] = useState<ScreeningResult[]>([])
  const [batteryHistory, setBatteryHistory] = useState<BatteryResult[]>([])
  const [routineHistory, setRoutineHistory] = useState<RoutineSummary[]>([])
  const [libraryBusyId, setLibraryBusyId] = useState<number | null>(null)
  const [libraryError, setLibraryError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth')
        return
      }
      const uid = session.user.id
      const accessToken = session.access_token

      const [{ data: screening }, routinesResult] = await Promise.all([
        supabase.from('screening_questionnaires').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(10),
        readSavedWorkouts(accessToken).then((data) => ({ data })).catch(() => ({ data: [] as RoutineSummary[] })),
      ])

      const cloudHistory = (screening || [])
        .map((item) => deriveScreeningSnapshot(item))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .map((item) => ({
          id: item.id,
          overall_score: item.overall_score,
          hip_score: item.hip_score,
          shoulder_score: item.shoulder_score,
          spine_score: item.spine_score,
          created_at: item.created_at || null,
          completed_at: item.completed_at || null,
        }))

      setScreeningHistory(cloudHistory)

      if (cloudHistory.length === 0) {
        const localSnapshot = readStoredScreening()
        if (localSnapshot) {
          setScreeningHistory([{
            id: 'local-screening',
            overall_score: localSnapshot.overall_score,
            hip_score: localSnapshot.hip_score,
            shoulder_score: localSnapshot.shoulder_score,
            spine_score: localSnapshot.spine_score,
            created_at: localSnapshot.created_at,
            completed_at: null,
          }])
        }
      }
      setBatteryHistory([])
      const routines = (routinesResult?.data || []) as RoutineSummary[]
      setRoutineHistory(routines)
      setLoading(false)
    }

    void load()
  }, [router, supabase])

  async function repeatSavedWorkout(routineId: number) {
    setLibraryBusyId(routineId)
    setLibraryError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        throw new Error('Sign in to reopen saved workouts.')
      }

      const response = await fetch(`/api/routines/${routineId}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not reopen saved workout.')
      }

      localStorage.setItem('mg_routine', JSON.stringify(payload))
      router.push('/routine')
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : 'Could not reopen saved workout.')
    } finally {
      setLibraryBusyId(null)
    }
  }

  async function deleteSavedWorkout(routineId: number) {
    setLibraryBusyId(routineId)
    setLibraryError('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      if (!accessToken) {
        throw new Error('Sign in to manage saved workouts.')
      }

      await removeWorkoutFromLibrary(accessToken, routineId)
      setRoutineHistory((prev) => prev.filter((routine) => routine.id !== routineId))
    } catch (error) {
      setLibraryError(error instanceof Error ? error.message : 'Could not remove saved workout.')
    } finally {
      setLibraryBusyId(null)
    }
  }

  const latestScreening = screeningHistory[0] || null
  const screeningTrend = screeningHistory.slice(0, 3)
  const latestTrendComparison = screeningTrend.length > 1 ? compareScreeningAreas(screeningTrend[0], screeningTrend[1]) : null
  const latestBattery = batteryHistory[0] || null
  const priorities: { label: string; score: number; color: string; action: string }[] = []

  if (latestScreening) {
    const regions = [
      { label: 'Hip Mobility', score: latestScreening.hip_score },
      { label: 'Shoulder Mobility', score: latestScreening.shoulder_score },
      { label: 'Spinal Mobility', score: latestScreening.spine_score },
    ]
    regions.sort((a, b) => a.score - b.score)
    priorities.push({
      label: regions[0].label,
      score: regions[0].score,
      color: scoreColor(regions[0].score),
      action: 'Focus on this region in your next routine.',
    })
  }

  if (latestBattery && latestBattery.scores) {
    const priority = batteryPriority(latestBattery.scores)
    if (priority) {
      priorities.push({
        label: priority.label,
        score: priority.score,
        color: priority.color,
        action: priority.action,
      })
    }
  }

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ position: 'relative', zIndex: 2, paddingTop: 64, textAlign: CA, padding: '120px 40px' }}>
          <div className="loading-ring" />
          <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, letterSpacing: 4, color: 'var(--silver3)' }}>LOADING</p>
        </div>
      </>
    )
  }

  const hasNoData = !latestScreening && !latestBattery && routineHistory.length === 0
  const showBattery = false
  const resultsIntro = showBattery
    ? 'Your mobility screening and movement battery scores over time.'
    : 'Your mobility screening scores and baseline progress.'
  const emptyStateCopy = showBattery
    ? 'Complete your mobility screening and movement battery to see your scores here.'
    : 'Complete your mobility screening to see your mobility score here.'

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
        <div className="mg-page-shell" style={{ maxWidth: 1600 }}>
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Mobility Profile</p>
          <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(40px, 10vw, 72px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 16 }}>YOUR RESULTS</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4vw, 22px)', color: 'var(--silver2)', marginBottom: 64, lineHeight: 1.6 }}>
            {resultsIntro}
          </p>

          {hasNoData && (
            <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '80px 48px', textAlign: CA, marginBottom: 48 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}><IconResults size={42} color="var(--cyan)" /></div>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 16 }}>NO DATA YET</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, color: 'var(--silver2)', marginBottom: 40, lineHeight: 1.6 }}>
                {emptyStateCopy}
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: CA, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => router.push('/screening')}>START SCREENING</button>
                {showBattery && <button className="btn-outline" onClick={() => router.push('/battery')}>MOVEMENT BATTERY</button>}
              </div>
            </div>
          )}

          {(latestScreening || latestBattery || routineHistory.length > 0) && (
            <>
              <div className={latestScreening && latestBattery ? 'mg-grid-2' : ''} style={{ display: 'grid', gridTemplateColumns: latestScreening && latestBattery ? undefined : '1fr', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 2 }}>
                {latestScreening && (
                  <div style={{ background: 'var(--black2)', padding: '56px 48px', textAlign: CA }}>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 24, textTransform: UC }}>Mobility Screening</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(72px, 18vw, 120px)', fontWeight: 700, color: scoreColor(latestScreening.overall_score), lineHeight: 1, letterSpacing: 4 }}>{latestScreening.overall_score}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 5, color: 'var(--silver2)', marginTop: 12 }}>OVERALL SCORE</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 4, color: scoreColor(latestScreening.overall_score), marginTop: 14 }}>{scoreLabel(latestScreening.overall_score)}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: 'var(--silver4)', marginTop: 16 }}>{formatDate(getScreeningDate(latestScreening))}</p>
                  </div>
                )}

                {latestBattery && (
                  <div style={{ background: 'var(--black2)', padding: '56px 48px', textAlign: CA }}>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 24, textTransform: UC }}>Movement Battery</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(72px, 18vw, 120px)', fontWeight: 700, color: scoreColor((latestBattery.total_score / latestBattery.max_score) * 100), lineHeight: 1, letterSpacing: 4 }}>{latestBattery.total_score}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 5, color: 'var(--silver2)', marginTop: 12 }}>OUT OF {latestBattery.max_score}</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 4, color: scoreColor((latestBattery.total_score / latestBattery.max_score) * 100), marginTop: 14 }}>{scoreLabel((latestBattery.total_score / latestBattery.max_score) * 100)}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: 'var(--silver4)', marginTop: 16 }}>{formatDate(getAssessmentDate(latestBattery))}</p>
                  </div>
                )}
              </div>

              {latestScreening && (
                <div className="mg-grid-3" style={{ gap: 2, background: 'var(--border)', border: '1px solid var(--border)', borderTop: 'none', marginBottom: 2 }}>
                  {[
                    { label: 'Hips', score: latestScreening.hip_score, Icon: IconHips },
                    { label: 'Shoulders', score: latestScreening.shoulder_score, Icon: IconShoulders },
                    { label: 'Spine', score: latestScreening.spine_score, Icon: IconSpine },
                  ].map((region) => (
                    <div key={region.label} style={{ background: 'var(--black2)', padding: '40px 24px', textAlign: CA }}>
                      <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><region.Icon size={42} color={scoreColor(region.score)} /></span>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 3, color: 'var(--silver)', marginBottom: 20, textTransform: UC }}>{region.label}</p>
                      <div style={{ height: 3, background: 'var(--silver4)', marginBottom: 14, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${region.score}%`, background: scoreColor(region.score), transition: 'width 1.2s ease' }} />
                      </div>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 44, color: scoreColor(region.score), marginBottom: 8, letterSpacing: 2 }}>{region.score}<span style={{ fontSize: 18, color: 'var(--silver3)' }}>%</span></p>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, letterSpacing: 3, color: scoreColor(region.score), textTransform: UC }}>{scoreLabel(region.score)}</p>
                    </div>
                  ))}
                </div>
              )}

              {screeningTrend.length > 0 && (
                <div style={{ marginTop: 28, marginBottom: 48 }}>
                  <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 20, textTransform: UC }}>Screening Trend</p>
                  <div className="mg-grid-2" style={{ gap: 14 }}>
                    <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '26px 24px' }}>
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 18, textTransform: UC }}>
                        Last 3 Screenings
                      </div>
                      <div style={{ display: 'grid', gap: 14 }}>
                        {screeningTrend.map((item, index) => (
                          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '100px minmax(0,1fr) 58px', gap: 14, alignItems: 'center' }}>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: 'var(--silver3)', textTransform: UC }}>
                              {formatDate(getScreeningDate(item))}
                            </div>
                            <div style={{ height: 3, background: 'var(--silver4)', position: 'relative' }}>
                              <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${item.overall_score}%`, background: scoreColor(item.overall_score) }} />
                            </div>
                            <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, color: scoreColor(item.overall_score), textAlign: 'right' as const }}>
                              {item.overall_score}
                            </div>
                            {index === 0 && (
                              <div style={{ gridColumn: '1 / -1', fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'var(--cyan)', textTransform: UC }}>
                                latest result
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '26px 24px' }}>
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 18, textTransform: UC }}>
                        Direction Of Change
                      </div>
                      {latestTrendComparison ? (
                        <div style={{ display: 'grid', gap: 14 }}>
                          <div style={{ borderLeft: `4px solid ${latestTrendComparison.strongest.delta >= 0 ? '#43d17a' : '#e8a94a'}`, paddingLeft: 14 }}>
                            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--white)', lineHeight: 1.6 }}>
                              {latestTrendComparison.strongest.label} {regionDeltaLabel(latestTrendComparison.strongest.delta)}
                            </div>
                          </div>
                          <div style={{ borderLeft: `4px solid ${latestTrendComparison.secondary.delta >= 0 ? '#43d17a' : '#e8a94a'}`, paddingLeft: 14 }}>
                            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.6 }}>
                              {latestTrendComparison.secondary.label} {regionDeltaLabel(latestTrendComparison.secondary.delta)}
                            </div>
                          </div>
                          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7 }}>
                            Compared with the previous screening on {formatDate(getScreeningDate(screeningTrend[1]))}.
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7 }}>
                          Complete another screening to start seeing which areas are improving or declining over time.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {latestBattery && latestBattery.scores && (
                <div className="mg-grid-5" style={{ gap: 2, background: 'var(--border)', border: '1px solid var(--border)', borderTop: 'none', marginBottom: 48 }}>
                  {Object.entries(latestBattery.scores).map(([id, value]) => {
                    const score = value as number
                    const pct = (score / 3) * 100
                    const BatteryIcon = BATTERY_ICONS[id as keyof typeof BATTERY_ICONS] || IconBattery
                    return (
                      <div key={id} style={{ background: 'var(--black2)', padding: '36px 16px', textAlign: CA }}>
                        <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}><BatteryIcon size={34} color={scoreColor(pct)} /></span>
                        <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--silver)', marginBottom: 16, textTransform: UC }}>{BATTERY_LABELS[id] || id}</p>
                        <div style={{ height: 3, background: 'var(--silver4)', marginBottom: 12, position: 'relative' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${pct}%`, background: scoreColor(pct), transition: 'width 1.2s ease' }} />
                        </div>
                        <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 40, fontWeight: 700, color: scoreColor(pct), marginBottom: 6, letterSpacing: 2 }}>{score}<span style={{ fontSize: 16, color: 'var(--silver3)' }}>/3</span></p>
                        <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 9, letterSpacing: 3, color: scoreColor(pct), textTransform: UC }}>{scoreLabel(pct)}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {priorities.length > 0 && (
                <>
                  <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 24, textTransform: UC }}>Priority Recommendations</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 48 }}>
                    {priorities.map((priority, index) => (
                      <div key={index} style={{ borderLeft: `6px solid ${priority.color}`, border: `1px solid ${priority.color}30`, background: 'var(--black2)', padding: '32px 24px' }} className="mg-assessment-priority-card">
                        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 48, fontWeight: 700, color: priority.color, minWidth: 80, textAlign: CA }}>
                          {Math.round(priority.score)}<span style={{ fontSize: 20 }}>%</span>
                        </div>
                        <div>
                          <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 10 }}>{priority.label}</p>
                          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, color: 'var(--silver2)', lineHeight: 1.6 }}>{priority.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div style={{ marginBottom: 48 }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 24, textTransform: UC }}>Saved Workouts</p>
                <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '28px 30px' }}>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.75, marginBottom: routineHistory.length > 0 || libraryError ? 18 : 0 }}>
                    Star only the workouts you want to keep. You can save up to {MAX_SAVED_WORKOUTS} workouts in your repeat library.
                  </div>
                  {libraryError && (
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#ff8f8f', lineHeight: 1.6, marginBottom: 16 }}>
                      {libraryError}
                    </div>
                  )}
                  {routineHistory.length > 0 ? (
                    <div style={{ display: 'grid', gap: 12 }}>
                      {routineHistory.map((routine, index) => (
                        <div key={routine.id} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', gap: 14, alignItems: 'start', paddingBottom: index === routineHistory.length - 1 ? 0 : 12, borderBottom: index === routineHistory.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.08)' }}>
                          <span style={{ display: 'flex', marginTop: 2 }}>
                            <IconRoutine size={18} color="var(--cyan)" />
                          </span>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                              <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 2, color: 'var(--white)' }}>
                                {routine.title}
                              </div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: 'var(--silver3)', textTransform: UC }}>
                                {formatDate(routine.created_at)}
                              </div>
                            </div>
                            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.65 }}>
                              {formatRoutineFocus(routine)} · {routine.goal || 'balanced'} · {routine.duration_minutes} min
                            </div>
                            <div className="mg-mobile-stack" style={{ marginTop: 12 }}>
                              <button className="btn-outline" onClick={() => void repeatSavedWorkout(routine.id)} disabled={libraryBusyId === routine.id}>
                                {libraryBusyId === routine.id ? 'OPENING...' : 'REPEAT WORKOUT'}
                              </button>
                              <button className="btn-outline" onClick={() => void deleteSavedWorkout(routine.id)} disabled={libraryBusyId === routine.id}>
                                REMOVE FROM SAVED
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'var(--silver2)', lineHeight: 1.7 }}>
                      Your saved workouts will appear here once you finish a workout and star it for later.
                    </div>
                  )}
                </div>
              </div>

              {screeningHistory.length > 1 && (
                <div style={{ marginBottom: 48 }}>
                  <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 24, textTransform: UC }}>Screening History</p>
                  <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '32px 36px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {screeningHistory.map((item, index) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: 'var(--silver3)', minWidth: 100 }}>{formatDate(getScreeningDate(item))}</p>
                          <div style={{ flex: 1, height: 3, background: 'var(--silver4)', position: 'relative' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${item.overall_score}%`, background: scoreColor(item.overall_score) }} />
                          </div>
                          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: scoreColor(item.overall_score), minWidth: 48, textAlign: 'right' as const }}>{item.overall_score}</p>
                          {index === 0 && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'var(--cyan)', background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', padding: '3px 8px' }}>LATEST</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => router.push('/quiz')}>BUILD ROUTINE</button>
                <button className="btn-outline" onClick={() => router.push('/screening')}>RETAKE SCREENING</button>
                {showBattery && <button className="btn-outline" onClick={() => router.push('/battery')}>RETAKE BATTERY</button>}
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>DASHBOARD</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
