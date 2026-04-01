'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ProGate from '@/components/ProGate'
import { createClient } from '@/lib/supabase/client'

const UC = 'uppercase' as const
const CA = 'center' as const

type ScreeningResult = {
  id: string
  overall_score: number
  hip_score: number
  shoulder_score: number
  spine_score: number
  assessed_at: string
}

type BatteryResult = {
  id: string
  total_score: number
  max_score: number
  scores: Record<string, number>
  assessed_at: string
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
  return new Date(dateStr).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

const BATTERY_LABELS: Record<string, string> = {
  deep_squat:       'Deep Squat',
  hip_hinge:        'Hip Hinge',
  shoulder_press:   'Shoulder Press',
  lunge:            'Inline Lunge',
  rotation:         'Seated Rotation',
}

const BATTERY_ICONS: Record<string, string> = {
  deep_squat:       '🏋️',
  hip_hinge:        '🔄',
  shoulder_press:   '🏅',
  lunge:            '🦵',
  rotation:         '🌀',
}

export default function ResultsPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [screeningHistory, setScreeningHistory] = useState<ScreeningResult[]>([])
  const [batteryHistory,   setBatteryHistory]   = useState<BatteryResult[]>([])
  const [loading,          setLoading]          = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth'); return }
      const uid = session.user.id

      const [{ data: screening }, { data: battery }] = await Promise.all([
        supabase.from('screening_results').select('*').eq('user_id', uid).order('assessed_at', { ascending: false }).limit(10),
        supabase.from('test_results').select('*').eq('user_id', uid).order('assessed_at', { ascending: false }).limit(10),
      ])

      setScreeningHistory(screening || [])
      setBatteryHistory(battery || [])
      setLoading(false)
    }
    load()
  }, [])

  const latestScreening = screeningHistory[0] || null
  const latestBattery   = batteryHistory[0] || null

  // Priority recommendations based on lowest scores
  const priorities: { label: string; score: number; max: number; color: string; action: string }[] = []

  if (latestScreening) {
    const regions = [
      { label: 'Hip Mobility',      score: latestScreening.hip_score,      max: 100 },
      { label: 'Shoulder Mobility', score: latestScreening.shoulder_score,  max: 100 },
      { label: 'Spinal Mobility',   score: latestScreening.spine_score,     max: 100 },
    ]
    regions.sort((a, b) => a.score - b.score)
    priorities.push({
      label:  regions[0].label,
      score:  regions[0].score,
      max:    100,
      color:  scoreColor(regions[0].score),
      action: 'Focus on this region in your next routine',
    })
  }

  if (latestBattery && latestBattery.scores) {
    const tests = Object.entries(latestBattery.scores)
      .map(([id, score]) => ({ id, score: score as number }))
      .sort((a, b) => a.score - b.score)
    if (tests.length > 0) {
      const worst = tests[0]
      priorities.push({
        label:  BATTERY_LABELS[worst.id] || worst.id,
        score:  (worst.score / 3) * 100,
        max:    100,
        color:  scoreColor((worst.score / 3) * 100),
        action: 'Include this movement pattern in your training block',
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

  const hasNoData = !latestScreening && !latestBattery

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&q=80&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
        <div className="mg-page-shell" style={{ maxWidth: 1600 }}>

          {/* Header */}
          <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Mobility Profile</p>
          <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 16 }}>YOUR RESULTS</p>
          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', marginBottom: 64, lineHeight: 1.6 }}>
            Your mobility screening and movement battery scores over time.
          </p>

          {/* No data state */}
          {hasNoData && (
            <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '80px 48px', textAlign: CA, marginBottom: 48 }}>
              <p style={{ fontSize: 48, marginBottom: 24 }}>📊</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 16 }}>NO DATA YET</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, color: 'var(--silver2)', marginBottom: 40, lineHeight: 1.6 }}>
                Complete your mobility screening and movement battery to see your scores here.
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: CA, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => router.push('/screening')}>START SCREENING →</button>
                <button className="btn-outline" onClick={() => router.push('/battery')}>MOVEMENT BATTERY →</button>
              </div>
            </div>
          )}

          {/* Current scores */}
          {(latestScreening || latestBattery) && (
            <>
              {/* Latest scores side by side */}
              <div className={latestScreening && latestBattery ? 'mg-grid-2' : ''} style={{ display: 'grid', gridTemplateColumns: latestScreening && latestBattery ? undefined : '1fr', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 2 }}>

                {/* Screening score */}
                {latestScreening && (
                  <div style={{ background: 'var(--black2)', padding: '56px 48px', textAlign: CA }}>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 24, textTransform: UC }}>Mobility Screening</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 120, fontWeight: 700, color: scoreColor(latestScreening.overall_score), lineHeight: 1, letterSpacing: 4 }}>{latestScreening.overall_score}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 5, color: 'var(--silver2)', marginTop: 12 }}>OVERALL SCORE</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 4, color: scoreColor(latestScreening.overall_score), marginTop: 14 }}>{scoreLabel(latestScreening.overall_score)}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: 'var(--silver4)', marginTop: 16 }}>{formatDate(latestScreening.assessed_at)}</p>
                  </div>
                )}

                {/* Battery score */}
                {latestBattery && (
                  <div style={{ background: 'var(--black2)', padding: '56px 48px', textAlign: CA }}>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 24, textTransform: UC }}>Movement Battery</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 120, fontWeight: 700, color: scoreColor((latestBattery.total_score / latestBattery.max_score) * 100), lineHeight: 1, letterSpacing: 4 }}>{latestBattery.total_score}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 5, color: 'var(--silver2)', marginTop: 12 }}>OUT OF {latestBattery.max_score}</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 4, color: scoreColor((latestBattery.total_score / latestBattery.max_score) * 100), marginTop: 14 }}>{scoreLabel((latestBattery.total_score / latestBattery.max_score) * 100)}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: 'var(--silver4)', marginTop: 16 }}>{formatDate(latestBattery.assessed_at)}</p>
                  </div>
                )}
              </div>

              {/* Regional breakdown */}
              {latestScreening && (
                <div className="mg-grid-3" style={{ gap: 2, background: 'var(--border)', border: '1px solid var(--border)', borderTop: 'none', marginBottom: 2 }}>
                  {[
                    { label: 'Hips',      score: latestScreening.hip_score,      icon: '🦵' },
                    { label: 'Shoulders', score: latestScreening.shoulder_score,  icon: '💪' },
                    { label: 'Spine',     score: latestScreening.spine_score,     icon: '🦴' },
                  ].map(r => (
                    <div key={r.label} style={{ background: 'var(--black2)', padding: '40px 24px', textAlign: CA }}>
                      <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>{r.icon}</span>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 3, color: 'var(--silver)', marginBottom: 20, textTransform: UC }}>{r.label}</p>
                      <div style={{ height: 3, background: 'var(--silver4)', marginBottom: 14, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: r.score + '%', background: scoreColor(r.score), transition: 'width 1.2s ease' }} />
                      </div>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 44, color: scoreColor(r.score), marginBottom: 8, letterSpacing: 2 }}>{r.score}<span style={{ fontSize: 18, color: 'var(--silver3)' }}>%</span></p>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, letterSpacing: 3, color: scoreColor(r.score), textTransform: UC }}>{scoreLabel(r.score)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Battery breakdown */}
              {latestBattery && latestBattery.scores && (
                <div className="mg-grid-5" style={{ gap: 2, background: 'var(--border)', border: '1px solid var(--border)', borderTop: 'none', marginBottom: 48 }}>
                  {Object.entries(latestBattery.scores).map(([id, val]) => {
                    const score = val as number
                    const pct   = (score / 3) * 100
                    return (
                      <div key={id} style={{ background: 'var(--black2)', padding: '36px 16px', textAlign: CA }}>
                        <span style={{ fontSize: 36, display: 'block', marginBottom: 12 }}>{BATTERY_ICONS[id] || '⚡'}</span>
                        <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: 'var(--silver)', marginBottom: 16, textTransform: UC }}>{BATTERY_LABELS[id] || id}</p>
                        <div style={{ height: 3, background: 'var(--silver4)', marginBottom: 12, position: 'relative' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: pct + '%', background: scoreColor(pct), transition: 'width 1.2s ease' }} />
                        </div>
                        <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 40, fontWeight: 700, color: scoreColor(pct), marginBottom: 6, letterSpacing: 2 }}>{score}<span style={{ fontSize: 16, color: 'var(--silver3)' }}>/3</span></p>
                        <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 9, letterSpacing: 3, color: scoreColor(pct), textTransform: UC }}>{scoreLabel(pct)}</p>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Priority recommendations */}
              {priorities.length > 0 && (
                <>
                  <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 24, textTransform: UC }}>Priority Recommendations</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 48 }}>
                    {priorities.map((p, i) => (
                      <div key={i} style={{ borderLeft: '6px solid ' + p.color, border: '1px solid ' + p.color + '30', background: 'var(--black2)', padding: '32px 40px', display: 'flex', alignItems: 'center', gap: 40 }}>
                        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 48, fontWeight: 700, color: p.color, minWidth: 80, textAlign: CA }}>
                          {Math.round(p.score)}<span style={{ fontSize: 20 }}>%</span>
                        </div>
                        <div>
                          <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 20, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 10 }}>{p.label}</p>
                          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, color: 'var(--silver2)', lineHeight: 1.6 }}>{p.action}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Score history */}
              {(screeningHistory.length > 1 || batteryHistory.length > 1) && (
                <ProGate
                  title="SCORE HISTORY"
                  description="Extended assessment history is a Pro feature. Your latest results stay visible, and Pro unlocks the deeper trend view."
                  features={['Screening history over time', 'Battery history trends', 'Progress context for planning']}
                >
                  <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 24, textTransform: UC }}>Score History</p>
                  <div className={screeningHistory.length > 1 && batteryHistory.length > 1 ? 'mg-grid-2' : ''} style={{ display: 'grid', gridTemplateColumns: screeningHistory.length > 1 && batteryHistory.length > 1 ? undefined : '1fr', gap: 2, marginBottom: 48 }}>

                    {/* Screening history */}
                    {screeningHistory.length > 1 && (
                      <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '32px 36px' }}>
                        <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 28, textTransform: UC }}>Screening History</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {screeningHistory.map((s, i) => (
                            <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: 'var(--silver3)', minWidth: 100 }}>{formatDate(s.assessed_at)}</p>
                              <div style={{ flex: 1, height: 3, background: 'var(--silver4)', position: 'relative' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: s.overall_score + '%', background: scoreColor(s.overall_score) }} />
                              </div>
                              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: scoreColor(s.overall_score), minWidth: 48, textAlign: 'right' as const }}>{s.overall_score}</p>
                              {i === 0 && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'var(--cyan)', background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', padding: '3px 8px' }}>LATEST</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Battery history */}
                    {batteryHistory.length > 1 && (
                      <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '32px 36px' }}>
                        <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 28, textTransform: UC }}>Battery History</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                          {batteryHistory.map((b, i) => {
                            const pct = Math.round((b.total_score / b.max_score) * 100)
                            return (
                              <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, color: 'var(--silver3)', minWidth: 100 }}>{formatDate(b.assessed_at)}</p>
                                <div style={{ flex: 1, height: 3, background: 'var(--silver4)', position: 'relative' }}>
                                  <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: pct + '%', background: scoreColor(pct) }} />
                                </div>
                                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, color: scoreColor(pct), minWidth: 48, textAlign: 'right' as const }}>{b.total_score}/{b.max_score}</p>
                                {i === 0 && <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'var(--cyan)', background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', padding: '3px 8px' }}>LATEST</span>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </ProGate>
              )}

              {/* CTAs */}
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => router.push('/quiz')}>BUILD ROUTINE →</button>
                <button className="btn-outline" onClick={() => router.push('/screening')}>RETAKE SCREENING</button>
                <button className="btn-outline" onClick={() => router.push('/battery')}>RETAKE BATTERY</button>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>DASHBOARD</button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
