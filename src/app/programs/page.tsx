'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import ProGate from '@/components/ProGate'
import { IconEnergy, IconMotivation, IconSleep, IconSoreness, IconStress } from '@/components/Icons'
import { createClient } from '@/lib/supabase/client'
import { READINESS_QUESTIONS, readinessScore } from '@/lib/readiness'

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

type ProgramLength = 4 | 8 | 12

type PlannedWeek = {
  week: number
  label: string
  sessions: number
  focus: string
  targetMinutes: number
  emphasis: string
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
  const preferredDays = new Set([1, 3, 5])

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index)
    const isoDate = dayKey(date)
    const completed = routines.filter((routine) => routine.created_at.slice(0, 10) === isoDate)
    const planned = preferredDays.has(index) && completed.length === 0 && routines.length > 0 ? [routines[index % routines.length]] : []

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

    const leadGoal = rows.reduce<Record<string, number>>((acc, routine) => {
      const key = routine.goal || 'balanced'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})

    const focus = Object.entries(leadGoal).sort((a, b) => b[1] - a[1])[0]?.[0] || 'balanced'

    return {
      week: index + 1,
      sessions: rows.length,
      totalMinutes: rows.reduce((sum, row) => sum + row.duration_minutes, 0),
      focus,
      window: `${formatShort(start)} - ${formatShort(end)}`,
    }
  })
}

function buildProgramWeeks(routines: RoutineRow[], length: ProgramLength) {
  const goals = Array.from(new Set(routines.map((routine) => routine.goal || 'balanced')))
  const focusPool = goals.length > 0 ? goals : ['balanced', 'flexibility', 'strength']
  const averageMinutes = routines.length > 0
    ? Math.round(routines.reduce((sum, routine) => sum + routine.duration_minutes, 0) / routines.length)
    : 24

  return Array.from({ length }, (_, index) => {
    const phaseCutoffOne = Math.ceil(length / 3)
    const phaseCutoffTwo = Math.ceil((length * 2) / 3)
    const label = index + 1 <= phaseCutoffOne
      ? 'FOUNDATION'
      : index + 1 <= phaseCutoffTwo
        ? 'BUILD'
        : 'PERFORM'
    const deloadWeek = (index + 1) % 4 === 0
    const sessions = deloadWeek ? 2 : 3
    const targetMinutes = deloadWeek ? Math.max(20, averageMinutes - 5) : averageMinutes + (label === 'PERFORM' ? 5 : 0)
    const focus = focusPool[index % focusPool.length]
    const emphasis = deloadWeek
      ? 'Lighter reload week to absorb the previous work.'
      : label === 'FOUNDATION'
        ? 'Build quality, control, and repeatable positions.'
        : label === 'BUILD'
          ? 'Increase consistency and layer in more challenging sessions.'
          : 'Convert gains into sharper weekly execution.'

    return {
      week: index + 1,
      label,
      sessions,
      focus,
      targetMinutes,
      emphasis,
    } satisfies PlannedWeek
  })
}

function readSavedProgramLength() {
  if (typeof window === 'undefined') {
    return 8 as ProgramLength
  }

  const stored = window.localStorage.getItem('mg_program_length')
  return stored === '4' || stored === '8' || stored === '12' ? Number(stored) as ProgramLength : 8
}

const READINESS_ICONS = {
  sleep: IconSleep,
  soreness: IconSoreness,
  energy: IconEnergy,
  stress: IconStress,
  motivation: IconMotivation,
}

