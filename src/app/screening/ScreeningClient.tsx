'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { IconCheckin } from '@/components/Icons'
import { getAssessmentMedia } from '@/lib/assessment-media'
import {
  calculateMobilityScreeningScores,
  getMobilityScreeningAdvice,
  MOBILITY_REGION_META,
  MOBILITY_REGION_ORDER,
  mobilityScreeningTests,
} from '@/lib/mobility-screening'
import { buildScreeningQuestionnaireInsert, deriveScreeningSnapshot } from '@/lib/screening-cloud-v2'
import { createClient } from '@/lib/supabase/client'
import { readStoredScreening, writeStoredScreening } from '@/lib/screening-storage'

type Scores = ReturnType<typeof calculateMobilityScreeningScores>
type LatestScreening = {
  id?: string
  assessed_at?: string | null
  created_at?: string | null
  completed_at?: string | null
  responses?: Record<string, number> | null
} | null

const UC = 'uppercase' as const
const CA = 'center' as const
const TOTAL = mobilityScreeningTests.length

function scoreLabel(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: 'EXCELLENT', color: '#00b4d8' }
  if (pct >= 60) return { label: 'GOOD', color: '#4ac8e8' }
  if (pct >= 40) return { label: 'FAIR', color: '#e8a94a' }
  return { label: 'NEEDS WORK', color: '#e74c3c' }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function addDays(dateStr: string | null, days: number) {
  if (!dateStr) return null
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return date
}

function getScreeningDate(entry: LatestScreening) {
  return entry?.completed_at || entry?.assessed_at || entry?.created_at || null
}

