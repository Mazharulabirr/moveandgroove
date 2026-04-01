'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { Icon, type IconName } from '@/components/Icons'
import { createClient } from '@/lib/supabase/client'

const UC = 'uppercase' as const
const CA = 'center' as const

type Test = {
  id: string
  label: string
  icon: IconName
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
    icon: 'deepSquat',
    focus: 'Hips · Ankles · Thoracic Spine',
    what: 'The deep squat tests bilateral lower-body mobility plus thoracic extension and overhead position.',
    instruction: 'Stand with feet shoulder-width apart and toes slightly out. Hold a dowel or broomstick overhead with arms fully extended. Squat as deep as possible, keeping heels flat and chest up.',
    photo: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=700&q=80&fit=crop',
    ytSearch: 'deep+squat+FMS+movement+screen+how+to+score',
    scores: [
      { value: 3, label: 'Full depth', description: 'Hips below knees, heels flat, torso upright, stick directly overhead' },
      { value: 2, label: 'Partial depth', description: 'Near full depth with minor compensation such as heel rise or trunk tilt' },
      { value: 1, label: 'Poor depth', description: 'Cannot reach parallel or uses significant compensation' },
      { value: 0, label: 'Pain', description: 'Pain is present during the movement' },
    ],
  },
  {
    id: 'hip_hinge',
    label: 'HIP HINGE',
    icon: 'hipHinge',
    focus: 'Hamstrings · Glutes · Lower Back',
    what: 'The hip hinge tests your ability to load the posterior chain while maintaining a neutral spine.',
    instruction: 'Stand tall with feet hip-width apart. Place a dowel along your spine touching head, upper back, and tailbone. Hinge forward at the hips while keeping all three contact points.',
    photo: 'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=700&q=80&fit=crop',
    ytSearch: 'hip+hinge+movement+screen+assessment+how+to',
    scores: [
      { value: 3, label: 'Perfect hinge', description: 'All three contact points stay in place with clean range' },
      { value: 2, label: 'Good hinge', description: 'Minor rounding or one contact point is lost' },
      { value: 1, label: 'Poor hinge', description: 'Significant compensation or knee-dominant pattern' },
      { value: 0, label: 'Pain', description: 'Pain is present during the movement' },
    ],
  },
  {
    id: 'shoulder_press',
    label: 'SHOULDER PRESS',
    icon: 'shoulderPress',
    focus: 'Shoulder Flexion · Thoracic Extension · Lat Length',
    what: 'Tests overhead shoulder mobility and stability without compensating through the lower back.',
    instruction: 'Stand with your back flat against a wall, feet slightly forward. Slide both arms up the wall, trying to get them fully overhead while keeping the lower back flat.',
    photo: 'https://images.unsplash.com/photo-1597452485669-2c7bb5fef90d?w=700&q=80&fit=crop',
    ytSearch: 'shoulder+overhead+press+mobility+wall+test+assessment',
    scores: [
      { value: 3, label: 'Full overhead', description: 'Both arms reach vertical and the lower back stays flat' },
      { value: 2, label: 'Near overhead', description: 'Arms nearly vertical with only minor compensation' },
      { value: 1, label: 'Restricted', description: 'Arms stop well before vertical or the back lifts off' },
      { value: 0, label: 'Pain', description: 'Pain is present during the movement' },
    ],
  },
  {
    id: 'lunge',
    label: 'INLINE LUNGE',
    icon: 'lunge',
    focus: 'Hip Flexor · Quad · Glute · Knee Stability',
    what: 'The inline lunge tests hip mobility, knee stability, and trunk control in the sagittal plane.',
    instruction: 'Stand on a line or place a stick on the floor. Step forward into a lunge with your front foot on the line and lower your back knee behind the front heel while keeping the torso tall.',
    photo: 'https://images.unsplash.com/photo-1434608519344-49d77a124f2a?w=700&q=80&fit=crop',
    ytSearch: 'inline+lunge+FMS+movement+screen+assessment',
    scores: [
      { value: 3, label: 'Clean lunge', description: 'Trunk stays upright and the front knee tracks well' },
      { value: 2, label: 'Minor fault', description: 'Small balance loss or slight knee or trunk deviation' },
      { value: 1, label: 'Major fault', description: 'Large balance loss, collapse, or incomplete movement' },
      { value: 0, label: 'Pain', description: 'Pain is present during the movement' },
    ],
  },
  {
    id: 'rotation',
    label: 'SEATED ROTATION',
    icon: 'rotation',
    focus: 'Thoracic Spine · Rib Cage · Shoulder Girdle',
    what: 'Tests thoracic rotation, a key movement quality for athletes and desk workers alike.',
    instruction: 'Sit upright on a chair with feet flat. Cross your arms over your chest and rotate left then right while the hips and feet stay completely still.',
    photo: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80&fit=crop',
    ytSearch: 'thoracic+rotation+mobility+test+seated+assessment+FMS',
    scores: [
      { value: 3, label: 'Full rotation', description: 'Strong rotation both ways without hip movement' },
      { value: 2, label: 'Good rotation', description: 'Minor asymmetry or slight hip shift' },
      { value: 1, label: 'Poor rotation', description: 'Limited range or clear compensation' },
      { value: 0, label: 'Pain', description: 'Pain is present during the movement' },
    ],
  },
]

