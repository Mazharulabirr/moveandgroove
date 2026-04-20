'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import Header from '@/components/Header'
import {
  IconCheckin,
  IconScreening,
  IconPrograms,
  IconRecovery,
  IconResults,
  IconRoutine,
} from '@/components/Icons'
import { createClient } from '@/lib/supabase/client'
import { getIsPro } from '@/lib/profiles'
import { deriveScreeningSnapshot } from '@/lib/screening-cloud-v2'
import { readStoredScreening } from '@/lib/screening-storage'

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

interface ScreeningResult {
  id: string
  overall_score: number
  hip_score: number
  shoulder_score: number
  spine_score: number
  created_at?: string | null
  completed_at?: string | null
}

interface BatteryResult {
  id: string
  total_score: number
  max_score: number
  assessed_at?: string | null
  created_at?: string | null
}

type StageAction = {
  label: string
  href: string
  mode: 'modal' | 'route'
}

const UC = 'uppercase' as const
const METALLIC_TEXT = {
  backgroundImage: 'linear-gradient(135deg, #f8fbff 0%, #d8e4ea 24%, #8be7ff 48%, #b9c7cf 74%, #ffffff 100%)',
  WebkitBackgroundClip: 'text',
  color: 'transparent',
} as const

const QUICK_ACTIONS = [
  { Icon: IconRoutine, title: 'Daily Routine', sub: 'Jump straight into a guided daily mobility session.', badge: 'AI GENERATED', href: '/quiz' },
  { Icon: IconPrograms, title: 'Programs + Calendar', sub: 'Review your weekly flow and session rhythm.', badge: 'PLAN AHEAD', href: '/programs' },
  { Icon: IconResults, title: 'Score History', sub: 'See how your mobility scores are trending over time.', badge: 'PROFILE DATA', href: '/results' },
  { Icon: IconCheckin, title: 'Session Check-in', sub: 'Log readiness before training or feedback after training.', badge: 'PRE + POST', href: '/session-checkin' },
  { Icon: IconRecovery, title: 'Recovery Session', sub: 'Run a recovery-focused session when you need extra reset work.', badge: '15-30 MIN', href: '/recovery' },
]

const BASIC_PATH = [
  'Mobility screening baseline',
  'Choose sport or body-area focus',
  'Build daily routine from screening data',
]

const PREMIUM_PATH = [
  'Mobility screening baseline',
  'Movement battery assessment',
  'Programs, calendar, and daily routine flow',
]

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatRoutineFocus(routine: Routine) {
  if (routine.sport) return routine.sport
  if (routine.areas.length === 1) return routine.areas[0]
  if (routine.areas.length === 2) return `${routine.areas[0]} + ${routine.areas[1]}`
  return 'General mobility'
}

function addDays(dateStr: string, days: number) {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date
}

function getAssessmentDate(entry: { assessed_at?: string | null; created_at?: string | null } | null) {
  return entry?.assessed_at || entry?.created_at || null
}

function getPreviewModeFromLocation() {
  if (typeof window === 'undefined') {
    return null
  }

  const preview = new URLSearchParams(window.location.search).get('preview')
  return preview === 'basic' || preview === 'pro' ? preview : null
}

function scoreColor(score: number) {
  if (score >= 80) return '#00b4d8'
  if (score >= 60) return '#4ac8e8'
  if (score >= 40) return '#e8a94a'
  return '#e74c3c'
}