export default function ProgramsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [routines, setRoutines] = useState<RoutineRow[]>([])
  const [showReadiness, setShowReadiness] = useState(false)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [programLength, setProgramLength] = useState<ProgramLength>(() => readSavedProgramLength())

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

    void loadPrograms()
  }, [router, supabase])

  useEffect(() => {
    window.localStorage.setItem('mg_program_length', String(programLength))
  }, [programLength])

  async function startSessionFromPrograms() {
    setSaving(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) {
        await supabase.from('readiness_logs').insert([
          {
            user_id: uid,
            responses: answers,
            readiness_score: readinessScore(answers),
            checked_at: new Date().toISOString(),
          },
        ])
      }
      setShowReadiness(false)
      router.push('/quiz')
    } catch (error) {
      console.error('[programs.readiness]', error)
    }

    setSaving(false)
  }

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
  const plannedWeeks = buildProgramWeeks(routines, programLength)
  const completedThisWeek = calendar.reduce((sum, day) => sum + day.completed.length, 0)
  const nextPlanned = calendar.find((day) => day.planned.length > 0)
  const readyToStart = READINESS_QUESTIONS.every((question) => answers[question.id] !== undefined)
  const planHeadline = `${programLength}-WEEK PLAN`

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.86) 0%,rgba(0,0,0,0.76) 45%,rgba(0,0,0,0.95) 100%)' }} />
      </div>
      <Header />
      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div className="mg-page-shell">
          <div className="mg-split-section" style={{ alignItems: 'flex-end', marginBottom: 40, paddingBottom: 28, borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 14, textTransform: UC }}>{'// Program Planning'}</div>
              <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(34px,6vw,64px)', fontWeight: 700, letterSpacing: 4, color: 'var(--white)', lineHeight: 1.02, marginBottom: 14 }}>
                PROGRAMS
                <br />
                AND CALENDAR
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'var(--silver2)', lineHeight: 1.75, maxWidth: 680 }}>
                Premium lets you choose between a one-off workout for today or a structured 4, 8, or 12 week block built from your recent routine history and assessment profile.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button className="btn-outline" onClick={() => router.push('/dashboard')}>DASHBOARD</button>
              <button className="btn-outline" onClick={() => router.push('/quiz')}>RANDOM WORKOUT</button>
              <button className="btn-primary" onClick={() => setShowReadiness(true)}>START PLANNED SESSION</button>
            </div>
          </div>

          <ProGate
            title="PROGRAMS + CALENDAR"
            description="Program planning, future session scheduling, and extended training history are part of Move&Groove Pro."
            features={['Weekly calendar with planned sessions', 'Four-week block structure', 'Routine history and progression context']}
          >
            {routines.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-text">No routines saved yet.<br />Generate a few sessions and your weekly programme will appear here.</div>
              </div>
            ) : (
              <>
                <section style={{ marginBottom: 28 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 14 }}>
                    <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(8,10,14,0.98) 100%)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 22px' }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--silver2)', marginBottom: 10, textTransform: UC }}>{'// Choice One'}</div>
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 8 }}>RANDOM WORKOUT</div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7, marginBottom: 16 }}>
                        Best when you just want a smart session right now without committing to a longer block.
                      </div>
                      <button className="btn-outline" onClick={() => router.push('/quiz')}>OPEN BUILDER</button>
                    </div>

                    <div style={{ background: 'linear-gradient(180deg, rgba(0,180,216,0.08) 0%, rgba(8,10,14,0.98) 100%)', border: '1px solid rgba(0,180,216,0.18)', padding: '24px 22px' }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>{'// Choice Two'}</div>
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 8 }}>PLANNED BLOCK</div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7, marginBottom: 16 }}>
                        Choose your block length, review the weekly structure, then launch each planned session through readiness.
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {([4, 8, 12] as ProgramLength[]).map((length) => {
                          const selected = programLength === length
                          return (
                            <button
                              key={length}
                              onClick={() => setProgramLength(length)}
                              style={{
                                fontFamily: "'Syncopate',sans-serif",
                                fontSize: 10,
                                fontWeight: 700,
                                letterSpacing: 2,
                                padding: '10px 14px',
                                border: selected ? '1px solid rgba(0,180,216,0.34)' : '1px solid rgba(255,255,255,0.1)',
                                background: selected ? 'rgba(0,180,216,0.1)' : 'rgba(255,255,255,0.03)',
                                color: selected ? 'var(--white)' : 'var(--silver2)',
                                cursor: 'pointer',
                              }}
                            >
                              {length} WEEKS
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                <div className="mg-grid-3" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 28 }}>
                  {[
                    { value: completedThisWeek, label: 'Completed This Week' },
                    { value: routines.length, label: 'Recent Sessions Tracked' },
                    { value: nextPlanned ? nextPlanned.label : 'REST', label: 'Next Planned Day' },
                  ].map((item) => (
                    <div key={item.label} style={{ background: 'var(--black2)', padding: '32px 28px' }}>
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 40, fontWeight: 700, color: 'var(--white)', lineHeight: 1, marginBottom: 10 }}>{item.value}</div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 3, color: 'var(--cyan)', textTransform: UC }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                <section style={{ marginBottom: 30 }}>
                  <div className="section-title" style={{ marginBottom: 18 }}>Weekly Calendar</div>
                  <div className="mg-grid-7" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
                    {calendar.map((day) => (
                      <div key={day.key} style={{ background: day.isToday ? 'rgba(0,180,216,0.05)' : 'var(--black2)', padding: '22px 18px', minHeight: 240, borderTop: day.isToday ? '2px solid var(--cyan)' : '2px solid transparent' }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: day.isToday ? 'var(--cyan)' : 'var(--silver3)', textTransform: UC, marginBottom: 6 }}>{day.label}</div>
                        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 16, fontWeight: 700, color: 'var(--white)', letterSpacing: 2, marginBottom: 16 }}>{day.dateLabel}</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {day.completed.map((routine) => (
                            <div key={`done-${routine.id}`} style={{ background: 'var(--black3)', border: '1px solid var(--border)', padding: '12px 12px 10px' }}>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: 'var(--cyan)', textTransform: UC, marginBottom: 6 }}>Completed</div>
                              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--white)', lineHeight: 1.45, marginBottom: 6 }}>{routine.title}</div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--silver3)', letterSpacing: 1.5, textTransform: UC }}>{routine.duration_minutes} MIN</div>
                            </div>
                          ))}
                          {day.planned.map((routine) => (
                            <div key={`plan-${routine.id}`} style={{ background: 'rgba(0,180,216,0.04)', border: '1px solid rgba(0,180,216,0.18)', padding: '12px 12px 10px' }}>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: 'var(--silver2)', textTransform: UC, marginBottom: 6 }}>Planned</div>
                              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--white)', lineHeight: 1.45, marginBottom: 6 }}>{routine.title}</div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--cyan)', letterSpacing: 1.5, textTransform: UC }}>{routine.goal || 'balanced'}</div>
                            </div>
                          ))}
                          {day.completed.length === 0 && day.planned.length === 0 && (
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--silver4)', letterSpacing: 2, textTransform: UC, paddingTop: 8 }}>Recovery / Rest</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={{ marginBottom: 30 }}>
                  <div className="section-title" style={{ marginBottom: 18 }}>{planHeadline}</div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.75, marginBottom: 18, maxWidth: 760 }}>
                    This is your structured premium lane. The block adapts its rhythm from your saved routine history now, and it can later become true scheduled calendar persistence once we wire the backend for full program storage.
                  </div>
                  <div className="mg-grid-4" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
                    {plannedWeeks.map((week) => (
                      <div key={week.week} style={{ background: 'var(--black2)', padding: '28px 24px' }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--cyan)', textTransform: UC, marginBottom: 12 }}>
                          Week {week.week} / {week.label}
                        </div>
                        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 10 }}>
                          {week.sessions} SESSIONS
                        </div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.65, marginBottom: 10 }}>
                          Focus: <span style={{ color: 'var(--white)', textTransform: UC }}>{week.focus}</span>
                        </div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver3)', lineHeight: 1.65, marginBottom: 16 }}>
                          {week.emphasis}
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <span className="meta-chip">{week.targetMinutes} MIN TARGET</span>
                          <span className="meta-chip">{week.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section style={{ marginBottom: 30 }}>
                  <div className="section-title" style={{ marginBottom: 18 }}>Recent 4-Week Trend</div>
                  <div className="mg-grid-4" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
                    {blocks.map((block) => (
                      <div key={block.week} style={{ background: 'var(--black2)', padding: '28px 24px' }}>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--silver2)', textTransform: UC, marginBottom: 12 }}>Week {block.week}</div>
                        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 10 }}>{block.sessions} SESSIONS</div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.65, marginBottom: 16 }}>
                          Recent emphasis: <span style={{ color: 'var(--white)', textTransform: UC }}>{block.focus}</span>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          <span className="meta-chip">{block.window}</span>
                          <span className="meta-chip">{block.totalMinutes} MIN</span>
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

      {showReadiness && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.74)', backdropFilter: 'blur(10px)', padding: '32px 16px', overflowY: 'auto' }}>
          <div style={{ maxWidth: 840, margin: '32px auto', background: 'var(--black2)', border: '1px solid var(--border)', padding: '32px 28px' }}>
            <div className="mg-split-section" style={{ alignItems: 'flex-start', marginBottom: 24 }}>
              <div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>{'// Readiness Before Session'}</div>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(24px,4vw,40px)', fontWeight: 700, letterSpacing: 3, color: 'var(--white)', lineHeight: 1.15, marginBottom: 12 }}>
                  START WITH
                  <br />
                  A QUICK CHECK-IN
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.7 }}>
                  Complete the same five readiness questions before jumping into the builder.
                </div>
              </div>
              <button className="btn-outline" onClick={() => setShowReadiness(false)}>CLOSE</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 28 }}>
              {READINESS_QUESTIONS.map((question, index) => {
                const ReadinessIcon = READINESS_ICONS[question.id as keyof typeof READINESS_ICONS]
                return (
                  <div key={question.id} style={{ border: '1px solid var(--border2)', padding: '22px 20px', background: 'var(--black3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                      <ReadinessIcon size={24} color="var(--cyan)" />
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', textTransform: UC }}>{index + 1}. {question.text}</div>
                    </div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7, marginBottom: 14 }}>{question.sub}</div>
                    <div className="mg-grid-2" style={{ gap: 10 }}>
                      {question.options.map((option) => {
                        const selected = answers[question.id] === option.value
                        return (
                          <button
                            key={option.value}
                            onClick={() => setAnswers((prev) => ({ ...prev, [question.id]: option.value }))}
                            style={{
                              background: selected ? 'rgba(0,180,216,0.08)' : 'var(--black2)',
                              color: selected ? 'var(--white)' : 'var(--silver2)',
                              border: selected ? '1px solid rgba(0,180,216,0.3)' : '1px solid var(--border)',
                              padding: '14px 16px',
                              textAlign: 'left',
                              cursor: 'pointer',
                              fontFamily: "'DM Sans',sans-serif",
                              fontSize: 15,
                            }}
                          >
                            {option.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mg-split-section" style={{ alignItems: 'center' }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: 'var(--silver3)', textTransform: UC }}>
                Readiness score will be saved to Supabase before routing to /quiz
              </div>
              <button className="btn-primary" disabled={!readyToStart || saving} onClick={startSessionFromPrograms}>
                {saving ? 'SAVING...' : 'START SESSION'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

