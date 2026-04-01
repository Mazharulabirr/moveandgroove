'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ProGate from '@/components/ProGate'
import { createClient } from '@/lib/supabase/client'

const UC = 'uppercase' as const

type RoutineRow = {
  id: number
  title: string
  goal: string | null
  sport: string | null
  areas: string[] | null
  duration_minutes: number
  created_at: string
}

type CalendarDay = {
  key: string
  label: string
  dateLabel: string
  planned: RoutineRow[]
  completed: RoutineRow[]
  isToday: boolean
}

function startOfWeek(input: Date) {
  const date = new Date(input)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function addDays(input: Date, days: number) {
  const date = new Date(input)
  date.setDate(date.getDate() + days)
  return date
}

function formatShort(date: Date) {
  return date.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' }).toUpperCase()
}

function dayKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function buildWeekCalendar(routines: RoutineRow[]) {
  const today = new Date()
  const weekStart = startOfWeek(today)
  const dayCounts = Array.from({ length: 7 }, (_, index) => {
    const dayValue = addDays(weekStart, index).getDay()
    return {
      index,
      count: routines.filter((routine) => new Date(routine.created_at).getDay() === dayValue).length,
    }
  }).sort((a, b) => b.count - a.count)

  const preferredDays = new Set(dayCounts.filter((item, index) => item.count > 0 && index < 3).map((item) => item.index))

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const isoDate = dayKey(date)
    const completed = routines.filter((routine) => routine.created_at.slice(0, 10) === isoDate)
    const planned = preferredDays.has(index) && completed.length === 0 && routines.length > 0
      ? [routines[index % routines.length]]
      : []

    return {
      key: isoDate,
      label: date.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase(),
      dateLabel: formatShort(date),
      planned,
      completed,
      isToday: isoDate === dayKey(today),
    } satisfies CalendarDay
  })
}

