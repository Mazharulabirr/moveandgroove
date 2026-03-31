'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

type Option   = { id: string; label: string; value: number }
type Region   = 'hips' | 'shoulders' | 'spine' | 'general'
type Question = {
  id: string; region: Region; regionLabel: string; regionIcon: string
  text: string; sub: string; instruction: string
  photo: string | null; ytSearch: string | null; options: Option[]
}
type Scores = Record<string, { raw: number; max: number; pct: number }>

const UC = 'uppercase' as const
const CA = 'center' as const

const QUESTIONS: Question[] = [
  {
    id: 'activity_level', region: 'general', regionLabel: 'GENERAL', regionIcon: '⚡',
    text: 'HOW ACTIVE ARE YOU?',
    sub: 'Helps us calibrate intensity and volume.',
    instruction: 'Think about a typical week — training, gym, sport, or walking.',
    photo: null, ytSearch: null,
    options: [
      { id: 'sedentary', label: 'Sedentary — mostly sitting',        value: 1 },
      { id: 'light',     label: 'Light — casual walks or gym',       value: 2 },
      { id: 'moderate',  label: 'Moderate — 3 to 4 times a week',    value: 3 },
      { id: 'very',      label: 'Very Active — daily training',      value: 4 },
    ],
  },
  {
    id: 'pain_presence', region: 'general', regionLabel: 'GENERAL', regionIcon: '⚡',
    text: 'ANY CURRENT PAIN?',
    sub: 'Flags areas that need modified loading or extra care.',
    instruction: 'Think about the last 2 weeks — any aches or injuries anywhere.',
    photo: null, ytSearch: null,
    options: [
      { id: 'none',     label: 'No pain at all',              value: 0 },
      { id: 'mild',     label: 'Mild — barely noticeable',    value: 1 },
      { id: 'moderate', label: 'Moderate — notice it daily',  value: 2 },
      { id: 'severe',   label: 'Severe — limits movement',    value: 3 },
    ],
  },
  {
    id: 'hip_flexion', region: 'hips', regionLabel: 'HIPS', regionIcon: '🦵',
    text: 'KNEE TO CHEST — HOW FAR?',
    sub: 'Tests hip flexion — how well your hip folds toward your body.',
    instruction: 'Lie flat on your back. Pull one knee toward your chest with both hands. Keep your lower back pressed flat — do not let your pelvis tilt or the other leg lift.',
    photo: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=700&q=80&fit=crop',
    ytSearch: 'knee+to+chest+hip+flexion+mobility+self+test',
    options: [
      { id: 'full',    label: 'Knee touches my chest',        value: 3 },
      { id: 'good',    label: 'Close — a few cm away',        value: 2 },
      { id: 'limited', label: 'Noticeable pull — stops short', value: 1 },
      { id: 'very',    label: 'Very stiff — barely moves',    value: 0 },
    ],
  },
  {
    id: 'hip_rotation', region: 'hips', regionLabel: 'HIPS', regionIcon: '🦵',
    text: 'HIP ROTATION — BOTH WAYS?',
    sub: 'Tests how freely your hip rotates — critical for sport.',
    instruction: 'Sit on a chair edge, feet hanging. Rotate one foot inward then outward. Thigh stays still — only the lower leg moves. Compare left vs right.',
    photo: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=700&q=80&fit=crop',
    ytSearch: 'hip+internal+external+rotation+mobility+self+test+seated',
    options: [
      { id: 'full',     label: 'Full equal range both ways',   value: 3 },
      { id: 'slight',   label: 'Slight restriction one side',  value: 2 },
      { id: 'moderate', label: 'Restricted both directions',   value: 1 },
      { id: 'pain',     label: 'Painful or very limited',      value: 0 },
    ],
  },
  {
    id: 'hip_stiffness', region: 'hips', regionLabel: 'HIPS', regionIcon: '🦵',
    text: 'MORNING HIP STIFFNESS?',
    sub: 'Prolonged stiffness is a key indicator of joint restriction.',
    instruction: 'When you first get out of bed — how do your hips feel? How long until they loosen off?',
    photo: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=700&q=80&fit=crop',
    ytSearch: 'morning+hip+stiffness+mobility+assessment',
    options: [
      { id: 'none',      label: 'No stiffness at all',          value: 3 },
      { id: 'brief',     label: 'Clears within 5 minutes',      value: 2 },
      { id: 'prolonged', label: 'Stiff for 30+ minutes',        value: 1 },
      { id: 'all_day',   label: 'Persists most of the day',     value: 0 },
    ],
  },
  {
    id: 'shoulder_overhead', region: 'shoulders', regionLabel: 'SHOULDERS', regionIcon: '💪',
    text: 'ARMS OVERHEAD — FULLY VERTICAL?',
    sub: 'Tests shoulder flexion and upper back mobility.',
    instruction: 'Stand back flat against a wall. Raise both arms overhead, thumbs aiming to touch the wall. Keep your lower back pressed flat — do not let it arch away.',
    photo: 'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?w=700&q=80&fit=crop',
    ytSearch: 'shoulder+overhead+mobility+wall+test+assessment',
    options: [
      { id: 'full',    label: 'Both arms vertical, back flat',  value: 3 },
      { id: 'good',    label: 'Almost — back stays mostly flat', value: 2 },
      { id: 'limited', label: 'Stops before vertical',          value: 1 },
      { id: 'pain',    label: 'Painful or very restricted',     value: 0 },
    ],
  },
  {
    id: 'shoulder_rotation', region: 'shoulders', regionLabel: 'SHOULDERS', regionIcon: '💪',
    text: 'SCRATCH TEST — REACH BOTH WAYS?',
    sub: 'Tests internal and external shoulder rotation.',
    instruction: 'One hand up your back from below, other hand down from above. Try to touch fingers. Repeat both sides. This is the Apley Scratch Test.',
    photo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=700&q=80&fit=crop',
    ytSearch: 'apley+scratch+test+shoulder+rotation+mobility',
    options: [
      { id: 'full',     label: 'Fingers overlap both sides',    value: 3 },
      { id: 'slight',   label: 'Almost touch — small gap',      value: 2 },
      { id: 'moderate', label: 'Large gap one or both sides',   value: 1 },
      { id: 'severe',   label: 'Very restricted or painful',    value: 0 },
    ],
  },
  {
    id: 'shoulder_stability', region: 'shoulders', regionLabel: 'SHOULDERS', regionIcon: '💪',
    text: 'SHOULDERS STABLE WHEN PUSHING?',
    sub: 'Reflects rotator cuff strength and joint integrity.',
    instruction: 'Think about push-ups, overhead press, or pushing a door. Do your shoulders feel solid, or do they shift, click, or feel like they might give way?',
    photo: 'https://images.unsplash.com/photo-1616803689943-5601631c7fec?w=700&q=80&fit=crop',
    ytSearch: 'shoulder+stability+rotator+cuff+self+assessment',
    options: [
      { id: 'stable',   label: 'Fully stable and in control',   value: 3 },
      { id: 'mostly',   label: 'Mostly — minor clicking',       value: 2 },
      { id: 'unstable', label: 'Sometimes shifts or grinds',    value: 1 },
      { id: 'very',     label: 'Unstable, painful, gives way',  value: 0 },
    ],
  },
  {
    id: 'thoracic_rotation', region: 'spine', regionLabel: 'SPINE', regionIcon: '🦴',
    text: 'SEATED ROTATION — HOW FAR?',
    sub: 'Tests thoracic rotation — most restricted in athletes.',
    instruction: 'Sit upright, feet flat, arms crossed over chest. Rotate upper body left then right. Only torso turns — hips and legs stay still.',
    photo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80&fit=crop',
    ytSearch: 'thoracic+spine+rotation+mobility+seated+test',
    options: [
      { id: 'full',    label: 'Equal rotation both ways',       value: 3 },
      { id: 'good',    label: 'Good — slightly more one side',  value: 2 },
      { id: 'limited', label: 'Noticeably restricted',          value: 1 },
      { id: 'pain',    label: 'Painful to rotate',              value: 0 },
    ],
  },
  {
    id: 'lumbar_flexion', region: 'spine', regionLabel: 'SPINE', regionIcon: '🦴',
    text: 'TOE TOUCH — HOW FAR?',
    sub: 'Screens lower back and hamstring flexibility.',
    instruction: 'Stand, feet together, legs straight. Bend forward slowly — do not bounce. Where do your fingertips reach?',
    photo: 'https://images.unsplash.com/photo-1552196563-55cd4e45efb3?w=700&q=80&fit=crop',
    ytSearch: 'toe+touch+test+lumbar+flexibility+assessment',
    options: [
      { id: 'floor', label: 'Palms flat on the floor',    value: 3 },
      { id: 'toes',  label: 'Fingertips reach toes',      value: 2 },
      { id: 'shin',  label: 'Mid-shin or above',          value: 1 },
      { id: 'knee',  label: 'Knees or higher',            value: 0 },
    ],
  },
  {
    id: 'spine_pain', region: 'spine', regionLabel: 'SPINE', regionIcon: '🦴',
    text: 'BACK OR NECK PAIN — HOW OFTEN?',
    sub: 'Baseline to track improvement over time.',
    instruction: 'Last 4 weeks — how often did you feel pain or aching anywhere in your back or neck?',
    photo: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=700&q=80&fit=crop',
    ytSearch: null,
    options: [
      { id: 'never',     label: 'Never',                     value: 3 },
      { id: 'rarely',    label: 'Rarely — once a month',     value: 2 },
      { id: 'sometimes', label: 'Sometimes — weekly',        value: 1 },
      { id: 'daily',     label: 'Daily or almost every day', value: 0 },
    ],
  },
]