function applyHoverState(element: HTMLDivElement, hovered: boolean) {
  element.style.background = hovered
    ? 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(18,20,24,0.96) 100%)'
    : 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(10,12,16,0.98) 100%)'
  element.style.transform = hovered ? 'translateY(-4px)' : 'translateY(0)'
  element.style.boxShadow = hovered ? '0 20px 40px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.08)' : 'inset 0 1px 0 rgba(255,255,255,0.04)'
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [stats, setStats] = useState<Stats>({ totalSessions: 0, totalMinutes: 0, thisWeek: 0 })
  const [routines, setRoutines] = useState<Routine[]>([])
  const [latestScreening, setLatestScreening] = useState<ScreeningResult | null>(null)
  const [latestBattery, setLatestBattery] = useState<BatteryResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPro, setIsPro] = useState(false)
  const [previewMode, setPreviewMode] = useState<'basic' | 'pro' | null>(() => getPreviewModeFromLocation())
  const [showWhyFirst, setShowWhyFirst] = useState(false)
  const [showPremiumTeaser, setShowPremiumTeaser] = useState(false)

  const loadData = useCallback(async (userId: string) => {
    try {
      const [
        { data: progress },
        { data: savedRoutines },
        { data: screening },
        { data: battery },
      ] = await Promise.all([
        supabase.from('progress').select('*').eq('user_id', userId),
        supabase.from('routines').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('screening_questionnaires').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('test_results').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      if (progress) {
        const weekAgo = new Date()
        weekAgo.setDate(weekAgo.getDate() - 7)
        const thisWeek = progress.filter((entry) => new Date(entry.created_at) > weekAgo).length
        const totalMinutes = progress.reduce((sum: number, entry: { duration_minutes?: number }) => sum + (entry.duration_minutes || 0), 0)
        setStats({ totalSessions: progress.length, totalMinutes, thisWeek })
      }

      if (savedRoutines) {
        setRoutines(savedRoutines)
      }

      const cloudScreening = deriveScreeningSnapshot(screening)
      if (cloudScreening) {
        setLatestScreening(cloudScreening)
      } else {
        const localSnapshot = readStoredScreening()
        setLatestScreening(localSnapshot ? {
          id: 'local-screening',
          overall_score: localSnapshot.overall_score,
          hip_score: localSnapshot.hip_score,
          shoulder_score: localSnapshot.shoulder_score,
          spine_score: localSnapshot.spine_score,
          created_at: localSnapshot.created_at,
          completed_at: null,
        } : null)
      }
      setLatestBattery(battery || null)
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

  const effectiveIsPro = previewMode === 'pro' ? true : previewMode === 'basic' ? false : isPro
  const hasScreening = Boolean(latestScreening)
  const hasBattery = Boolean(latestBattery)
  const latestScreeningDate = latestScreening?.completed_at || latestScreening?.created_at || null
  const latestBatteryDate = getAssessmentDate(latestBattery)
  const canRetakeScreening = !latestScreeningDate || addDays(latestScreeningDate, 30) <= new Date()
  const nextScreeningDate = latestScreeningDate ? addDays(latestScreeningDate, 30) : null
  const membershipLabel = effectiveIsPro ? 'FULL / PREMIUM' : 'BASIC'
  const membershipTone = effectiveIsPro ? 'var(--silver2)' : 'var(--cyan)'
  const membershipSummary = effectiveIsPro
    ? 'Premium adds the movement battery and planning layer after the shared screening baseline.'
    : 'Basic keeps the onboarding lighter and routes straight from screening into sport or body-area routines.'
  const journeySteps = effectiveIsPro ? PREMIUM_PATH : BASIC_PATH
  const visibleQuickActions = effectiveIsPro
    ? QUICK_ACTIONS.filter((action) => ['/quiz', '/programs', '/session-checkin'].includes(action.href))
    : QUICK_ACTIONS.filter((action) => ['/quiz', '/results', '/session-checkin'].includes(action.href))
  const latestRoutine = routines[0] || null
  const showPremiumModeChoice = hasScreening && effectiveIsPro && hasBattery
  const basicChecklist = [
    {
      label: 'Mobility Screening',
      done: hasScreening,
      detail: hasScreening ? `${latestScreening?.overall_score ?? 0}% baseline saved` : 'Complete your first screening',
      Icon: IconScreening,
      href: '/screening',
    },
    {
      label: 'Choose Your Goal',
      done: hasScreening,
      detail: hasScreening ? 'Sport relevant or general mobility focus' : 'Unlocks after your screening',
      Icon: IconRoutine,
      href: '/quiz',
    },
    {
      label: 'Create the Workout',
      done: stats.totalSessions > 0 || routines.length > 0,
      detail: stats.totalSessions > 0 || routines.length > 0 ? 'Workout flow completed' : 'Build your first routine',
      Icon: IconCheckin,
      href: '/quiz',
    },
  ]
  const showBasicProcess = !effectiveIsPro && !hasScreening
  const basicCoreActions = [
    ...(canRetakeScreening
      ? [{
          title: 'MOBILITY SCORE',
          sub: latestScreening
            ? `Latest score ${latestScreening.overall_score}%${latestScreeningDate ? ` / ${formatDate(latestScreeningDate)}` : ''}`
            : 'Review or retake your mobility baseline',
          href: '/screening',
          Icon: IconScreening,
        }]
      : []),
    {
      title: 'CREATE YOUR OWN WORKOUT',
      sub: 'Build a new sport relevant or general mobility session.',
      href: '/quiz',
      Icon: IconRoutine,
    },
  ]
  const railStats = [
    { val: stats.totalSessions, label: 'Sessions Done' },
    { val: stats.totalMinutes, label: 'Minutes Moved' },
    { val: stats.thisWeek, label: 'This Week' },
  ]
  const recentRoutines = routines.slice(0, 3)
  const profileHistoryText = latestScreening
    ? `Latest overall ${latestScreening.overall_score}%${latestScreeningDate ? ` / ${formatDate(latestScreeningDate)}` : ''}`
    : 'No screening saved yet'

  let stageLabel = 'Start with your mobility baseline'
  let stageTitle = 'MOBILITY SCREENING'
  let stageBody = 'Every athlete begins with the same mobility screen so the app can capture a baseline and point you toward the right next step.'
  let stageStatement: string | null = 'SCREEN, BENCHMARK, IMPROVE'
  let primaryAction = { label: hasScreening && canRetakeScreening ? 'RETAKE SCREENING' : 'START SCREENING', href: '/screening' }
  let secondaryAction: StageAction = { label: 'WHY THIS FIRST?', href: '/results', mode: 'modal' }

  if (hasScreening && !effectiveIsPro) {
    stageLabel = 'Basic path unlocked'
    stageTitle = 'CHOOSE YOUR FOCUS'
    stageBody = 'Your screening is saved to your profile. Next, choose either sport relevant guidance or a body-area focus to build your next routine.'
    stageStatement = null
    primaryAction = { label: 'CHOOSE SPORT OR BODY AREA', href: '/quiz' }
    secondaryAction = { label: 'VIEW MOBILITY SCORES', href: '/results', mode: 'route' as const }
  }

  if (hasScreening && effectiveIsPro && !hasBattery) {
    stageLabel = 'Premium path unlocked'
    stageTitle = 'MOVEMENT BATTERY NEXT'
    stageBody = 'Premium members continue straight into the 5-test movement battery so both mobility and movement quality can guide the next training block.'
    stageStatement = null
    primaryAction = { label: 'START MOVEMENT BATTERY', href: '/battery' }
    secondaryAction = { label: 'VIEW MOBILITY SCORES', href: '/results', mode: 'route' as const }
  }

  if (showPremiumModeChoice) {
    stageLabel = 'Premium planning unlocked'
    stageTitle = 'CHOOSE YOUR TRAINING MODE'
    stageBody = 'You now have a clear fork: build a one-off workout for today, or move into a planned 4, 8, or 12 week block built from your screening and movement profile.'
    stageStatement = null
    primaryAction = { label: 'RANDOM WORKOUT', href: '/quiz' }
    secondaryAction = { label: 'PLANNED 4 / 8 / 12 WEEKS', href: '/programs', mode: 'route' as const }
  } else if (hasScreening && !effectiveIsPro && routines.length > 0) {
    stageLabel = 'Keep momentum going'
    stageTitle = 'CONTINUE YOUR TRAINING FLOW'
    stageBody = 'Your latest scores are saved, your routines are on file, and you can jump back into today\'s session or review your profile history.'
    stageStatement = null
    primaryAction = { label: 'OPEN TODAY\'S ROUTINE FLOW', href: '/quiz' }
    secondaryAction = { label: 'VIEW PROFILE HISTORY', href: '/results', mode: 'route' as const }
  }

  function setPreview(nextMode: 'basic' | 'pro' | null) {
    const target = nextMode ? `/dashboard?preview=${nextMode}` : '/dashboard'
    setPreviewMode(nextMode)
    router.replace(target)
  }

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
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(/athlete-backgrounds/rugby-team.jpg)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top, rgba(0,180,216,0.08) 0%, rgba(0,0,0,0) 34%), linear-gradient(to bottom, rgba(3,5,8,0.92) 0%, rgba(0,0,0,0.94) 38%, rgba(0,0,0,0.98) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div className="mg-page-shell">
          <div style={{ marginBottom: 52 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(34px,6vw,58px)', fontWeight: 700, letterSpacing: 4, color: 'var(--white)', lineHeight: 1.05, marginBottom: 10 }}>
                  DASHBOARD
                </div>
              </div>
              <button className="btn-outline" onClick={() => router.push('/results')}>
                PROFILE SCORES
              </button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: 'var(--silver3)', textTransform: UC }}>
                Dashboard Preview
              </span>
              <button className="btn-outline" onClick={() => setPreview('basic')} style={{ opacity: previewMode === 'basic' ? 1 : 0.72 }}>
                BASIC
              </button>
              <button className="btn-outline" onClick={() => setPreview('pro')} style={{ opacity: previewMode === 'pro' ? 1 : 0.72 }}>
                FULL / PREMIUM
              </button>
              <button className="btn-outline" onClick={() => setPreview(null)} style={{ opacity: previewMode === null ? 1 : 0.72 }}>
                REAL ACCOUNT
              </button>
              <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: previewMode ? 'var(--silver2)' : 'var(--silver3)' }}>
                {previewMode ? `Previewing the ${previewMode === 'pro' ? 'Full / Premium' : 'Basic'} dashboard.` : 'Showing your actual subscription state.'}
              </span>
            </div>
          </div>

          <div className="mg-dashboard-main-grid">
            <div style={{ display: 'grid', gap: 18, alignContent: 'start' }}>
              {effectiveIsPro ? (
              <div style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(10,12,16,0.98) 55%)', border: '1px solid rgba(139,231,255,0.18)', padding: '28px 30px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)', alignSelf: 'start' }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 12, textTransform: UC }}>
                  {stageLabel}
                </div>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(26px,4vw,40px)', fontWeight: 700, letterSpacing: 3, lineHeight: 1.15, marginBottom: 14, ...METALLIC_TEXT }}>
                  {stageTitle}
                </div>
                {stageStatement && (
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 5, color: 'var(--cyan)', marginBottom: 16, textTransform: UC }}>
                    {stageStatement}
                  </div>
                )}
                <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, color: 'var(--silver2)', lineHeight: 1.8, marginBottom: 18, maxWidth: 720 }}>
                  {stageBody}
                </div>

                {latestScreening && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
                    <span className="meta-chip">Mobility {latestScreening.overall_score}%</span>
                    {latestScreeningDate && <span className="meta-chip">Saved {formatDate(latestScreeningDate)}</span>}
                    {!canRetakeScreening && nextScreeningDate && <span className="meta-chip">Next screen {formatDate(nextScreeningDate.toISOString())}</span>}
                    {latestBattery && <span className="meta-chip">Battery {latestBattery.total_score}/{latestBattery.max_score}</span>}
                  </div>
                )}

                <div className="mg-mobile-stack">
                  <button className="btn-primary" onClick={() => router.push(primaryAction.href)}>
                    {primaryAction.label}
                  </button>
                  <button
                    className="btn-outline"
                    onClick={() => {
                      if (secondaryAction.mode === 'modal') {
                        setShowWhyFirst((current) => !current)
                        return
                      }
                      router.push(secondaryAction.href)
                    }}
                  >
                    {secondaryAction.label}
                  </button>
                </div>
                {showPremiumModeChoice && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))',
                      gap: 12,
                      marginTop: 18,
                    }}
                  >
                    {[
                      {
                        title: 'RANDOM WORKOUT',
                        sub: 'Generate one smart session right now from your current profile.',
                        href: '/quiz',
                        accent: 'var(--cyan)',
                      },
                      {
                        title: 'PLANNED BLOCK',
                        sub: 'Choose 4, 8, or 12 weeks and follow a more structured premium path.',
                        href: '/programs',
                        accent: 'var(--silver2)',
                      },
                    ].map((option) => (
                      <button
                        key={option.title}
                        onClick={() => router.push(option.href)}
                        style={{
                          textAlign: 'left',
                          padding: '18px 18px 16px',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(8,10,14,0.98) 100%)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: option.accent, marginBottom: 8, textTransform: UC }}>
                          {'// Premium Choice'}
                        </div>
                        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 8 }}>
                          {option.title}
                        </div>
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.65 }}>
                          {option.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {secondaryAction.mode === 'modal' && showWhyFirst && (
                  <div style={{ marginTop: 16, maxWidth: 620, border: '1px solid rgba(139,231,255,0.18)', background: 'linear-gradient(180deg, rgba(0,180,216,0.08) 0%, rgba(8,10,14,0.96) 100%)', padding: '18px 20px' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>
                      Why Screening Comes First
                    </div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.75 }}>
                      Screening shows where you move well and where you are restricted.
                      <br />
                      It gives us a benchmark before we build any routine or program.
                      <br />
                      That means your next step is based on your body, not a generic template.
                    </div>
                  </div>
                )}
              </div>
              ) : showBasicProcess ? (
                <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(8,10,14,0.98) 100%)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 26px' }}>
                  <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 18 }}>
                    YOUR PROCESS
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {basicChecklist.map((item, index) => (
                      <button
                        key={item.label}
                        onClick={() => router.push(item.href)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '28px 20px minmax(0,1fr)',
                          gap: 14,
                          alignItems: 'start',
                          textAlign: 'left',
                          padding: '16px 16px 15px',
                          background: item.done ? 'rgba(67,209,122,0.04)' : 'rgba(255,255,255,0.02)',
                          border: item.done ? '1px solid rgba(67,209,122,0.16)' : '1px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer',
                        }}
                      >
                        <span
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 999,
                            border: `1px solid ${item.done ? 'rgba(67,209,122,0.35)' : 'rgba(0,180,216,0.18)'}`,
                            color: item.done ? '#43d17a' : 'var(--cyan)',
                            display: 'grid',
                            placeItems: 'center',
                            fontFamily: "'Syncopate',sans-serif",
                            fontSize: 14,
                            fontWeight: 700,
                            background: item.done ? 'rgba(67,209,122,0.04)' : 'rgba(0,180,216,0.04)',
                            boxShadow: item.done ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
                          }}
                        >
                          {index + 1}
                        </span>
                        <span style={{ display: 'flex', marginTop: 4 }}>
                          <item.Icon size={18} color={item.done ? '#43d17a' : 'var(--silver3)'} />
                        </span>
                        <span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                            <span style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 2, color: item.done ? 'var(--white)' : 'var(--silver)' }}>
                              {item.label}
                            </span>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 8, letterSpacing: 2, color: item.done ? '#43d17a' : 'var(--silver4)', border: `1px solid ${item.done ? 'rgba(67,209,122,0.35)' : 'rgba(90,100,112,0.35)'}`, background: item.done ? 'rgba(67,209,122,0.08)' : 'rgba(90,100,112,0.08)', padding: '3px 7px', textTransform: UC }}>
                              {item.done ? 'DONE' : 'NEXT'}
                            </span>
                          </span>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.6 }}>
                            {item.detail}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(8,10,14,0.98) 100%)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px 26px' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 12, textTransform: UC }}>
                    {'// Core Actions'}
                  </div>
                  <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 18 }}>
                    KEEP MOVING
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
                    {basicCoreActions.map((action) => (
                      <button
                        key={action.title}
                        onClick={() => router.push(action.href)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '20px minmax(0,1fr)',
                          gap: 14,
                          alignItems: 'start',
                          textAlign: 'left',
                          padding: '16px 16px 15px',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ display: 'flex', marginTop: 2 }}>
                          <action.Icon size={18} color="var(--cyan)" />
                        </span>
                        <span>
                          <span style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', display: 'block', marginBottom: 6 }}>
                            {action.title}
                          </span>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.6 }}>
                            {action.sub}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 18, borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 18 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--silver3)', textTransform: UC }}>
                        {'// Saved Workouts'}
                      </div>
                      <button className="btn-outline" onClick={() => router.push('/results')}>
                        VIEW ALL
                      </button>
                    </div>
                    {recentRoutines.length > 0 ? (
                      <div style={{ display: 'grid', gap: 10 }}>
                        {recentRoutines.map((routine) => (
                          <div key={routine.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '14px 14px 13px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
                              <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, color: 'var(--white)' }}>
                                {routine.title}
                              </div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: 'var(--silver3)', textTransform: UC }}>
                                {formatDate(routine.created_at)}
                              </div>
                            </div>
                            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--silver2)', lineHeight: 1.65 }}>
                              {formatRoutineFocus(routine)} · {routine.goal || 'balanced'} · {routine.duration_minutes} min
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.7 }}>
                        Your saved workouts will show up here once you build and save them.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {effectiveIsPro && (
              <div style={{ background: 'rgba(8,10,14,0.96)', border: '1px solid var(--border)', padding: '28px 28px 24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>
                      {'// Mobility Profile'}
                    </div>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'var(--white)' }}>
                      MOBILITY SCORE
                    </div>
                  </div>
                  <button className="btn-outline" onClick={() => router.push('/results')}>
                    PREVIOUS SCORES
                  </button>
                </div>

                {latestScreening ? (
                  <>
                    {effectiveIsPro ? (
                      <div className="mg-dashboard-score-grid">
                        {[
                          { label: 'Overall', value: latestScreening.overall_score },
                          { label: 'Hips', value: latestScreening.hip_score },
                          { label: 'Shoulders', value: latestScreening.shoulder_score },
                          { label: 'Spine', value: latestScreening.spine_score },
                        ].map((score) => (
                            <div key={score.label} style={{ border: '1px solid rgba(255,255,255,0.08)', padding: '18px 14px', background: 'rgba(255,255,255,0.02)', minWidth: 0 }}>
                              <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 28, fontWeight: 700, color: scoreColor(score.value), lineHeight: 1, marginBottom: 8 }}>{score.value}</div>
                              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: 'var(--silver3)', textTransform: UC }}>{score.label}</div>
                            </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(220px,0.85fr)', gap: 14, alignItems: 'stretch' }} className="mg-dashboard-basic-score">
                        <div style={{ border: '1px solid rgba(139,231,255,0.18)', background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(10,12,16,0.98) 62%)', padding: '20px 22px' }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>
                            {'// Mobility Score'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap', marginBottom: 12 }}>
                            <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(54px,9vw,82px)', fontWeight: 700, lineHeight: 0.9, ...METALLIC_TEXT }}>
                              {latestScreening.overall_score}
                            </div>
                            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 3, color: 'var(--silver3)', textTransform: UC, paddingBottom: 8 }}>
                              overall / 100
                            </div>
                          </div>
                          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.75 }}>
                            A slimmer baseline view for Basic members. Your mobility profile is saved and ready to guide the next workout.
                          </div>
                        </div>

                        <div style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: '18px 18px 16px' }}>
                          <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 12, textTransform: UC }}>
                            {'// First Wins'}
                          </div>
                          <div style={{ display: 'grid', gap: 10 }}>
                            {basicChecklist.map((item) => (
                              <div key={item.label} style={{ display: 'grid', gridTemplateColumns: '18px 18px minmax(0,1fr)', gap: 10, alignItems: 'start' }}>
                                <span
                                  style={{
                                    display: 'grid',
                                    placeItems: 'center',
                                    width: 16,
                                    height: 16,
                                    marginTop: 1,
                                    borderRadius: 999,
                                    background: item.done ? '#43d17a' : 'transparent',
                                    border: item.done ? 'none' : '1px solid var(--silver4)',
                                    color: item.done ? '#04110a' : 'transparent',
                                    fontFamily: "'DM Mono',monospace",
                                    fontSize: 10,
                                    lineHeight: 1,
                                    fontWeight: 700,
                                  }}
                                >
                                  {item.done ? 'OK' : '...'}
                                </span>
                                <span style={{ display: 'flex', marginTop: 1, opacity: item.done ? 1 : 0.65 }}>
                                  <item.Icon size={16} color={item.done ? '#43d17a' : 'var(--silver3)'} />
                                </span>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: item.done ? 'var(--white)' : 'var(--silver2)', lineHeight: 1.4 }}>
                                      {item.label}
                                    </div>
                                    <span
                                      style={{
                                        fontFamily: "'DM Mono',monospace",
                                        fontSize: 8,
                                        letterSpacing: 2,
                                        color: item.done ? '#43d17a' : 'var(--silver4)',
                                        border: `1px solid ${item.done ? 'rgba(67,209,122,0.35)' : 'rgba(90,100,112,0.35)'}`,
                                        background: item.done ? 'rgba(67,209,122,0.08)' : 'rgba(90,100,112,0.08)',
                                        padding: '3px 7px',
                                        textTransform: UC,
                                      }}
                                    >
                                      {item.done ? 'DONE' : 'PENDING'}
                                    </span>
                                  </div>
                                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 2, color: item.done ? '#43d17a' : 'var(--silver4)', textTransform: UC, marginTop: 5 }}>
                                    {item.detail}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.75 }}>
                      Last saved on <span style={{ color: 'var(--white)' }}>{latestScreeningDate ? formatDate(latestScreeningDate) : 'your latest check'}</span>. {canRetakeScreening ? 'You can complete a new screening now.' : `Your next screening unlocks on ${formatDate(nextScreeningDate!.toISOString())}.`}
                    </div>
                    {effectiveIsPro && (
                    <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px solid var(--border2)' }}>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 10, textTransform: UC }}>
                        {'// Routine Library'}
                      </div>
                      {latestRoutine ? (
                        <>
                          <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 15, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 8 }}>
                            {routines.length} SAVED {routines.length === 1 ? 'ROUTINE' : 'ROUTINES'}
                          </div>
                          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7, marginBottom: 14 }}>
                            Latest: <span style={{ color: 'var(--white)' }}>{latestRoutine.title}</span> on {formatDate(latestRoutine.created_at)}.
                          </div>
                          <div className="mg-mobile-stack">
                            <button className="btn-outline" onClick={() => router.push('/programs')}>
                              OPEN LIBRARY
                            </button>
                            <button className="btn-outline" onClick={() => router.push(`/routine/${latestRoutine.id}`)}>
                              LAST ROUTINE
                            </button>
                          </div>
                        </>
                      ) : (
                        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7 }}>
                          No routines saved yet. Generate one when you want to keep it in your library.
                        </div>
                      )}
                    </div>
                    )}
                  </>
                ) : (
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.8 }}>
                    No mobility screening saved yet. Every user starts here so the app can personalize what comes next.
                  </div>
                )}
              </div>
              )}

              {effectiveIsPro && (
                <div
                  style={{
                    background: 'rgba(8,10,14,0.96)',
                    border: '1px solid var(--border)',
                    padding: '28px 28px 24px',
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    router.push('/battery')
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>
                        {'// Movement Quality'}
                      </div>
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 8 }}>
                        MOVEMENT SCREENING
                      </div>
                    </div>
                  </div>

                  {latestBattery ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 12 }}>
                        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 54, fontWeight: 700, color: scoreColor(Math.round((latestBattery.total_score / latestBattery.max_score) * 100)), lineHeight: 1 }}>
                          {latestBattery.total_score}
                        </div>
                        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 3, color: 'var(--silver3)', textTransform: UC }}>
                          / {latestBattery.max_score}
                        </div>
                      </div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.75 }}>
                        Saved on <span style={{ color: 'var(--white)' }}>{latestBatteryDate ? formatDate(latestBatteryDate) : 'your latest test'}</span>. Premium members use this score alongside screening data to steer the next block.
                      </div>
                    </>
                  ) : (
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.8 }}>
                      Premium unlocked. Click here to begin the movement battery and add a second layer to your profile.
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'grid', gap: 12, minWidth: 0 }}>
              {effectiveIsPro && (
                <div style={{ display: 'grid', gap: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', minWidth: 0 }}>
                  <div style={{ background: 'linear-gradient(180deg, rgba(216,228,234,0.14) 0%, rgba(8,10,14,0.96) 100%)', padding: '26px 24px' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: membershipTone, marginBottom: 10, textTransform: UC }}>
                      {'// Account Tier'}
                    </div>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 2, color: membershipTone, marginBottom: 10 }}>
                      {membershipLabel}
                    </div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.7 }}>
                      {membershipSummary}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(8,10,14,0.95)', padding: '24px' }}>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 12, textTransform: UC }}>
                      {'// Your Path'}
                    </div>
                    <div style={{ display: 'grid', gap: 10 }}>
                      {journeySteps.map((step, index) => (
                        <div key={step} style={{ display: 'grid', gridTemplateColumns: '26px minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
                          <div style={{ width: 26, height: 26, borderRadius: 999, border: `1px solid ${membershipTone}`, color: membershipTone, display: 'grid', placeItems: 'center', fontFamily: "'DM Mono',monospace", fontSize: 11 }}>
                            {index + 1}
                          </div>
                          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.6 }}>
                            {step}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gap: 10 }}>
                {railStats.map((item) => (
                  <div key={item.label} style={{ background: 'rgba(8,10,14,0.95)', border: '1px solid var(--border)', padding: '18px 20px' }}>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 30, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1, marginBottom: 6 }}>
                      {item.val}
                    </div>
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: 'var(--cyan)', textTransform: UC }}>
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>

              {!effectiveIsPro && (
                <div style={{ background: 'rgba(8,10,14,0.95)', border: '1px solid var(--border)', padding: '20px' }}>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>
                    {'// Profile'}
                  </div>
                  <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 12 }}>
                    PROFILE
                  </div>
                  <button
                    onClick={() => router.push('/results')}
                    style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '14px 14px 13px', cursor: 'pointer' }}
                  >
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--silver3)', textTransform: UC, marginBottom: 6 }}>
                      Mobility Scores
                    </div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--silver2)', lineHeight: 1.65 }}>
                      {profileHistoryText}
                    </div>
                  </button>
                  <button
                    onClick={() => router.push('/results')}
                    style={{ width: '100%', textAlign: 'left', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', padding: '14px 14px 13px', cursor: 'pointer', marginTop: 10 }}
                  >
                    <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 3, color: 'var(--silver3)', textTransform: UC, marginBottom: 6 }}>
                      Saved Workouts
                    </div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--silver2)', lineHeight: 1.65 }}>
                      {latestRoutine ? `${latestRoutine.title} / ${formatDate(latestRoutine.created_at)}` : 'No saved workouts yet'}
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {!effectiveIsPro && (
            <div
              style={{
                background: 'linear-gradient(180deg, rgba(0,180,216,0.08) 0%, rgba(10,12,16,0.98) 100%)',
                border: '1px solid rgba(0,180,216,0.18)',
                padding: '26px 28px',
                marginBottom: 32,
              }}
            >
              <div className="mg-split-section" style={{ alignItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', textTransform: UC, marginBottom: 10 }}>
                    {'// Premium Coming Soon'}
                  </div>
                  <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 8 }}>
                    PREMIUM IS COMING
                  </div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7 }}>
                    Basic stays lean for beta. Premium will add the deeper testing and longer-term planning layer next.
                  </div>
                </div>
                <button className="btn-primary" onClick={() => setShowPremiumTeaser((current) => !current)}>
                  {showPremiumTeaser ? 'HIDE TEASER' : 'SEE WHAT IS COMING'}
                </button>
              </div>
              {showPremiumTeaser && (
                <div style={{ marginTop: 18, display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
                  {[
                    { title: 'Movement Battery', sub: 'A premium-only second layer that scores movement quality, not just mobility.' },
                    { title: '4 / 8 / 12 Week Blocks', sub: 'Structured training plans built from your profile instead of one-off sessions.' },
                    { title: 'Calendar Flow', sub: 'A clearer weekly training rhythm with planned sessions and progression.' },
                  ].map((item) => (
                    <div key={item.title} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', padding: '16px 16px 14px' }}>
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 8 }}>
                        {item.title}
                      </div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.65 }}>
                        {item.sub}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {effectiveIsPro && (
            <>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>
                  {'// Quick Tools'}
                </div>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 2, color: 'var(--white)' }}>
                  TOOLS
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))',
                  gap: 14,
                  marginBottom: 48,
                }}
              >
                {visibleQuickActions.map((action) => (
                  <div
                    key={action.title}
                    onClick={() => router.push(action.href)}
                    style={{
                      background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(10,12,16,0.98) 100%)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      padding: '28px 24px',
                      cursor: 'pointer',
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
                      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                    }}
                    onMouseEnter={(event) => applyHoverState(event.currentTarget, true)}
                    onMouseLeave={(event) => applyHoverState(event.currentTarget, false)}
                  >
                    <span style={{ display: 'flex', marginBottom: 12 }}>
                      <action.Icon size={28} color="var(--cyan)" />
                    </span>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 8, textTransform: UC }}>
                      {action.title}
                    </div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7 }}>
                      {action.sub}
                    </div>
                    <span
                      style={{
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 9,
                        letterSpacing: 2,
                        color: 'var(--silver2)',
                        background: 'rgba(216,228,234,0.08)',
                        border: '1px solid rgba(216,228,234,0.18)',
                        padding: '4px 10px',
                        borderRadius: 20,
                        display: 'inline-block',
                        marginTop: 12,
                        textTransform: UC,
                      }}
                    >
                      {action.badge}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </>
  )
}
