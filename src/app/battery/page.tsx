'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

const UC = 'uppercase' as const
const CA = 'center' as const

type Test = {
  id: string
  label: string
  icon: string
  focus: string
  what: string
  instruction: string
  photo: string
  ytSearch: string
  scores: { value: number; label: string; description: string }[]
}

const TESTS: Test[] = [
  {
    id: 'deep_squat',
    label: 'DEEP SQUAT',
    icon: '🏋️',
    focus: 'Hips · Ankles · Thoracic Spine',
    what: 'The deep squat tests bilateral, symmetrical mobility of the hips, knees, and ankles, plus thoracic extension and shoulder flexion.',
    instruction: 'Stand with feet shoulder-width apart, toes slightly out. Hold a dowel or broomstick overhead with arms fully extended. Squat as deep as possible, keeping heels flat, chest up, and the stick overhead. Do not let your knees cave inward.',
    photo: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=700&q=80&fit=crop',
    ytSearch: 'deep+squat+FMS+movement+screen+how+to+score',
    scores: [
      { value: 3, label: 'Full depth', description: 'Hips below knees, heels flat, torso upright, stick directly overhead' },
      { value: 2, label: 'Partial depth', description: 'Hips at or near knee level, minor compensation — heels raised or trunk tilts' },
      { value: 1, label: 'Poor depth', description: 'Cannot reach parallel, significant compensation or heels lift' },
      { value: 0, label: 'Pain', description: 'Pain present during the movement' },
    ],
  },
  {
    id: 'hip_hinge',
    label: 'HIP HINGE',
    icon: '🔄',
    focus: 'Hamstrings · Glutes · Lower Back',
    what: 'The hip hinge tests your ability to load the posterior chain while maintaining a neutral spine — the foundation of all athletic movement.',
    instruction: 'Stand tall, feet hip-width apart. Place a dowel or stick along your spine (touching head, upper back, and tailbone). Hinge forward at the hips, pushing them back, keeping the stick in contact at all three points. Knees soft, not bent. Hinge until you feel a hamstring pull, then return.',
    photo: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=700&q=80&fit=crop',
    ytSearch: 'hip+hinge+movement+screen+assessment+how+to',
    scores: [
      { value: 3, label: 'Perfect hinge', description: 'Stick maintains all 3 contact points throughout, neutral spine, full range' },
      { value: 2, label: 'Good hinge', description: 'Loses one contact point, minor rounding or knee bend compensation' },
      { value: 1, label: 'Poor hinge', description: 'Loses two contact points, significant spine flexion or knee dominance' },
      { value: 0, label: 'Pain', description: 'Pain present during the movement' },
    ],
  },
  {
    id: 'shoulder_press',
    label: 'SHOULDER PRESS',
    icon: '🏅',
    focus: 'Shoulder Flexion · Thoracic Extension · Lat Length',
    what: 'Tests overhead shoulder mobility and stability — the ability to get the arms fully vertical without compensating through the lower back.',
    instruction: 'Stand with back flat against a wall, feet 15cm from the wall. Arms at sides, elbows bent 90°. Slide both arms up the wall, trying to get them fully overhead (thumbs touching wall) while keeping your lower back flat against the wall throughout.',
    photo: 'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?w=700&q=80&fit=crop',
    ytSearch: 'shoulder+overhead+press+mobility+wall+test+assessment',
    scores: [
      { value: 3, label: 'Full overhead', description: 'Both arms reach vertical, lower back stays flat on wall throughout' },
      { value: 2, label: 'Near overhead', description: 'Arms nearly vertical, minor lower back lift or one arm lags' },
      { value: 1, label: 'Restricted', description: 'Arms stop significantly before vertical, back lifts off wall' },
      { value: 0, label: 'Pain', description: 'Pain present during the movement' },
    ],
  },
  {
    id: 'lunge',
    label: 'INLINE LUNGE',
    icon: '🦵',
    focus: 'Hip Flexor · Quad · Glute · Knee Stability',
    what: 'The inline lunge tests hip mobility, knee stability, and trunk control in the sagittal plane — key for running, cutting, and single-leg movement.',
    instruction: 'Stand on a line or place a stick on the floor. Step forward into a lunge with your front foot on the line. Lower your back knee to tap the ground behind your front heel. Keep your torso upright, front knee tracking over toes. Return and repeat on both sides.',
    photo: 'https://images.unsplash.com/photo-1434608519344-49d77a124f2a?w=700&q=80&fit=crop',
    ytSearch: 'inline+lunge+FMS+movement+screen+assessment',
    scores: [
      { value: 3, label: 'Clean lunge', description: 'Trunk upright, knee tracks toes, back knee taps behind heel, no wobble' },
      { value: 2, label: 'Minor fault', description: 'Slight trunk lean, knee deviation, or balance loss on one side' },
      { value: 1, label: 'Major fault', description: 'Significant trunk lean, knee collapse, or cannot complete the movement' },
      { value: 0, label: 'Pain', description: 'Pain present during the movement' },
    ],
  },
  {
    id: 'rotation',
    label: 'SEATED ROTATION',
    icon: '🌀',
    focus: 'Thoracic Spine · Rib Cage · Shoulder Girdle',
    what: 'Tests thoracic rotation — the most restricted movement in desk workers and athletes alike, and critical for all rotational sport performance.',
    instruction: 'Sit upright on a chair, feet flat, knees at 90°. Cross your arms over your chest. Rotate your upper body as far left as possible, hold 1 second, return. Then as far right. Keep hips and feet completely still throughout — only the torso moves.',
    photo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80&fit=crop',
    ytSearch: 'thoracic+rotation+mobility+test+seated+assessment+FMS',
    scores: [
      { value: 3, label: 'Full rotation', description: 'Shoulder rotates past midline both ways, hips stay completely still' },
      { value: 2, label: 'Good rotation', description: 'Reaches midline, minor hip shift or asymmetry between sides' },
      { value: 1, label: 'Poor rotation', description: 'Cannot reach midline, significant hip movement or compensation' },
      { value: 0, label: 'Pain', description: 'Pain present during the movement' },
    ],
  },
]