const TOTAL = QUESTIONS.length

function calcScores(answers: Record<string, number>): Scores {
  const regions: Array<'hips' | 'shoulders' | 'spine'> = ['hips', 'shoulders', 'spine']
  const scores: Scores = {}
  for (const region of regions) {
    const qs = QUESTIONS.filter(q => q.region === region)
    const max = qs.length * 3
    const raw = qs.reduce((s, q) => s + (answers[q.id] ?? 0), 0)
    scores[region] = { raw, max, pct: Math.round((raw / max) * 100) }
  }
  const all = QUESTIONS.filter(q => q.region !== 'general')
  const totalMax = all.length * 3
  const totalRaw = all.reduce((s, q) => s + (answers[q.id] ?? 0), 0)
  scores.overall = { raw: totalRaw, max: totalMax, pct: Math.round((totalRaw / totalMax) * 100) }
  return scores
}

function scoreLabel(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: 'EXCELLENT', color: '#00b4d8' }
  if (pct >= 60) return { label: 'GOOD',      color: '#4ac8e8' }
  if (pct >= 40) return { label: 'FAIR',      color: '#e8a94a' }
  return               { label: 'NEEDS WORK', color: '#e74c3c' }
}

const RC: Record<string, string> = {
  hips: '#00b4d8', shoulders: '#4ac8e8', spine: '#7ecfe0', general: '#8e9aa8',
}

