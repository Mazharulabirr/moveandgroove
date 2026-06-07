'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Icon, type IconName } from '@/components/Icons'
import { SPORT_PROFILES } from '@/lib/sports'
import { createClient } from '@/lib/supabase/client'

const UC = 'uppercase' as const

const AREAS: { id: string; label: string; icon: IconName; sub: string }[] = [
  { id: 'hips', label: 'Hips', icon: 'hips', sub: 'Hip flexors / adductors / glutes / rotation' },
  { id: 'shoulders', label: 'Shoulders', icon: 'shoulders', sub: 'Rotator cuff / capsule / overhead freedom' },
  { id: 'spine', label: 'Spine', icon: 'spine', sub: 'Cervical / thoracic / lumbar control' },
]

const GOALS: { id: string; label: string; icon: IconName; sub: string }[] = [
  { id: 'flexibility', label: 'More Flexibility', icon: 'mobility', sub: 'Reduce stiffness and improve freedom of movement.' },
  { id: 'strength', label: 'More Strength', icon: 'general', sub: 'Build stronger control at end range.' },
  { id: 'balanced', label: 'Balanced', icon: 'balance', sub: 'Split the plan across release, activation, and range.' },
  { id: 'performance', label: 'Performance', icon: 'performance', sub: 'Support training and sport-specific positions.' },
]

type FocusMode = 'sport' | 'area'

type WorkoutPlan = {
  id: string
  sport: string | null
  areas: string[]
  goal: string | null
  duration_weeks: number
  sessions_per_week: number
  starts_at: string | null
  created_at: string
  is_active: boolean
}

