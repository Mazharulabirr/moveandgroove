'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Header from '@/components/Header'
import {
  IconBattery,
  IconCheckin,
  IconPrograms,
  IconRecovery,
  IconResults,
  IconRoutine,
  IconScreening,
} from '@/components/Icons'
import { createClient } from '@/lib/supabase/client'
import { getIsPro } from '@/lib/profiles'

interface Stats {
  totalSessions: number
  totalMinutes: number
  thisWeek: number
}

interface Routine {
  id: number
  title: string
  sport: string | null
  areas: string[]
  duration_minutes: number
  difficulty: string | null
  goal: string | null
  created_at: string
}

const UC = 'uppercase' as const

const QUICK_ACTIONS = [
  { Icon: IconRoutine, title: 'New Routine', sub: 'Build a sport-specific or area-focused mobility session.', badge: 'AI GENERATED', href: '/quiz' },
  { Icon: IconRecovery, title: 'Recovery Session', sub: 'Foam roll series for tissue quality and recovery.', badge: '15 ï¿½ 20 ï¿½ 30 MIN', href: '/recovery' },
  { Icon: IconScreening, title: 'Mobility Screening', sub: '11-question assessment across hips, shoulders, and spine.', badge: '3 MIN ï¿½ 11 QUESTIONS', href: '/screening' },
  { Icon: IconBattery, title: 'Movement Battery', sub: 'Five fundamental movement tests scored 0-3.', badge: '5 TESTS ï¿½ 10 MIN', href: '/battery' },
  { Icon: IconResults, title: 'My Results', sub: 'View your mobility scores and track progress over time.', badge: 'SCORE HISTORY', href: '/results' },
  { Icon: IconCheckin, title: 'Session Check-in', sub: 'Pre or post session logging for pain, energy, RPE, and feedback.', badge: 'PRE ï¿½ POST', href: '/session-checkin' },
  { Icon: IconPrograms, title: 'Programs + Calendar', sub: 'Map your weekly sessions into a rolling 4-week block.', badge: 'WEEKLY VIEW', href: '/programs' },
]

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>({ totalSessions: 0, totalMinutes: 0, thisWeek: 0 })
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)

  const loadData = useCallback(async (userId: string) => {
    try {
      const { data: progress } = await supabase.from('progress').select('*').eq('user_id', userId)

      if (progress) {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const thisWeek = progress.filter((entry) => new Date(entry.created_at) > weekAgo).length
        const totalMinutes = progress.reduce((sum: number, entry: { duration_minutes?: number }) => sum + (entry.duration_minutes || 0), 0)
        setStats({ totalSessions: progress.length, totalMinutes, thisWeek })
      }

      const { data: savedRoutines } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (savedRoutines) {
        setRoutines(savedRoutines)
      }

      setIsPro(await getIsPro(supabase as never, userId))
    } catch (error) {
      console.error(error)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/auth')
        return
      }
      setUser(session.user)
      void loadData(session.user.id)
    })
  }, [loadData, router, supabase])

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Athlete'
  const firstName = name.split(' ')[0]
  const firstNameCap = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()

  if (loading) {
    return (
      <>
        <Header />
        <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
          <div style={{ textAlign: 'center', padding: '100px 40px' }}>
            <div className="loading-ring" />
            <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, letterSpacing: 4, color: 'var(--silver3)' }}>
              LOADING
            </div>
          </div>
        </main>
      </>
    )
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: 'url(https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&q=80&fit=crop&crop=center)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 1,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.92) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div className="mg-page-shell">
          <div
            className="mg-split-section"
            style={{ alignItems: 'flex-end', marginBottom: 56, paddingBottom: 32, borderBottom: '1px solid var(--border)', gap: 24 }}
          >
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 12 }}>
                {'// Welcome Back'}
              </div>
              <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(32px,5vw,56px)', fontWeight: 700, letterSpacing: 4, color: 'var(--white)', lineHeight: 1.1 }}>
                WELCOME
                <br />
                <span style={{ color: 'var(--cyan)' }}>{firstNameCap}</span>
              </div>
            </div>
            <button className="btn-primary" onClick={() => router.push('/quiz')}>
              NEW ROUTINE
            </button>
          </div>

          <div className="mg-grid-3" style={{ gap: 1, background: 'var(--border)', marginBottom: 56, border: '1px solid var(--border)' }}>
            {[
              { val: stats.totalSessions, label: 'Total Sessions' },
              { val: stats.totalMinutes, label: 'Minutes Moved' },
              { val: stats.thisWeek, label: 'Sessions This Week' },
            ].map((item) => (
              <div key={item.label} style={{ background: 'var(--black2)', padding: '36px 28px' }}>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 56, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1, marginBottom: 8 }}>
                  {item.val}
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: 'var(--cyan)', textTransform: UC }}>
                  {item.label}
                </div>
              </div>
            ))}
          </div>

          {!isPro && (
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(0,180,216,0.06) 0%, var(--black2) 100%)',
                border: '1px solid rgba(0,180,216,0.18)',
                padding: '26px 28px',
                marginBottom: 32,
              }}
            >
              <div className="mg-split-section" style={{ alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', textTransform: UC, marginBottom: 10 }}>
                    {'// Pro Access'}
                  </div>
                  <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 8 }}>
                    UNLOCK PROGRAMS + HISTORY
                  </div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7 }}>
                    Upgrade to access the weekly calendar, four-week blocks, and extended score history.
                  </div>
                </div>
                <button className="btn-primary" onClick={() => router.push('/upgrade')}>
                  UPGRADE
                </button>
              </div>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
              gap: 1,
              background: 'var(--border)',
              border: '1px solid var(--border)',
              marginBottom: 48,
            }}
          >
            {QUICK_ACTIONS.map((action) => (
              <div
                key={action.title}
                onClick={() => router.push(action.href)}
                style={{ background: 'var(--black2)', padding: '32px 28px', cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = 'var(--black3)'
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = 'var(--black2)'
                }}
              >
                <span style={{ display: 'flex', marginBottom: 12 }}>
                  <action.Icon size={28} color="var(--cyan)" />
                </span>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 8, textTransform: UC }}>
                  {action.title}
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.6 }}>
                  {action.sub}
                </div>
                <span
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 9,
                    letterSpacing: 2,
                    color: 'var(--cyan)',
                    background: 'rgba(0,180,216,0.1)',
                    border: '1px solid rgba(0,180,216,0.2)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    display: 'inline-block',
                    marginTop: 10,
                  }}
                >
                  {action.badge}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="section-title">Saved Routines</div>
          </div>

          {routines.length === 0 ? (
            <div className="empty-state">
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                <IconRoutine size={34} color="var(--silver4)" />
              </div>
              <div className="empty-state-text">No saved routines yet.<br />Generate your first to begin.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  onClick={() => router.push(`/routine/${routine.id}`)}
                  style={{ background: 'var(--black2)', padding: 28, cursor: 'pointer', transition: 'background 0.2s', position: 'relative' }}
                  onMouseEnter={(event) => {
                    event.currentTarget.style.background = 'var(--black3)'
                  }}
                  onMouseLeave={(event) => {
                    event.currentTarget.style.background = 'var(--black2)'
                  }}
                >
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--cyan3)', marginBottom: 10, textTransform: UC }}>
                    {routine.sport ? routine.sport.toUpperCase() : (routine.areas || []).map((area) => area.toUpperCase()).join(' ï¿½ ')}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 600, color: 'var(--white)', marginBottom: 14, lineHeight: 1.3 }}>
                    {routine.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    <span className="meta-chip">{routine.duration_minutes} min</span>
                    {routine.difficulty && <span className="meta-chip">{routine.difficulty}</span>}
                    {routine.goal && <span className="meta-chip">{routine.goal}</span>}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--silver4)', letterSpacing: 1 }}>
                    {new Date(routine.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', color: 'var(--silver4)', fontSize: 20 }}>
                    ?
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}