type BatteryScores = Record<string, number>

function totalScore(scores: BatteryScores) {
  return Object.values(scores).reduce((sum, value) => sum + value, 0)
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
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [scores, setScores] = useState<BatteryScores>({})
  const [saving, setSaving] = useState(false)

  const test = TESTS[step - 1]
  const progress = step === 0 ? 0 : Math.round((step / TESTS.length) * 100)
  const isDone = step > TESTS.length

  function pick(testId: string, value: number) {
    setScores((prev) => ({ ...prev, [testId]: value }))
  }

  function next() {
    if (step <= TESTS.length) {
      setStep((current) => current + 1)
    }
    if (step === TESTS.length) {
      void finish()
    }
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
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const uid = session?.user?.id
      if (uid) {
        await supabase.from('test_results').insert([
          {
            user_id: uid,
            scores,
            total_score: totalScore(scores),
            max_score: TESTS.length * 3,
            assessed_at: new Date().toISOString(),
          },
        ])
      }
    } catch (error) {
      console.error('[battery]', error)
    }
    setSaving(false)
  }

  const total = totalScore(scores)
  const maxScore = TESTS.length * 3

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'url(https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1920&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.75) 40%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <div style={{ position: 'relative', zIndex: 2, paddingTop: 80 }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '60px 100px' }}>
          {step === 0 && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Movement Battery</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 80, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 28 }}>
                5 MOVEMENT
                <br />
                TESTS
              </p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 24, lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 64, maxWidth: 700 }}>
                Five fundamental movement patterns scored 0-3. Takes about 10 minutes and identifies your weakest patterns for the next training block.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 64 }}>
                {TESTS.map((item, index) => (
                  <div key={item.id} style={{ background: 'var(--black2)', padding: '40px 16px', textAlign: CA }}>
                    <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 12, letterSpacing: 3, color: 'var(--silver3)', display: 'block', marginBottom: 12 }}>0{index + 1}</span>
                    <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Icon name={item.icon} size={38} color="var(--cyan)" /></span>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--cyan)', marginBottom: 8 }}>{item.label}</p>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1, color: 'var(--silver3)', lineHeight: 1.5 }}>{item.focus}</p>
                  </div>
                ))}
              </div>

              <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '28px 36px', marginBottom: 56, display: 'flex', gap: 48 }}>
                {[
                  { n: '3', label: 'Perfect - no compensation' },
                  { n: '2', label: 'Good - minor compensation' },
                  { n: '1', label: 'Poor - major fault' },
                  { n: '0', label: 'Pain present' },
                ].map((item) => (
                  <div key={item.n} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 32, fontWeight: 700, color: 'var(--cyan)', minWidth: 28 }}>{item.n}</span>
                    <span style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'var(--silver2)' }}>{item.label}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>BACK</button>
                <button className="btn-primary" onClick={() => setStep(1)}>BEGIN TESTS</button>
              </div>
            </div>
          )}

          {step > 0 && !isDone && test && (
            <div key={step} style={{ animation: 'fadeUp 0.35s ease forwards' }}>
              <div style={{ width: '100%', height: 3, background: 'var(--border)', marginBottom: 16, position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg,var(--silver3),var(--cyan))', transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 4, color: 'var(--silver3)', marginBottom: 44, textTransform: UC }}>Test {step} of {TESTS.length}</p>

              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 16, background: 'rgba(0,180,216,0.12)', border: '1px solid rgba(0,180,216,0.3)', padding: '18px 40px', marginBottom: 44 }}>
                <Icon name={test.icon} size={36} color="var(--cyan)" />
                <span style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: 4, color: 'var(--cyan)', textTransform: UC }}>{test.label}</span>
              </div>

              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 3, color: 'var(--silver3)', marginBottom: 12, textTransform: UC }}>{test.focus}</p>
              <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', marginBottom: 44, lineHeight: 1.6, maxWidth: 900 }}>{test.what}</p>

              <div style={{ display: 'grid', gridTemplateColumns: '480px 1fr', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 48 }}>
                <div style={{ background: 'var(--black2)', padding: '40px 36px', display: 'flex', flexDirection: 'column', gap: 28 }}>
                  <div>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color: 'var(--cyan)', marginBottom: 18, textTransform: UC }}>How to perform</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 20, lineHeight: 1.85, color: 'var(--silver)' }}>{test.instruction}</p>
                  </div>
                  <div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={test.photo} alt={test.label} style={{ width: '100%', display: 'block', opacity: 0.88 }} />
                    <a href={`https://www.youtube.com/results?search_query=${test.ytSearch}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: CA, gap: 12, background: 'rgba(255,0,0,0.12)', border: '1px solid rgba(255,0,0,0.3)', padding: '16px 20px', textDecoration: 'none', marginTop: 2 }}>
                      <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 2, color: '#ff6b6b' }}>FIND DEMO VIDEO</span>
                    </a>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, background: 'var(--border)' }}>
                  {test.scores.map((score) => {
                    const selected = scores[test.id] === score.value
                    const color = score.value === 0 ? '#e74c3c' : score.value === 1 ? '#e8a94a' : score.value === 2 ? '#4ac8e8' : '#00b4d8'
                    return (
                      <div key={score.value} onClick={() => pick(test.id, score.value)} style={{ flex: 1, background: selected ? 'var(--black3)' : 'var(--black2)', padding: '32px 48px', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: 28, borderLeft: selected ? `6px solid ${color}` : '6px solid transparent' }}>
                        <span style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 36, fontWeight: 700, color: selected ? color : 'var(--silver4)', minWidth: 48, flexShrink: 0 }}>{score.value}</span>
                        <div>
                          <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 16, fontWeight: 700, color: selected ? 'var(--white)' : 'var(--silver)', letterSpacing: 2, marginBottom: 6 }}>{score.label}</p>
                          <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, color: selected ? 'var(--silver2)' : 'var(--silver3)', lineHeight: 1.4 }}>{score.description}</p>
                        </div>
                        {selected && <span style={{ marginLeft: 'auto', display: 'flex' }}><Icon name="checkin" size={26} color={color} /></span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16 }}>
                <button className="btn-outline" onClick={back}>BACK</button>
                <button className="btn-primary" disabled={scores[test.id] === undefined} onClick={next}>
                  {step === TESTS.length ? (saving ? 'SAVING...' : 'SEE RESULTS') : 'NEXT TEST'}
                </button>
              </div>
            </div>
          )}

          {isDone && (
            <div style={{ animation: 'fadeUp 0.5s ease forwards' }}>
              <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 15, letterSpacing: 6, color: 'var(--cyan)', marginBottom: 32, textTransform: UC }}>Movement Battery Results</p>
              <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 72, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', lineHeight: 1.05, marginBottom: 60 }}>
                YOUR MOVEMENT
                <br />
                PROFILE
              </p>

              <div style={{ border: '1px solid var(--border)', background: 'var(--black2)', padding: '80px 56px', marginBottom: 2, textAlign: CA }}>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 160, fontWeight: 700, color: scoreColor(total, maxScore), lineHeight: 1, letterSpacing: 4 }}>{total}</p>
                <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 18, letterSpacing: 6, color: 'var(--silver2)', marginTop: 16 }}>OUT OF {maxScore}</p>
                <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 5, color: scoreColor(total, maxScore), marginTop: 20 }}>{scoreLabel(total, maxScore)}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 2, background: 'var(--border)', border: '1px solid var(--border)', borderTop: 'none', marginBottom: 48 }}>
                {TESTS.map((item) => {
                  const score = scores[item.id] ?? 0
                  const color = scoreColor(score, 3)
                  const label = scoreLabel(score, 3)
                  return (
                    <div key={item.id} style={{ background: 'var(--black2)', padding: '44px 20px', textAlign: CA }}>
                      <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><Icon name={item.icon} size={40} color={color} /></span>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 2, color: 'var(--silver)', marginBottom: 20, textTransform: UC }}>{item.label}</p>
                      <div style={{ height: 3, background: 'var(--silver4)', marginBottom: 16, position: 'relative' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, height: '100%', width: `${(score / 3) * 100}%`, background: color, transition: 'width 1.2s ease' }} />
                      </div>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 56, fontWeight: 700, color, marginBottom: 8, letterSpacing: 2 }}>{score}<span style={{ fontSize: 20, color: 'var(--silver3)' }}>/3</span></p>
                      <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, letterSpacing: 3, color, textTransform: UC }}>{label}</p>
                    </div>
                  )
                })}
              </div>

              {(() => {
                const weakest = TESTS.reduce((a, b) => ((scores[a.id] ?? 0) <= (scores[b.id] ?? 0) ? a : b))
                const weakestScore = scores[weakest.id] ?? 0
                const color = scoreColor(weakestScore, 3)
                return (
                  <div style={{ borderLeft: `6px solid ${color}`, border: `1px solid ${color}30`, background: 'var(--black2)', padding: '40px 48px', marginBottom: 52 }}>
                    <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 3, color, marginBottom: 18, textTransform: UC }}>Priority Movement</p>
                    <p style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 28, fontWeight: 700, letterSpacing: 2, color: 'var(--white)', marginBottom: 18 }}>{weakest.label}</p>
                    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 22, color: 'var(--silver2)', lineHeight: 1.7 }}>
                      Your {weakest.label.toLowerCase()} scored {weakestScore}/3. Focus on {weakest.focus.toLowerCase()} in your next training block, then retest at the end of the block.
                    </p>
                  </div>
                )
              })()}

              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => router.push('/quiz')}>BUILD MY ROUTINE</button>
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
