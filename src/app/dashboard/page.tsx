'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Stats {
  totalSessions: number
  totalMinutes: number
  thisWeek: number
}

interface Routine {
  id: number
  title: string
  sport: string
  areas: string[]
  duration_minutes: number
  difficulty: string
  goal: string
  created_at: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>({ totalSessions: 0, totalMinutes: 0, thisWeek: 0 })
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)

 useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push('/auth'); return }
      setUser(session.user)
      loadData(session.user.id)
    })
  }, [])

  async function loadData(userId: string) {
    try {
      const { data: progress } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId)

      if (progress) {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const thisWeek = progress.filter(p => new Date(p.created_at) > weekAgo).length
        const totalMinutes = progress.reduce((sum: number, p: any) => sum + (p.duration_minutes || 0), 0)
        setStats({ totalSessions: progress.length, totalMinutes, thisWeek })
      }

      const { data: savedRoutines } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (savedRoutines) setRoutines(savedRoutines)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }
const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Athlete'
const firstName = name.split(' ')[0]
const firstName_cap = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase()

  
  if (loading) return (
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

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'url(https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=1920&q=80&fit=crop&crop=center)',
        backgroundSize: 'cover', backgroundPosition: 'center', opacity: 1,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.85) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.92) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div style={{ padding: '56px 48px' }}>

          {/* Top */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
            marginBottom: 56, paddingBottom: 32, borderBottom: '1px solid var(--border)', gap: 24,
          }}>
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 12 }}>
                // Welcome Back
              </div>
<div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(32px,5vw,56px)', fontWeight: 700, letterSpacing: 4, color: 'var(--white)', lineHeight: 1.1 }}>
  WELCOME<br /><span style={{ color: 'var(--cyan)' }}>{firstName_cap}</span>
</div>
            </div>
            <button className="btn-primary" onClick={() => router.push('/quiz')}>
              + NEW ROUTINE
            </button>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
            gap: 1, background: 'var(--border)',
            marginBottom: 56, border: '1px solid var(--border)',
          }}>
            {[
              { val: stats.totalSessions, label: 'Total Sessions' },
              { val: stats.totalMinutes,  label: 'Minutes Moved' },
              { val: stats.thisWeek,      label: 'Sessions This Week' },
            ].map(s => (
              <div key={s.label} style={{ background: 'var(--black2)', padding: '36px 28px' }}>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 56, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1, marginBottom: 8 }}>
                  {s.val}
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: 'var(--cyan)', textTransform: 'uppercase' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))',
            gap: 1, background: 'var(--border)',
            border: '1px solid var(--border)', marginBottom: 48,
          }}>
            {[
             { icon: '📅', title: 'New Routine', sub: 'Build a sport-specific or area-focused mobility session.', badge: 'AI GENERATED', href: '/quiz' },
{ icon: '🫧', title: 'Recovery Session', sub: 'Foam roll series for tissue quality and recovery.', badge: '10 · 15 · 20 · 30 MIN', href: '/quiz' },
{ icon: '🔬', title: 'Mobility Screening', sub: '11-question assessment across hips, shoulders, and spine.', badge: '3 MIN · 11 QUESTIONS', href: '/screening' },
{ icon: '⚡', title: 'Movement Battery', sub: 'Five fundamental movement tests scored 0–3.', badge: '5 TESTS · 10 MIN', href: '/battery' },
{ icon: '📊', title: 'My Results', sub: 'View your mobility scores and track progress over time.', badge: 'SCORE HISTORY', href: '/results' },
{ icon: '🌅', title: 'Daily Check-in', sub: 'Rate your sleep, energy, soreness and motivation.', badge: '5 QUESTIONS · 1 MIN', href: '/readiness' },
{ icon: '📋', title: 'Session Check-in', sub: 'Pre or post session — log your focus, RPE, and feedback.', badge: 'PRE · POST', href: '/session-checkin' }, 
].map(a => (
              <div key={a.title} onClick={() => router.push(a.href)} style={{
                background: 'var(--black2)', padding: '32px 28px', cursor: 'pointer', transition: 'background 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--black3)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--black2)')}
              >
                <span style={{ fontSize: 32, marginBottom: 12, display: 'block' }}>{a.icon}</span>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 8, textTransform: 'uppercase' }}>
                  {a.title}
                </div>
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.6 }}>
                  {a.sub}
                </div>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'var(--cyan)', background: 'rgba(0,180,216,0.1)', border: '1px solid rgba(0,180,216,0.2)', padding: '3px 10px', borderRadius: 20, display: 'inline-block', marginTop: 10 }}>
                  {a.badge}
                </span>
              </div>
            ))}
          </div>

          {/* Saved Routines */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div className="section-title">Saved Routines</div>
          </div>

          {routines.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 36, marginBottom: 16, opacity: 0.3 }}>◯</div>
              <div className="empty-state-text">No saved routines yet.<br />Generate your first to begin.</div>
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))',
              gap: 1, background: 'var(--border)', border: '1px solid var(--border)',
            }}>
              {routines.map(r => (
                <div key={r.id} onClick={() => router.push(`/routine/${r.id}`)} style={{
                  background: 'var(--black2)', padding: 28, cursor: 'pointer', transition: 'background 0.2s', position: 'relative',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--black3)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--black2)')}
                >
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--cyan3)', marginBottom: 10, textTransform: 'uppercase' }}>
                    {r.sport ? r.sport.toUpperCase() : (r.areas || []).map((a: string) => a.toUpperCase()).join(' · ')}
                  </div>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, fontWeight: 600, color: 'var(--white)', marginBottom: 14, lineHeight: 1.3 }}>
                    {r.title}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                    <span className="meta-chip">{r.duration_minutes} min</span>
                    {r.difficulty && <span className="meta-chip">{r.difficulty}</span>}
                    {r.goal && <span className="meta-chip">{r.goal}</span>}
                  </div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--silver4)', letterSpacing: 1 }}>
                    {new Date(r.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  <div style={{ position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', color: 'var(--silver4)', fontSize: 20 }}>
                    →
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