function buildBlockSummary(routines: RoutineRow[]) {
  const now = new Date()
  const blockStart = startOfWeek(addDays(now, -27))

  return Array.from({ length: 4 }, (_, index) => {
    const start = addDays(blockStart, index * 7)
    const end = addDays(start, 6)
    const rows = routines.filter((routine) => {
      const created = new Date(routine.created_at)
      return created >= start && created <= addDays(end, 1)
    })

    const goalCounts = rows.reduce<Record<string, number>>((acc, routine) => {
      const key = routine.goal || 'balanced'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const leadGoal = Object.entries(goalCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'balanced'

    return {
      week: index + 1,
      sessions: rows.length,
      totalMinutes: rows.reduce((sum, routine) => sum + routine.duration_minutes, 0),
      focus: leadGoal,
      window: `${formatShort(start)} - ${formatShort(end)}`,
    }
  })
}

export default function ProgramsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [routines, setRoutines] = useState<RoutineRow[]>([])

  useEffect(() => {
    async function loadPrograms() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth')
        return
      }

      const { data } = await supabase
        .from('routines')
        .select('id,title,goal,sport,areas,duration_minutes,created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(24)

      setRoutines(data || [])
      setLoading(false)
    }

    loadPrograms()
  }, [router, supabase])

  if (loading) {
    return (
      <>
        <Header />
        <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
          <div style={{ textAlign: 'center', padding: '120px 40px' }}>
            <div className="loading-ring" />
            <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, letterSpacing: 4, color: 'var(--silver3)', textTransform: UC }}>
              LOADING PROGRAMS
            </div>
          </div>
        </main>
      </>
    )
  }

  const calendar = buildWeekCalendar(routines)
  const blocks = buildBlockSummary(routines)
  const completedThisWeek = calendar.reduce((sum, day) => sum + day.completed.length, 0)
  const nextPlanned = calendar.find((day) => day.planned.length > 0)

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'url(https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=1920&q=80&fit=crop&crop=center)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.86) 0%,rgba(0,0,0,0.76) 45%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div className="mg-page-shell">
          <div className="mg-split-section" style={{ alignItems: 'flex-end', marginBottom: 40, paddingBottom: 28, borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 14, textTransform: UC }}>
                // Program Planning
              </div>
              <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(34px,6vw,64px)', fontWeight: 700, letterSpacing: 4, color: 'var(--white)', lineHeight: 1.02, marginBottom: 14 }}>
                PROGRAMS<br />AND CALENDAR
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'var(--silver2)', lineHeight: 1.75, maxWidth: 680 }}>
                Weekly planning built from your recent routine history. This version uses saved sessions in Supabase to infer your current week and active four-week block.
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn-outline" onClick={() => router.push('/dashboard')}>← DASHBOARD</button>
              <button className="btn-primary" onClick={() => router.push('/quiz')}>NEW SESSION</button>
            </div>
          </div>

          <ProGate
            title="PROGRAMS + CALENDAR"
            description="Program planning, future session scheduling, and extended training history are part of Move&Groove Pro."
            features={['Weekly calendar with planned sessions', 'Four-week block structure', 'Routine history and progression context']}
          >
            {routines.length === 0 ? (
              <div className="empty-state">
                <div style={{ fontSize: 42, marginBottom: 16, opacity: 0.35 }}>◯</div>
                <div className="empty-state-text">No routines saved yet.<br />Generate a few sessions and your weekly programme will appear here.</div>
              </div>
            ) : (
              <>
              <div className="mg-grid-3" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 28 }}>
                {[
                  { value: completedThisWeek, label: 'Completed This Week' },
                  { value: routines.length, label: 'Recent Sessions Tracked' },
                  { value: nextPlanned ? nextPlanned.label : 'REST', label: 'Next Planned Day' },
                ].map((item) => (
                  <div key={item.label} style={{ background: 'var(--black2)', padding: '32px 28px' }}>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 40, fontWeight: 700, color: 'var(--white)', lineHeight: 1, marginBottom: 10 }}>
                      {item.value}
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 3, color: 'var(--cyan)', textTransform: UC }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              <section style={{ marginBottom: 30 }}>
                <div className="section-title" style={{ marginBottom: 18 }}>Weekly Calendar</div>
                <div className="mg-grid-7" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
                  {calendar.map((day) => (
                    <div key={day.key} style={{
                      background: day.isToday ? 'rgba(0,180,216,0.05)' : 'var(--black2)',
                      padding: '22px 18px',
                      minHeight: 240,
                      borderTop: day.isToday ? '2px solid var(--cyan)' : '2px solid transparent',
                    }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: day.isToday ? 'var(--cyan)' : 'var(--silver3)', textTransform: UC, marginBottom: 6 }}>
                        {day.label}
                      </div>
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--white)', letterSpacing: 2, marginBottom: 16 }}>
                        {day.dateLabel}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {day.completed.map((routine) => (
                          <div key={`done-${routine.id}`} style={{ background: 'var(--black3)', border: '1px solid var(--border)', padding: '12px 12px 10px' }}>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: 'var(--cyan)', textTransform: UC, marginBottom: 6 }}>
                              Completed
                            </div>
                            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--white)', lineHeight: 1.45, marginBottom: 6 }}>
                              {routine.title}
                            </div>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--silver3)', letterSpacing: 1.5, textTransform: UC }}>
                              {routine.duration_minutes} MIN
                            </div>
                          </div>
                        ))}

                        {day.planned.map((routine) => (
                          <div key={`plan-${routine.id}`} style={{ background: 'rgba(0,180,216,0.04)', border: '1px solid rgba(0,180,216,0.18)', padding: '12px 12px 10px' }}>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: 'var(--silver2)', textTransform: UC, marginBottom: 6 }}>
                              Planned
                            </div>
                            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--white)', lineHeight: 1.45, marginBottom: 6 }}>
                              {routine.title}
                            </div>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--cyan)', letterSpacing: 1.5, textTransform: UC }}>
                              {routine.goal || 'balanced'}
                            </div>
                          </div>
                        ))}

                        {day.completed.length === 0 && day.planned.length === 0 && (
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--silver4)', letterSpacing: 2, textTransform: UC, paddingTop: 8 }}>
                            Recovery / Rest
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section style={{ marginBottom: 30 }}>
                <div className="section-title" style={{ marginBottom: 18 }}>4-Week Block</div>
                <div className="mg-grid-4" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
                  {blocks.map((block) => (
                    <div key={block.week} style={{ background: 'var(--black2)', padding: '28px 24px' }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--cyan)', textTransform: UC, marginBottom: 12 }}>
                        Week {block.week}
                      </div>
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 10 }}>
                        {block.sessions} SESSIONS
                      </div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.65, marginBottom: 16 }}>
                        Primary emphasis: <span style={{ color: 'var(--white)', textTransform: UC }}>{block.focus}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <span className="meta-chip">{block.window}</span>
                        <span className="meta-chip">{block.totalMinutes} MIN</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="section-title" style={{ marginBottom: 18 }}>Session History</div>
                <div style={{ border: '1px solid var(--border)', background: 'var(--black2)' }}>
                  {routines.map((routine, index) => (
                    <div key={routine.id} className="mg-grid-3" style={{
                      gap: 16,
                      padding: '20px 24px',
                      borderTop: index === 0 ? 'none' : '1px solid var(--border2)',
                      alignItems: 'center',
                    }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: 'var(--silver3)', textTransform: UC }}>
                        {new Date(routine.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                      </div>
                      <div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--white)', marginBottom: 6 }}>
                          {routine.title}
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--silver3)', letterSpacing: 2, textTransform: UC }}>
                          {routine.sport ? routine.sport : (routine.areas || []).join(' · ')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span className="meta-chip">{routine.duration_minutes} MIN</span>
                        {routine.goal && <span className="meta-chip">{routine.goal}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              </>
            )}
          </ProGate>
        </div>
      </main>
    </>
  )
}