export default function ScreeningClient() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [scores, setScores] = useState<Scores | null>(null)
  const [latestScreening, setLatestScreening] = useState<LatestScreening>(null)
  const [eligibilityChecked, setEligibilityChecked] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveConfirmed, setSaveConfirmed] = useState(false)

  const test = mobilityScreeningTests[step - 1]
  const progress = step === 0 ? 0 : Math.round((step / TOTAL) * 100)
  const regionMeta = test ? MOBILITY_REGION_META[test.region] : null
  const testMedia = test ? getAssessmentMedia(test.id) : null
  const latestScreeningDate = getScreeningDate(latestScreening)
  const screeningEligibilityDate = addDays(latestScreeningDate, 30)
  // A browser-only snapshot is useful as a temporary fallback, but must never
  // prevent a retry after a cloud save failed.
  const screeningLocked = Boolean(latestScreening?.id) && screeningEligibilityDate !== null && screeningEligibilityDate > new Date()
  const nextEligibleDate = screeningEligibilityDate

  const testsByRegion = useMemo(
    () =>
      MOBILITY_REGION_ORDER.map((region) => ({
        region,
        meta: MOBILITY_REGION_META[region],
        tests: mobilityScreeningTests.filter((item) => item.region === region),
      })),
    [],
  )
  const screeningAdvice = scores ? getMobilityScreeningAdvice(scores) : null

  useEffect(() => {
    async function loadEligibility() {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id

      if (!uid) {
        setEligibilityChecked(true)
        return
      }

      const [{ data: latest }] = await Promise.all([
        supabase.from('screening_questionnaires').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ])

      const localSnapshot = readStoredScreening()
      const cloudSnapshot = deriveScreeningSnapshot(latest)
      setLatestScreening(cloudSnapshot || (localSnapshot ? {
        created_at: localSnapshot.created_at,
        completed_at: null,
        assessed_at: null,
        responses: localSnapshot.answers || null,
      } : null))
      setEligibilityChecked(true)
    }

    void loadEligibility()
  }, [supabase])

  function pick(testId: string, value: number) {
    setAnswers((prev) => ({ ...prev, [testId]: value }))
  }

  function next() {
    if (step < TOTAL) {
      setStep((current) => current + 1)
      return
    }
    void finish()
  }

  function back() {
    if (step === 0) {
      router.push('/dashboard')
      return
    }
    setStep((current) => current - 1)
  }

  async function finish() {
    setSaving(true)
    setSaveError('')
    setSaveConfirmed(false)
    const nextScores = calculateMobilityScreeningScores(answers)
    setScores(nextScores)
    const savedAt = new Date().toISOString()

    writeStoredScreening({
      overall_score: nextScores.overall.pct,
      hip_score: nextScores.hips.pct,
      shoulder_score: nextScores.shoulders.pct,
      spine_score: nextScores.spine.pct,
      answers,
      created_at: savedAt,
    })

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (!uid) {
        throw new Error('Please sign in before saving your mobility screening.')
      }

      const insertPayload = buildScreeningQuestionnaireInsert(uid, answers)
      const { data, error } = await supabase
        .from('screening_questionnaires')
        .insert(insertPayload)
        .select('*')
        .single()

      if (error) {
        throw error
      }

      const cloudSnapshot = deriveScreeningSnapshot(data)
      if (!cloudSnapshot) {
        throw new Error('Your screening record was saved without responses. Run the Supabase screening migration, then submit the screening again.')
      }

      setLatestScreening(cloudSnapshot)
      setSaveConfirmed(true)
      setDone(true)
    } catch (error) {
      const message =
        typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Could not save your screening yet. Please try again.'

      console.error('[screening]', { error, message })
      setSaveError(message)
      setDone(true)
    }

    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: '#000' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1800&q=80)',
            backgroundSize: 'cover',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: 0.5,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.66) 0%,rgba(0,0,0,0.62) 40%,rgba(0,0,0,0.8) 100%)' }} />
      </div>

      <Header />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
        <div className="mg-assessment-shell">
          {step === 0 && eligibilityChecked && screeningLocked && latestScreening && nextEligibleDate && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Mobility Screening</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(40px, 10vw, 72px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 28 }}>
                SCREENING
                <br />
                ALREADY SAVED
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4.5vw, 24px)', lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 42, maxWidth: 760 }}>
                Your most recent mobility screening was saved on {formatDate(latestScreeningDate!)}. To keep the profile meaningful, you can retake it once every 30 days.
              </p>
              <div style={{ border: '1px solid rgba(0,180,216,0.16)', background: 'rgba(8,10,14,0.94)', padding: '28px 32px', marginBottom: 42, maxWidth: 720 }}>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 12, textTransform: UC }}>Next available</div>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 24, fontWeight: 700, letterSpacing: 3, color: 'var(--white)' }}>{formatDate(nextEligibleDate.toISOString())}</div>
              </div>
              <div className="mg-assessment-action-row">
                <button className="btn-primary" onClick={() => router.push('/results')}>VIEW MY SCORES</button>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>DASHBOARD</button>
              </div>
            </div>
          )}

          {step === 0 && eligibilityChecked && !screeningLocked && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Mobility Screening</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(42px, 11vw, 80px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 28 }}>
                AT-HOME
                <br />
                SELF-CHECK
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4.5vw, 24px)', lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 32, maxWidth: 760 }}>
                Six simplified self-assessments across shoulders, hips, and spine. This is the first step for every member because it creates the baseline score that drives what comes next.
              </p>
              {latestScreening && nextEligibleDate && (
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, lineHeight: 1.75, color: 'var(--silver3)', marginBottom: 44, maxWidth: 760 }}>
                  Your last screening was on {formatDate(latestScreeningDate!)}. Since the 30-day window has passed, you can update your profile again now.
                </p>
              )}

              <div style={{ display: 'grid', gap: 20, marginBottom: 56 }}>
                {testsByRegion.map(({ region, meta, tests }) => (
                  <div key={region} style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(180deg, rgba(255,255,255,0.03) 0%, rgba(8,10,14,0.98) 100%)', padding: '24px 24px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                      <meta.Icon size={30} color={meta.color} />
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(15px, 4vw, 18px)', fontWeight: 700, letterSpacing: 3, color: meta.color, textTransform: UC }}>
                      {meta.label}
                    </div>
                    </div>
                    <div className="mg-grid-2" style={{ gap: 14 }}>
                      {tests.map((item) => (
                        <div key={item.id} style={{ border: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)', padding: '18px 18px 16px' }}>
                          <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(13px, 3.8vw, 14px)', fontWeight: 500, letterSpacing: 1.5, color: 'var(--white)', marginBottom: 8 }}>
                            {item.name}
                          </div>
                          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver3)', lineHeight: 1.6 }}>
                            {item.subtitle}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mg-assessment-action-row">
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>BACK</button>
                {latestScreening && <button className="btn-outline" onClick={() => router.push('/results')}>PREVIOUS SCORES</button>}
                <button className="btn-primary" onClick={() => setStep(1)}>{latestScreening ? 'UPDATE SCREENING' : 'BEGIN SCREENING'}</button>
              </div>
            </div>
          )}

          {step > 0 && !done && test && regionMeta && (
            <div key={step} style={{ animation: 'fadeUp 0.35s ease forwards' }}>
              <div style={{ width: '100%', height: 3, background: 'var(--border)', marginBottom: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,var(--silver3),${regionMeta.color})`, transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 30, textTransform: UC }}>
                Test {step} of {TOTAL}
              </p>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, background: `${regionMeta.color}18`, border: `1px solid ${regionMeta.color}40`, padding: '16px 22px', marginBottom: 28, maxWidth: '100%' }}>
                <regionMeta.Icon size={34} color={regionMeta.color} />
                <span style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(16px, 4vw, 22px)', fontWeight: 700, letterSpacing: 3, color: regionMeta.color, textTransform: UC }}>
                  {regionMeta.label}
                </span>
              </div>

              <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(28px, 7vw, 54px)', fontWeight: 500, letterSpacing: 1.5, color: 'var(--white)', lineHeight: 1.1, marginBottom: 14 }}>
                {test.name}
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4.5vw, 24px)', color: 'var(--silver2)', marginBottom: 32, lineHeight: 1.6, maxWidth: 860 }}>
                {test.subtitle}
              </div>

              <div className="mg-assessment-test-grid" style={{ alignItems: 'start' }}>
                <div style={{ background: 'var(--black2)', padding: '34px 32px', display: 'flex', flexDirection: 'column', gap: 22 }}>
                  <div>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: regionMeta.color, marginBottom: 18, textTransform: UC }}>How to do it</p>
                    <div style={{ display: 'grid', gap: 14 }}>
                      {test.steps.map((item, index) => (
                        <div key={item} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1fr)', gap: 12, alignItems: 'start' }}>
                          <div style={{ width: 28, height: 28, borderRadius: 999, border: `1px solid ${regionMeta.color}50`, color: regionMeta.color, display: 'grid', placeItems: 'center', fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
                            {index + 1}
                          </div>
                          <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver)', lineHeight: 1.8 }}>
                            {item}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {testMedia?.image && (
                    <div>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={testMedia.image} alt={test.name} style={{ width: '100%', display: 'block', opacity: 0.94 }} />
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)' }}>
                  {test.options.map((option, index) => {
                    const selected = answers[test.id] === option.value
                    const accent = selected ? regionMeta.color : 'var(--silver3)'
                    return (
                        <div
                          key={option.id}
                          onClick={() => pick(test.id, option.value)}
                          style={{
                            flex: 1,
                            background: selected ? 'var(--black3)' : 'var(--black2)',
                            padding: '22px clamp(16px, 4.5vw, 24px)',
                            cursor: 'pointer',
                            transition: 'background 0.2s',
                            borderLeft: selected ? `6px solid ${regionMeta.color}` : '6px solid transparent',
                        }}
                        className="mg-assessment-option-row"
                      >
                        <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 16, letterSpacing: 2, color: selected ? accent : 'var(--silver4)', minWidth: 32, flexShrink: 0 }}>
                          {index + 1}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: 'block', fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(16px, 4.2vw, 22px)', fontWeight: 700, color: selected ? 'var(--white)' : 'var(--silver)', lineHeight: 1.3, marginBottom: 8 }}>
                            {option.label}
                          </span>
                          <span style={{ display: 'block', fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(14px, 3.8vw, 15px)', color: 'var(--silver2)', lineHeight: 1.65 }}>
                            {option.description}
                          </span>
                        </span>
                        {selected && (
                          <span style={{ marginLeft: 'auto', flexShrink: 0, display: 'flex' }}>
                            <IconCheckin size={24} color={accent} />
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="mg-assessment-action-row">
                <button className="btn-outline" onClick={back}>BACK</button>
                <button className="btn-primary" disabled={answers[test.id] === undefined} onClick={next}>
                  {step === TOTAL ? (saving ? 'SAVING...' : 'SEE MY RESULTS') : 'CONTINUE'}
                </button>
              </div>
              {saveError && (
                <div style={{ marginTop: 18, borderLeft: '3px solid #e74c3c', background: 'rgba(231,76,60,0.08)', padding: '14px 16px', fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: '#ffd7d2', lineHeight: 1.6 }}>
                  {saveError}
                </div>
              )}
            </div>
          )}

          {done && scores && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Your Mobility Profile</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(40px, 10vw, 72px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 60 }}>
                SCREENING
                <br />
                COMPLETE
              </p>

              <div style={{ border: '1px solid var(--border)', background: 'var(--black2)', padding: '56px 28px', marginBottom: 2, textAlign: CA }}>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(88px, 24vw, 160px)', fontWeight: 700, color: scoreLabel(scores.overall.pct).color, lineHeight: 1, letterSpacing: 4 }}>{scores.overall.pct}</p>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 'clamp(14px, 3.8vw, 18px)', letterSpacing: 6, color: 'var(--silver2)', marginTop: 16 }}>OVERALL MOBILITY SCORE</p>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 5, color: scoreLabel(scores.overall.pct).color, marginTop: 20 }}>{scoreLabel(scores.overall.pct).label}</p>
              </div>

              <div style={{ borderLeft: `6px solid ${saveConfirmed ? '#00b4d8' : '#e74c3c'}`, border: `1px solid ${saveConfirmed ? 'rgba(0,180,216,0.25)' : 'rgba(231,76,60,0.25)'}`, background: 'var(--black2)', padding: '22px 28px', marginBottom: 24 }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 4, color: saveConfirmed ? 'var(--cyan)' : '#ff8f8f', marginBottom: 10, textTransform: UC }}>
                  {saveConfirmed ? 'Score Saved' : 'Profile Save Failed'}
                </p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'var(--silver2)', lineHeight: 1.7 }}>
                  {saveConfirmed
                    ? 'Your mobility score is saved and will now drive your dashboard and results view.'
                    : saveError || 'Your score was calculated, but we could not save it to your profile. Please retake the screening or try again.'}
                </p>
              </div>

              <div className="mg-assessment-grid-3" style={{ borderTop: 'none', marginBottom: 48 }}>
                {MOBILITY_REGION_ORDER.map((region) => {
                  const score = scores[region]
                  const status = scoreLabel(score.pct)
                  const RegionSummaryIcon = MOBILITY_REGION_META[region].Icon
                  return (
                    <div key={region} style={{ background: 'var(--black2)', padding: '56px 32px', textAlign: CA }}>
                      <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}><RegionSummaryIcon size={56} color={status.color} /></span>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 3, color: 'var(--silver)', marginBottom: 24, textTransform: UC }}>{MOBILITY_REGION_META[region].label}</p>
                      <div style={{ height: 3, background: 'var(--silver4)', marginBottom: 16, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${score.pct}%`, background: status.color, transition: 'width 1.2s ease' }} />
                      </div>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 56, color: status.color, marginBottom: 10, letterSpacing: 2 }}>{score.pct}<span style={{ fontSize: 22, color: 'var(--silver3)' }}>%</span></p>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, letterSpacing: 4, color: status.color, textTransform: UC }}>{status.label}</p>
                    </div>
                  )
                })}
              </div>

              {screeningAdvice && (
                <div style={{ display: 'grid', gap: 18, marginBottom: 48 }}>
                  <div style={{ borderLeft: `6px solid ${scoreLabel(scores.overall.pct).color}`, border: '1px solid rgba(255,255,255,0.08)', background: 'var(--black2)', padding: '28px 30px' }}>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 12, textTransform: UC }}>
                      What this score means
                    </p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4vw, 23px)', color: 'var(--silver2)', lineHeight: 1.8 }}>
                      {screeningAdvice.overall}
                    </p>
                  </div>

                  <div style={{ borderLeft: `6px solid ${MOBILITY_REGION_META[screeningAdvice.weakestRegion].color}`, border: '1px solid rgba(255,255,255,0.08)', background: 'var(--black2)', padding: '28px 30px' }}>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 4, color: MOBILITY_REGION_META[screeningAdvice.weakestRegion].color, marginBottom: 12, textTransform: UC }}>
                      Main focus
                    </p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(20px, 4.5vw, 28px)', fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 16 }}>
                      {screeningAdvice.weakestTitle}
                    </p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'var(--silver2)', lineHeight: 1.8, marginBottom: 14 }}>
                      {screeningAdvice.weakestSummary}
                    </p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'var(--silver)', lineHeight: 1.8 }}>
                      {screeningAdvice.nextStep}
                    </p>
                  </div>
                </div>
              )}

              <div style={{ background: 'var(--black2)', padding: '40px 36px', marginBottom: 48 }}>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 16, textTransform: UC }}>
                  What happens next
                </p>
                <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 'clamp(18px, 4.2vw, 24px)', color: 'var(--silver2)', lineHeight: 1.8 }}>
                  Your screening is done. Head back to the dashboard and create your routine from this baseline.
                </p>
              </div>

              <div className="mg-assessment-action-row">
                <button className="btn-outline" onClick={() => router.push('/results')}>VIEW ALL RESULTS</button>
                <button className="btn-primary" onClick={() => router.push('/dashboard')}>
                  BACK TO DASHBOARD
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