type BatteryScores = Record<string, number>

function totalScore(scores: BatteryScores) {
  return Object.values(scores).reduce((s, v) => s + v, 0)
}

function scoreColor(score: number, max: number) {
  const pct = (score / max) * 100
  if (pct >= 80) return '#00b4d8'
  if (pct >= 60) return '#4ac8e8'
  if (pct >= 40) return '#e8a94a'
  return '#e74c3c'
}

function scoreLabel(score: number, max: number) {
  const pct = (score / max) * 100
  if (pct >= 80) return 'EXCELLENT'
  if (pct >= 60) return 'GOOD'
  if (pct >= 40) return 'FAIR'
  return 'NEEDS WORK'
}

export default function BatteryPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [step,   setStep]   = useState(0) // 0 = intro, 1-5 = tests, 6 = results
  const [scores, setScores] = useState<BatteryScores>({})
  const [saving, setSaving] = useState(false)

  const test     = TESTS[step - 1]
  const progress = step === 0 ? 0 : Math.round((step / TESTS.length) * 100)
  const isDone   = step > TESTS.length

  function pick(testId: string, value: number) {
    setScores(prev => ({ ...prev, [testId]: value }))
  }

  function next() {
    if (step <= TESTS.length) setStep(s => s + 1)
    if (step === TESTS.length) finish()
  }

  function back() {
    if (step === 0) router.push('/dashboard')
    else setStep(s => s - 1)
  }

  async function finish() {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) {
        await supabase.from('test_results').insert([{
          user_id:     uid,
          scores:      scores,
          total_score: totalScore(scores),
          max_score:   TESTS.length * 3,
          assessed_at: new Date().toISOString(),
        }])
      }
    } catch (err) { console.error('[battery]', err) }
    setSaving(false)
  }

  const total    = totalScore(scores)
  const maxScore = TESTS.length * 3

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1920&q=80&fit=crop)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '60px 100px' }}>

          {/* ── INTRO ── */}
          {step === 0 && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Movement Battery</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 80, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 28 }}>5 MOVEMENT<br />TESTS</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 64, maxWidth: 700 }}>
                Five fundamental movement patterns scored 0–3. Takes about 10 minutes — identifies your weakest movement patterns and guides your training priorities.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 64 }}>
                {TESTS.map((t, i) => (
                  <div key={t.id} style={{ background: 'var(--black2)', padding: '40px 16px', textAlign: CA }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 3, color: 'var(--silver3)', display: 'block', marginBottom: 12 }}>0{i + 1}</span>
                    <span style={{ fontSize: 40, display: 'block', marginBottom: 16 }}>{t.icon}</span>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan)', marginBottom: 8 }}>{t.label}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1, color: 'var(--silver3)', lineHeight: 1.5 }}>{t.focus}</p>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '28px 36px', marginBottom: 56, display: 'flex', gap: 48 }}>
                {[
                  { n: '3', label: 'Perfect — no compensation' },
                  { n: '2', label: 'Good — minor compensation' },
                  { n: '1', label: 'Poor — major fault' },
                  { n: '0', label: 'Pain present' },
                ].map(s => (
                  <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 32, fontWeight: 700, color: 'var(--cyan)', minWidth: 28 }}>{s.n}</span>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'var(--silver2)' }}>{s.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>← BACK</button>
                <button className="btn-primary" onClick={() => setStep(1)}>BEGIN TESTS →</button>
              </div>
            </div>
          )}

          {/* ── TESTS ── */}
          {step > 0 && !isDone && test && (
            <div key={step} style={{ animation: 'fadeUp 0.35s ease forwards' }}>
              {/* Progress */}
              <div style={{ width: '100%', height: 3, background: 'var(--border)', marginBottom: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: progress + '%', background: 'linear-gradient(90deg,var(--silver3),var(--cyan))', transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 44, textTransform: UC }}>Test {step} of {TESTS.length}</p>

              {/* Test header */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, background: 'rgba(0,180,216,0.12)', border: '1px solid rgba(0,180,216,0.3)', padding: '18px 40px', marginBottom: 44 }}>
                <span style={{ fontSize: 40 }}>{test.icon}</span>
                <span style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 4, color: 'var(--cyan)', textTransform: UC }}>{test.label}</span>
              </div>

              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 3, color: 'var(--silver3)', marginBottom: 12, textTransform: UC }}>{test.focus}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', marginBottom: 44, lineHeight: 1.6, maxWidth: 900 }}>{test.what}</p>

              {/* Two columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 48 }}>
                {/* Left: instruction + photo */}
                <div style={{ background: 'var(--black2)', padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 28 }}>
                  <div>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: 'var(--cyan)', marginBottom: 18, textTransform: UC }}>How to perform</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 20, lineHeight: 1.85, color: 'var(--silver)' }}>{test.instruction}</p>
                  </div>
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={test.photo} alt={test.label} style={{ width: '100%', display: 'block', opacity: 0.88 }} />
                    
                      <a href={`https://www.youtube.com/results?search_query=${test.ytSearch}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: CA, gap: 12, background: 'rgba(255,0,0,0.12)', border: '1px solid rgba(255,0,0,0.3)', padding: '16px 20px', textDecoration: 'none', marginTop: 2 }}
                    >
                      <span style={{ fontSize: 20, color: '#ff0000' }}>▶</span>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 2, color: '#ff6b6b' }}>FIND DEMO VIDEO</span>
                    </a>
                  </div>
                </div>

                {/* Right: scoring options */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)' }}>
                  {test.scores.map(s => {
                    const sel = scores[test.id] === s.value
                    const col = s.value === 0 ? '#e74c3c' : s.value === 1 ? '#e8a94a' : s.value === 2 ? '#4ac8e8' : '#00b4d8'
                    return (
                      <div
                        key={s.value}
                        onClick={() => pick(test.id, s.value)}
                        style={{ flex: 1, background: sel ? 'var(--black3)' : 'var(--black2)', padding: '32px 48px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 28, borderLeft: sel ? '6px solid ' + col : '6px solid transparent' }}
                        onMouseEnter={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--black3)' }}
                        onMouseLeave={e => { if (!sel) (e.currentTarget as HTMLDivElement).style.background = 'var(--black2)' }}
                      >
                        <span style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 36, fontWeight: 700, color: sel ? col : 'var(--silver4)', minWidth: 48, flexShrink: 0 }}>{s.value}</span>
                        <div>
                          <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 16, fontWeight: 700, color: sel ? 'var(--white)' : 'var(--silver)', letterSpacing: 2, marginBottom: 6 }}>{s.label}</p>
                          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, color: sel ? 'var(--silver2)' : 'var(--silver3)', lineHeight: 1.4 }}>{s.description}</p>
                        </div>
                        {sel && <span style={{ marginLeft: 'auto', flexShrink: 0, width: 34, height: 34, borderRadius: '50%', background: col, display: 'flex', alignItems: 'center', justifyContent: CA, fontSize: 16, color: 'var(--black)', fontWeight: 700 }}>✓</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={back}>← BACK</button>
                <button className="btn-primary" disabled={scores[test.id] === undefined} onClick={next}>
                  {step === TESTS.length ? (saving ? 'SAVING…' : 'SEE RESULTS →') : 'NEXT TEST →'}
                </button>
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {isDone && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Movement Battery Results</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 60 }}>YOUR MOVEMENT<br />PROFILE</p>

              {/* Total score */}
              <div style={{ border: '1px solid var(--border)', background: 'var(--black2)', padding: '80px 56px', marginBottom: 2, textAlign: CA }}>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 160, fontWeight: 700, color: scoreColor(total, maxScore), lineHeight: 1, letterSpacing: 4 }}>{total}</p>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, letterSpacing: 6, color: 'var(--silver2)', marginTop: 16 }}>OUT OF {maxScore}</p>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 5, color: scoreColor(total, maxScore), marginTop: 20 }}>{scoreLabel(total, maxScore)}</p>
              </div>

              {/* Per-test breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', borderTop: 'none', marginBottom: 48 }}>
                {TESTS.map(t => {
                  const s     = scores[t.id] ?? 0
                  const col   = scoreColor(s, 3)
                  const lbl   = scoreLabel(s, 3)
                  return (
                    <div key={t.id} style={{ background: 'var(--black2)', padding: '44px 20px', textAlign: CA }}>
                      <span style={{ fontSize: 48, display: 'block', marginBottom: 16 }}>{t.icon}</span>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--silver)', marginBottom: 20, textTransform: UC }}>{t.label}</p>
                      <div style={{ height: 3, background: 'var(--silver4)', marginBottom: 16, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: (s / 3 * 100) + '%', background: col, transition: 'width 1.2s ease' }} />
                      </div>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 56, fontWeight: 700, color: col, marginBottom: 8, letterSpacing: 2 }}>{s}<span style={{ fontSize: 20, color: 'var(--silver3)' }}>/3</span></p>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, letterSpacing: 3, color: col, textTransform: UC }}>{lbl}</p>
                    </div>
                  )
                })}
              </div>

              {/* Weakest movement callout */}
              {(() => {
                const weakest = TESTS.reduce((a, b) => (scores[a.id] ?? 0) <= (scores[b.id] ?? 0) ? a : b)
                const ws      = scores[weakest.id] ?? 0
                const col     = scoreColor(ws, 3)
                return (
                  <div style={{ borderLeft: '6px solid ' + col, border: '1px solid ' + col + '30', background: 'var(--black2)', padding: '40px 48px', marginBottom: 52 }}>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: col, marginBottom: 18, textTransform: UC }}>Priority Movement</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 18 }}>{weakest.label}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', lineHeight: 1.7 }}>
                      Your {weakest.label.toLowerCase()} scored {ws}/3. Focus on {weakest.focus.toLowerCase()} in your next training block. Your movement battery will be reassessed at the end of your current block.
                    </p>
                  </div>
                )
              })()}

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => router.push('/quiz')}>BUILD MY ROUTINE →</button>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>DASHBOARD</button>
                <button className="btn-outline" onClick={() => { setStep(0); setScores({}) }}>RETEST</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}