function formatDate(dateStr: string | null) {
  if (!dateStr) {
    return 'Not set'
  }

  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatPlanName(plan: Pick<WorkoutPlan, 'duration_weeks' | 'sport' | 'areas' | 'goal'>) {
  const focus = plan.sport
    ? SPORT_PROFILES.find((item) => item.id === plan.sport)?.label || plan.sport
    : plan.areas.length === 1
      ? plan.areas[0]
      : plan.areas.join(' + ')

  return `${plan.duration_weeks}-Week ${focus || 'Mobility'}`
}

export default function ProgramsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [focusMode, setFocusMode] = useState<FocusMode>('sport')
  const [sport, setSport] = useState<string | null>(SPORT_PROFILES[0]?.id || null)
  const [areas, setAreas] = useState<string[]>([])
  const [goal, setGoal] = useState<string | null>('balanced')
  const [durationWeeks, setDurationWeeks] = useState(8)
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activePlan, setActivePlan] = useState<WorkoutPlan | null>(null)

  useEffect(() => {
    async function loadActivePlan() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token

        if (!accessToken) {
          setLoading(false)
          return
        }

        const response = await fetch('/api/workout-plans', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        })

        const payload = await response.json().catch(() => null)

        if (!response.ok) {
          throw new Error(payload?.error || 'Could not load workout plan.')
        }

        setActivePlan((payload?.plan || null) as WorkoutPlan | null)
      } catch (loadError) {
        console.warn('[programs.plan]', loadError)
      } finally {
        setLoading(false)
      }
    }

    void loadActivePlan()
  }, [supabase])

  const activePlanName = useMemo(
    () => (activePlan ? formatPlanName(activePlan) : ''),
    [activePlan],
  )

  function toggleArea(id: string) {
    setAreas((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  async function savePlan() {
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Sign in required to save a programme.')
      }

      const response = await fetch('/api/workout-plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          sport: focusMode === 'sport' ? sport : null,
          areas: focusMode === 'area' ? areas : [],
          goal,
          duration_weeks: durationWeeks,
          sessions_per_week: sessionsPerWeek,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error || 'Could not save workout programme.')
      }

      setActivePlan((payload?.plan || null) as WorkoutPlan | null)
      setSuccess('Your programme is saved and ready from the dashboard.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save workout programme.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.76) 45%,rgba(0,0,0,0.95) 100%)',
          }}
        />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div className="mg-page-shell">
          <div style={{ maxWidth: 1040, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 34 }}>
              <div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 16, textTransform: UC }}>
                  {'// Programme Builder'}
                </div>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(34px,7vw,64px)', fontWeight: 700, letterSpacing: 3, color: 'var(--white)', lineHeight: 1.05, marginBottom: 18 }}>
                  START YOUR
                  <br />
                  PROGRAMME
                </div>
                <div style={{ maxWidth: 680, fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'var(--silver2)', lineHeight: 1.8 }}>
                  Build a real multi-week plan around your sport or mobility focus, choose how many sessions you want each week, and keep it visible from the dashboard.
                </div>
              </div>

              <button className="btn-outline" onClick={() => router.push('/dashboard')}>
                BACK TO DASHBOARD
              </button>
            </div>

            {activePlan && (
              <div style={{ border: '1px solid rgba(0,180,216,0.22)', background: 'rgba(0,180,216,0.08)', padding: '18px 20px', marginBottom: 24 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>
                  Current Active Plan
                </div>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 16, letterSpacing: 2, color: 'var(--white)', marginBottom: 10 }}>
                  {activePlanName}
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7 }}>
                  {activePlan.sessions_per_week} sessions per week · starts {formatDate(activePlan.starts_at)} · goal {activePlan.goal || 'balanced'}
                </div>
              </div>
            )}

            <div className="mg-grid-2" style={{ gap: 24, alignItems: 'start' }}>
              <section style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '28px 28px 30px' }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 14, textTransform: UC }}>
                  {'// Plan Settings'}
                </div>

                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 15, letterSpacing: 2, color: 'var(--white)', marginBottom: 14 }}>
                  DURATION
                </div>
                <div className="mg-grid-3" style={{ gap: 10, marginBottom: 24 }}>
                  {[4, 8, 12].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setDurationWeeks(value)}
                      style={{
                        padding: '18px 14px',
                        border: durationWeeks === value ? '1px solid rgba(0,180,216,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        background: durationWeeks === value ? 'rgba(0,180,216,0.1)' : 'rgba(255,255,255,0.03)',
                        color: durationWeeks === value ? 'var(--white)' : 'var(--silver2)',
                        cursor: 'pointer',
                        fontFamily: "'Syncopate',sans-serif",
                        fontSize: 12,
                        letterSpacing: 2,
                      }}
                    >
                      {value} WEEKS
                    </button>
                  ))}
                </div>

                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 15, letterSpacing: 2, color: 'var(--white)', marginBottom: 14 }}>
                  SESSIONS PER WEEK
                </div>
                <div className="mg-grid-3" style={{ gap: 10, marginBottom: 24 }}>
                  {[2, 3, 4].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSessionsPerWeek(value)}
                      style={{
                        padding: '18px 14px',
                        border: sessionsPerWeek === value ? '1px solid rgba(0,180,216,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        background: sessionsPerWeek === value ? 'rgba(0,180,216,0.1)' : 'rgba(255,255,255,0.03)',
                        color: sessionsPerWeek === value ? 'var(--white)' : 'var(--silver2)',
                        cursor: 'pointer',
                        fontFamily: "'Syncopate',sans-serif",
                        fontSize: 12,
                        letterSpacing: 2,
                      }}
                    >
                      {value} / WEEK
                    </button>
                  ))}
                </div>

                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 15, letterSpacing: 2, color: 'var(--white)', marginBottom: 14 }}>
                  FOCUS TYPE
                </div>
                <div className="mg-grid-2" style={{ gap: 10, marginBottom: 24 }}>
                  {[
                    { id: 'sport' as FocusMode, label: 'SPORT FOCUS' },
                    { id: 'area' as FocusMode, label: 'AREA FOCUS' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setFocusMode(option.id)}
                      style={{
                        padding: '18px 14px',
                        border: focusMode === option.id ? '1px solid rgba(0,180,216,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        background: focusMode === option.id ? 'rgba(0,180,216,0.1)' : 'rgba(255,255,255,0.03)',
                        color: focusMode === option.id ? 'var(--white)' : 'var(--silver2)',
                        cursor: 'pointer',
                        fontFamily: "'Syncopate',sans-serif",
                        fontSize: 12,
                        letterSpacing: 2,
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {focusMode === 'sport' ? (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 15, letterSpacing: 2, color: 'var(--white)', marginBottom: 14 }}>
                      SELECT SPORT
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {SPORT_PROFILES.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSport(item.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            textAlign: 'left',
                            padding: '16px 16px',
                            border: sport === item.id ? '1px solid rgba(0,180,216,0.3)' : '1px solid rgba(255,255,255,0.08)',
                            background: sport === item.id ? 'rgba(0,180,216,0.1)' : 'rgba(255,255,255,0.03)',
                            color: sport === item.id ? 'var(--white)' : 'var(--silver2)',
                            cursor: 'pointer',
                          }}
                        >
                          <Icon name={item.icon} size={20} color="var(--cyan)" />
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15 }}>{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginBottom: 24 }}>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 15, letterSpacing: 2, color: 'var(--white)', marginBottom: 14 }}>
                      SELECT AREA FOCUS
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {AREAS.map((item) => {
                        const selected = areas.includes(item.id)
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleArea(item.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'flex-start',
                              gap: 12,
                              textAlign: 'left',
                              padding: '16px 16px',
                              border: selected ? '1px solid rgba(0,180,216,0.3)' : '1px solid rgba(255,255,255,0.08)',
                              background: selected ? 'rgba(0,180,216,0.1)' : 'rgba(255,255,255,0.03)',
                              color: selected ? 'var(--white)' : 'var(--silver2)',
                              cursor: 'pointer',
                            }}
                          >
                            <Icon name={item.icon} size={20} color="var(--cyan)" />
                            <span>
                              <span style={{ display: 'block', fontFamily: "'DM Sans',sans-serif", fontSize: 15, marginBottom: 4 }}>{item.label}</span>
                              <span style={{ display: 'block', fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--silver3)', lineHeight: 1.55 }}>{item.sub}</span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 15, letterSpacing: 2, color: 'var(--white)', marginBottom: 14 }}>
                  GOAL
                </div>
                <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
                  {GOALS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setGoal(item.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        textAlign: 'left',
                        padding: '16px 16px',
                        border: goal === item.id ? '1px solid rgba(0,180,216,0.3)' : '1px solid rgba(255,255,255,0.08)',
                        background: goal === item.id ? 'rgba(0,180,216,0.1)' : 'rgba(255,255,255,0.03)',
                        color: goal === item.id ? 'var(--white)' : 'var(--silver2)',
                        cursor: 'pointer',
                      }}
                    >
                      <Icon name={item.icon} size={20} color="var(--cyan)" />
                      <span>
                        <span style={{ display: 'block', fontFamily: "'DM Sans',sans-serif", fontSize: 15, marginBottom: 4 }}>{item.label}</span>
                        <span style={{ display: 'block', fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--silver3)', lineHeight: 1.55 }}>{item.sub}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {error && (
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#ff9f9f', marginBottom: 16 }}>
                    {error}
                  </div>
                )}
                {success && (
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: '#9fffc7', marginBottom: 16 }}>
                    {success}
                  </div>
                )}

                <button className="btn-primary" onClick={() => void savePlan()} disabled={saving || loading}>
                  {saving ? 'SAVING PROGRAMME...' : 'START MY PROGRAMME'}
                </button>
              </section>

              <section style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '28px 28px 30px' }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 14, textTransform: UC }}>
                  {'// Plan Preview'}
                </div>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, letterSpacing: 2, color: 'var(--white)', marginBottom: 16 }}>
                  {formatPlanName({
                    duration_weeks: durationWeeks,
                    sport: focusMode === 'sport' ? sport : null,
                    areas: focusMode === 'area' ? areas : [],
                    goal,
                  } as WorkoutPlan)}
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    `${durationWeeks} week block`,
                    `${sessionsPerWeek} sessions per week`,
                    focusMode === 'sport'
                      ? `Sport focus: ${SPORT_PROFILES.find((item) => item.id === sport)?.label || 'Choose a sport'}`
                      : `Area focus: ${areas.length > 0 ? areas.join(' + ') : 'Choose at least one area'}`,
                    `Goal: ${goal || 'Choose a goal'}`,
                  ].map((line) => (
                    <div key={line} style={{ padding: '14px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.6 }}>
                      {line}
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 22, fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.75 }}>
                  {loading
                    ? 'Loading your current active plan...'
                    : activePlan
                      ? `Current active plan started on ${formatDate(activePlan.starts_at)} and stays visible on the dashboard until you replace it.`
                      : 'Once saved, your active programme appears on the dashboard with week progress and a quick continue button.'}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