export default function ScreeningPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [step,    setStep]    = useState(0)
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState(false)
  const [scores,  setScores]  = useState<Scores | null>(null)

  const q        = QUESTIONS[step - 1]
  const progress = step === 0 ? 0 : Math.round((step / TOTAL) * 100)
  const rc       = q ? RC[q.region] : 'var(--cyan)'
  const isGeneral = q && q.photo === null

  function pick(qId: string, value: number) {
    setAnswers(prev => ({ ...prev, [qId]: value }))
  }
  function next() { if (step < TOTAL) setStep(s => s + 1); else finish() }
  function back() { if (step === 0) router.push('/dashboard'); else setStep(s => s - 1) }

  async function finish() {
    setSaving(true)
    const s = calcScores(answers)
    setScores(s)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) {
        const { data: scr, error: e1 } = await supabase
          .from('screening_questionnaires')
          .insert([{ user_id: uid, responses: answers, completed_at: new Date().toISOString() }])
          .select().single()
        if (e1) throw e1
        await supabase.from('screening_results').insert([{
          user_id: uid, questionnaire_id: scr.id,
          hip_score: s.hips.pct, shoulder_score: s.shoulders.pct,
          spine_score: s.spine.pct, overall_score: s.overall.pct,
          raw_scores: s, assessed_at: new Date().toISOString(),
        }])
      }
    } catch (err) { console.error('[screening]', err) }
    setSaving(false)
    setDone(true)
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=1920&q=80&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '60px 100px' }}>

          {/* ── INTRO ── */}
          {step === 0 && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Mobility Screening</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 80, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 28 }}>UNDERSTAND<br />YOUR BODY</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 64, maxWidth: 700 }}>
                11 questions across hips, shoulders, and spine. Takes 3 minutes — get your regional mobility score and personalised recommendations.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 64 }}>
                {[
                  { icon: '🦵', label: 'Hips',     color: RC.hips },
                  { icon: '💪', label: 'Shoulders', color: RC.shoulders },
                  { icon: '🦴', label: 'Spine',     color: RC.spine },
                ].map(r => (
                  <div key={r.label} style={{ background: 'var(--black2)', padding: '60px 24px', textAlign: CA }}>
                    <span style={{ fontSize: 64, display: 'block', marginBottom: 20 }}>{r.icon}</span>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 3, color: r.color, marginBottom: 12 }}>{r.label}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 14, letterSpacing: 2, color: 'var(--silver3)' }}>3 questions</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>← BACK</button>
                <button className="btn-primary" onClick={() => setStep(1)}>BEGIN SCREENING →</button>
              </div>
            </div>
          )}

          {/* ── QUESTIONS ── */}
          {step > 0 && !done && q && (
            <div key={step} style={{ animation: 'fadeUp 0.35s ease forwards' }}>

              {/* Progress */}
              <div style={{ width: '100%', height: 3, background: 'var(--border)', marginBottom: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: progress + '%', background: 'linear-gradient(90deg,var(--silver3),' + rc + ')', transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 44, textTransform: UC }}>Question {step} of {TOTAL}</p>

              {/* Region badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, background: rc + '20', border: '1px solid ' + rc + '50', padding: '18px 40px', marginBottom: 44 }}>
                <span style={{ fontSize: 40 }}>{q.regionIcon}</span>
                <span style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 4, color: rc, textTransform: UC }}>{q.regionLabel}</span>
              </div>

              {/* Question heading */}
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 64, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.1, marginBottom: 20 }}>{q.text}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, color: 'var(--silver2)', marginBottom: 44, lineHeight: 1.6 }}>{q.sub}</p>

              {/* GENERAL questions — full width, no photo */}
              {isGeneral && (
                <div style={{ marginBottom: 48 }}>
                  <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 20, color: 'var(--silver)', marginBottom: 32, lineHeight: 1.7, maxWidth: 700, padding: '24px 28px', background: 'var(--black2)', border: '1px solid var(--border)' }}>{q.instruction}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {q.options.map((opt, i) => {
                      const sel = answers[q.id] === opt.value
                      return (
                        <div
                          key={opt.id}
                          onClick={() => pick(q.id, opt.value)}
                          style={{ background: sel ? 'var(--black3)' : 'var(--black2)', padding: '32px 48px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 28, borderLeft: sel ? '6px solid ' + rc : '6px solid transparent' }}
                          onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--black3)' }}
                          onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--black2)' }}
                        >
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, letterSpacing: 2, color: sel ? rc : 'var(--silver4)', minWidth: 32, flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 26, fontWeight: sel ? 600 : 400, color: sel ? 'var(--white)' : 'var(--silver)', lineHeight: 1.4 }}>{opt.label}</span>
                          {sel && <span style={{ marginLeft: 'auto', flexShrink: 0, width: 34, height: 34, borderRadius: '50%', background: rc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--black)', fontWeight: 700 }}>✓</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* PHYSICAL TEST questions — two columns with photo */}
              {!isGeneral && (
                <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 48 }}>
                  {/* Left: instruction + photo */}
                  <div style={{ background: 'var(--black2)', padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 28 }}>
                    <div>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: rc, marginBottom: 18, textTransform: UC }}>How to test yourself</p>
                      <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 20, lineHeight: 1.85, color: 'var(--silver)' }}>{q.instruction}</p>
                    </div>
                    {q.photo && (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={q.photo} alt={q.regionLabel} style={{ width: '100%', display: 'block', opacity: 0.88 }} />
                        {q.ytSearch && (
                          
                          <a href={`https://www.youtube.com/results?search_query=${q.ytSearch}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, background: 'rgba(255,0,0,0.12)', border: '1px solid rgba(255,0,0,0.3)', padding: '16px 20px', textDecoration: 'none', marginTop: 2 }}
                          >
                            <span style={{ fontSize: 20, color: '#ff0000' }}>▶</span>
                            <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 2, color: '#ff6b6b' }}>FIND DEMO VIDEO</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)' }}>
                    {q.options.map((opt, i) => {
                      const sel = answers[q.id] === opt.value
                      return (
                        <div
                          key={opt.id}
                          onClick={() => pick(q.id, opt.value)}
                          style={{ flex: 1, background: sel ? 'var(--black3)' : 'var(--black2)', padding: '36px 48px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 28, borderLeft: sel ? '6px solid ' + rc : '6px solid transparent' }}
                          onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--black3)' }}
                          onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--black2)' }}
                        >
                          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, letterSpacing: 2, color: sel ? rc : 'var(--silver4)', minWidth: 32, flexShrink: 0 }}>{i + 1}</span>
                          <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 26, fontWeight: sel ? 600 : 400, color: sel ? 'var(--white)' : 'var(--silver)', lineHeight: 1.4 }}>{opt.label}</span>
                          {sel && <span style={{ marginLeft: 'auto', flexShrink: 0, width: 34, height: 34, borderRadius: '50%', background: rc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, color: 'var(--black)', fontWeight: 700 }}>✓</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={back}>← BACK</button>
                <button className="btn-primary" disabled={answers[q.id] === undefined} onClick={next}>
                  {step === TOTAL ? (saving ? 'SAVING…' : 'SEE MY RESULTS →') : 'CONTINUE →'}
                </button>
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {done && scores && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Your Mobility Profile</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 60 }}>SCREENING<br />COMPLETE</p>

              {/* Overall */}
              <div style={{ border: '1px solid var(--border)', background: 'var(--black2)', padding: '80px 56px', marginBottom: 2, textAlign: CA }}>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 160, fontWeight: 700, color: scoreLabel(scores.overall.pct).color, lineHeight: 1, letterSpacing: 4 }}>{scores.overall.pct}</p>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, letterSpacing: 6, color: 'var(--silver2)', marginTop: 16 }}>OVERALL MOBILITY SCORE</p>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 5, color: scoreLabel(scores.overall.pct).color, marginTop: 20 }}>{scoreLabel(scores.overall.pct).label}</p>
              </div>

              {/* Regional */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', borderTop: 'none', marginBottom: 48 }}>
                {(['hips', 'shoulders', 'spine'] as const).map(region => {
                  const s = scores[region]
                  const { label, color } = scoreLabel(s.pct)
                  const icons: Record<string, string> = { hips: '🦵', shoulders: '💪', spine: '🦴' }
                  return (
                    <div key={region} style={{ background: 'var(--black2)', padding: '56px 32px', textAlign: CA }}>
                      <span style={{ fontSize: 64, display: 'block', marginBottom: 20 }}>{icons[region]}</span>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 16, fontWeight: 700, letterSpacing: 3, color: 'var(--silver)', marginBottom: 24, textTransform: UC }}>{region}</p>
                      <div style={{ height: 3, background: 'var(--silver4)', marginBottom: 16, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: s.pct + '%', background: color, transition: 'width 1.2s ease' }} />
                      </div>
                      <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 56, color: color, marginBottom: 10, letterSpacing: 2 }}>{s.pct}<span style={{ fontSize: 22, color: 'var(--silver3)' }}>%</span></p>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, letterSpacing: 4, color: color, textTransform: UC }}>{label}</p>
                    </div>
                  )
                })}
              </div>

              {/* Priority */}
              {(() => {
                const rk: Array<'hips' | 'shoulders' | 'spine'> = ['hips', 'shoulders', 'spine']
                const weakest = [...rk].sort((a, b) => scores[a].pct - scores[b].pct)[0]
                const { color } = scoreLabel(scores[weakest].pct)
                const rl: Record<string, string> = { hips: 'Hip Mobility', shoulders: 'Shoulder Mobility', spine: 'Spinal Mobility' }
                return (
                  <div style={{ borderLeft: '6px solid ' + color, border: '1px solid ' + color + '30', background: 'var(--black2)', padding: '40px 48px', marginBottom: 52 }}>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: color, marginBottom: 18, textTransform: UC }}>Priority Area</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 18 }}>{rl[weakest]}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', lineHeight: 1.7 }}>
                      Your {weakest} scored lowest at {scores[weakest].pct}%. Start your next routine with a {weakest}-focused session. Score reassessed at end of your current training block.
                    </p>
                  </div>
                )
              })()}

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => router.push('/quiz')}>BUILD MY ROUTINE →</button>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>DASHBOARD</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}