'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

const SPORTS = [
  { id: 'golf',          label: 'Golf',          icon: '⛳' },
  { id: 'afl',           label: 'AFL',           icon: '🏉' },
  { id: 'rugby',         label: 'Rugby',         icon: '🏈' },
  { id: 'soccer',        label: 'Soccer',        icon: '⚽' },
  { id: 'wrestling',     label: 'Wrestling',     icon: '🤼' },
  { id: 'weightlifting', label: 'Weightlifting', icon: '🏋️' },
  { id: 'cricket',       label: 'Cricket',       icon: '🏏' },
  { id: 'tennis',        label: 'Tennis',        icon: '🎾' },
  { id: 'basketball',    label: 'Basketball',    icon: '🏀' },
  { id: 'volleyball',    label: 'Volleyball',    icon: '🏐' },
  { id: 'netball',       label: 'Netball',       icon: '🥅' },
  { id: 'bjj',           label: 'BJJ',           icon: '🥋' },
  { id: 'kickboxing',    label: 'Kickboxing',    icon: '🥊' },
  { id: 'muaythai',      label: 'Muay Thai',     icon: '🩳' },
]

const AREAS = [
  { id: 'hips',      label: 'HIPS',      icon: '🦵', sub: 'Hip flexors · Adductors · Glutes · Piriformis' },
  { id: 'shoulders', label: 'SHOULDERS', icon: '💪', sub: 'Rotator cuff · Capsule · AC joint · Thoracic link' },
  { id: 'spine',     label: 'SPINE',     icon: '🦴', sub: 'Cervical · Thoracic · Lumbar · Facet joints' },
]

const GOALS = [
  { id: 'flexibility', label: 'More Flexibility', icon: '🧘', sub: 'I feel stiff or restricted in movement' },
  { id: 'strength',    label: 'More Strength',    icon: '⚡', sub: 'I need more control at end range' },
  { id: 'balanced',    label: 'Balanced',         icon: '⚖️', sub: 'Equal focus across all three pillars' },
  { id: 'performance', label: 'Performance',      icon: '🏆', sub: 'Pre or post training session' },
]

type Mode = 'sport' | 'area' | null
type Step = 1 | '2a' | '2b' | 3 | 4 | 5

const API = '/api'

export default function QuizPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep]                       = useState<Step>(1)
  const [mode, setMode]                       = useState<Mode>(null)
  const [sport, setSport]                     = useState<string | null>(null)
  const [areas, setAreas]                     = useState<string[]>([])
  const [duration, setDuration]               = useState(20)
  const [goal, setGoal]                       = useState<string | null>(null)
  const [includeFoamRoll, setIncludeFoamRoll] = useState<boolean | null>(null)
  const [loading, setLoading]                 = useState(false)
  const [error, setError]                     = useState('')

  const progress = { 1: 20, '2a': 40, '2b': 40, 3: 60, 4: 80, 5: 95 }[step] || 20

  function toggleArea(id: string) {
    setAreas(prev => prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id])
  }

  async function generateRoutine() {
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()

    const payload = {
      userId: session?.user?.id || null,
      mode,
      sport,
      areas,
      duration,
      goal,
      includeFoamRoll: includeFoamRoll === true,
    }

    console.log('Generating with payload:', payload)
    console.log('Hitting:', `${API}/routines/generate`)

    try {
      const res = await fetch(`${API}/routines/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`Server error ${res.status}: ${text}`)
      }

      const routine = await res.json()
      if (routine.error) throw new Error(routine.error)

      localStorage.setItem('mg_routine', JSON.stringify({
        routine, mode, sport, areas, duration, goal,
      }))

      router.push('/routine')
    } catch (err: any) {
      console.error('Generation error:', err)
      setError(err.message || 'Failed to connect to server')
      setLoading(false)
    }
  }

  const baseCard = {
    background: 'var(--black2)',
    padding: 28,
    cursor: 'pointer',
    transition: 'background 0.2s',
    textAlign: 'center' as const,
    position: 'relative' as const,
  }

  const selectedStyle = {
    background: 'var(--black3)',
    borderBottom: '4px solid var(--cyan)',
    boxShadow: '0 0 16px rgba(0,180,216,0.15)',
  }

  const Q = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(26px,4.5vw,44px)', fontWeight: 700, letterSpacing: 3, color: 'var(--white)', lineHeight: 1.15, marginBottom: 12 }}>
      {children}
    </div>
  )

  const Sub = ({ children }: { children: React.ReactNode }) => (
    <p style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', marginBottom: 36, lineHeight: 1.6 }}>
      {children}
    </p>
  )

  const Nav = ({ back, next, nextDisabled, nextLabel }: { back: () => void; next?: () => void; nextDisabled?: boolean; nextLabel?: string }) => (
    <div style={{ display: 'flex', gap: 12, marginTop: 44 }}>
      <button className="btn-outline" onClick={back}>← BACK</button>
      {next && (
        <button className="btn-primary" disabled={nextDisabled} onClick={next}>
          {nextLabel || 'CONTINUE →'}
        </button>
      )}
    </div>
  )

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'url(https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=1920&q=80&fit=crop&crop=center)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.8) 0%,rgba(0,0,0,0.7) 40%,rgba(0,0,0,0.9) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '56px 48px' }}>

          {/* Progress bar */}
          <div style={{ width: '100%', height: 1, background: 'var(--border)', marginBottom: 52, position: 'relative' }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, height: '100%',
              background: 'linear-gradient(90deg,var(--silver3),var(--cyan))',
              transition: 'width 0.4s cubic-bezier(0.16,1,0.3,1)',
              width: `${progress}%`,
            }} />
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <Q>SPORT OR<br />BODY AREA?</Q>
              <Sub>Select your sport for a targeted routine, or choose specific joints to work on.</Sub>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
                {[
                  { id: 'sport', icon: '🏅', label: 'Sport-Specific',  sub: "Tailored to your sport's biomechanical demands" },
                  { id: 'area',  icon: '🎯', label: 'Body Area Focus', sub: 'Choose which joints you want to work on' },
                ].map(o => (
                  <div key={o.id}
                    onClick={() => setMode(o.id as Mode)}
                    style={{ ...baseCard, ...(mode === o.id ? selectedStyle : {}) }}
                    onMouseEnter={e => { if (mode !== o.id) e.currentTarget.style.background = 'var(--black3)' }}
                    onMouseLeave={e => { if (mode !== o.id) e.currentTarget.style.background = 'var(--black2)' }}
                  >
                    <span style={{ fontSize: 28, marginBottom: 12, display: 'block' }}>{o.icon}</span>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: mode === o.id ? 'var(--cyan)' : 'var(--silver)', marginBottom: 8, textTransform: 'uppercase' }}>{o.label}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.6 }}>{o.sub}</div>
                  </div>
                ))}
              </div>
              <Nav back={() => router.push('/dashboard')} next={() => setStep(mode === 'sport' ? '2a' : '2b')} nextDisabled={!mode} />
            </div>
          )}

          {/* STEP 2A */}
          {step === '2a' && (
            <div>
              <Q>SELECT<br />YOUR SPORT</Q>
              <Sub>Each sport profile is built from peer-reviewed biomechanical and injury research.</Sub>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
                {SPORTS.map(s => (
                  <div key={s.id}
                    onClick={() => setSport(s.id)}
                    style={{ ...baseCard, ...(sport === s.id ? selectedStyle : {}) }}
                    onMouseEnter={e => { if (sport !== s.id) e.currentTarget.style.background = 'var(--black3)' }}
                    onMouseLeave={e => { if (sport !== s.id) e.currentTarget.style.background = 'var(--black2)' }}
                  >
                    <span style={{ fontSize: 22, marginBottom: 8, display: 'block' }}>{s.icon}</span>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: sport === s.id ? 'var(--cyan)' : 'var(--silver)', textTransform: 'uppercase' }}>{s.label}</div>
                  </div>
                ))}
              </div>
              <Nav back={() => setStep(1)} next={() => setStep(3)} nextDisabled={!sport} />
            </div>
          )}

          {/* STEP 2B */}
          {step === '2b' && (
            <div>
              <Q>WHICH AREAS<br />TO WORK?</Q>
              <Sub>Select one or more areas to focus on.</Sub>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
                {AREAS.map(a => (
                  <div key={a.id}
                    onClick={() => toggleArea(a.id)}
                    style={{ ...baseCard, padding: '40px 20px', ...(areas.includes(a.id) ? selectedStyle : {}) }}
                    onMouseEnter={e => { if (!areas.includes(a.id)) e.currentTarget.style.background = 'var(--black3)' }}
                    onMouseLeave={e => { if (!areas.includes(a.id)) e.currentTarget.style.background = 'var(--black2)' }}
                  >
                    <span style={{ fontSize: 40, marginBottom: 16, display: 'block' }}>{a.icon}</span>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 14, fontWeight: 700, letterSpacing: 3, color: areas.includes(a.id) ? 'var(--cyan)' : 'var(--silver)', marginBottom: 12 }}>{a.label}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--silver2)', lineHeight: 1.6 }}>{a.sub}</div>
                  </div>
                ))}
              </div>
              <Nav back={() => setStep(1)} next={() => setStep(3)} nextDisabled={areas.length === 0} />
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <Q>HOW LONG<br />TODAY?</Q>
              <Sub>Exercise volume and hold times are scaled to fit your available window.</Sub>
              <div style={{ border: '1px solid var(--border)', padding: 44, background: 'var(--black2)' }}>
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 108, fontWeight: 700, letterSpacing: 4, color: 'var(--white)', lineHeight: 1, marginBottom: 4 }}>
                  {duration}
                </div>
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 13, letterSpacing: 5, color: 'var(--silver2)', marginBottom: 36, textTransform: 'uppercase' }}>
                  minutes
                </div>
                <input type="range" min="15" max="45" step="5" value={duration}
                  onChange={e => setDuration(parseInt(e.target.value))}
                  style={{ width: '100%', height: 1, background: 'var(--silver4)', outline: 'none', cursor: 'pointer', WebkitAppearance: 'none' as any }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontFamily: "'DM Mono',monospace", fontSize: 9, color: 'var(--silver4)' }}>
                  {[15,20,25,30,35,40,45].map(n => <span key={n}>{n}</span>)}
                </div>
              </div>
              <Nav back={() => setStep(mode === 'sport' ? '2a' : '2b')} next={() => setStep(4)} />
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div>
              <Q>WHAT'S YOUR<br />MAIN FOCUS?</Q>
              <Sub>This determines how the three pillars are weighted for your session.</Sub>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)', border: '1px solid var(--border)' }}>
                {GOALS.map(g => (
                  <div key={g.id}
                    onClick={() => setGoal(g.id)}
                    style={{ ...baseCard, ...(goal === g.id ? selectedStyle : {}) }}
                    onMouseEnter={e => { if (goal !== g.id) e.currentTarget.style.background = 'var(--black3)' }}
                    onMouseLeave={e => { if (goal !== g.id) e.currentTarget.style.background = 'var(--black2)' }}
                  >
                    <span style={{ fontSize: 28, marginBottom: 12, display: 'block' }}>{g.icon}</span>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: goal === g.id ? 'var(--cyan)' : 'var(--silver)', marginBottom: 8, textTransform: 'uppercase' }}>{g.label}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.6 }}>{g.sub}</div>
                  </div>
                ))}
              </div>
              <Nav back={() => setStep(3)} next={() => setStep(5)} nextDisabled={!goal} />
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div>
              <Q>INCLUDE FOAM<br />ROLL PREP?</Q>
              <Sub>A short myofascial release phase before your session reduces tissue tension and prepares your joints for loading.</Sub>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 44 }}>
                {[
                  { val: true,  icon: '🫧', label: 'YES — Include Prep',   sub: 'Adds foam roll exercises before Release. Duration adjusted automatically.' },
                  { val: false, icon: '⚡', label: 'NO — Skip to Release', sub: 'Jump straight into stretching and mobility work.' },
                ].map(o => (
                  <div key={String(o.val)}
                    onClick={() => setIncludeFoamRoll(o.val)}
                    style={{ ...baseCard, ...(includeFoamRoll === o.val ? selectedStyle : {}) }}
                    onMouseEnter={e => { if (includeFoamRoll !== o.val) e.currentTarget.style.background = 'var(--black3)' }}
                    onMouseLeave={e => { if (includeFoamRoll !== o.val) e.currentTarget.style.background = 'var(--black2)' }}
                  >
                    <span style={{ fontSize: 32, marginBottom: 12, display: 'block' }}>{o.icon}</span>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, color: includeFoamRoll === o.val ? 'var(--cyan)' : 'var(--silver)', marginBottom: 8, textTransform: 'uppercase' }}>{o.label}</div>
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: 'var(--silver2)', lineHeight: 1.6 }}>{o.sub}</div>
                  </div>
                ))}
              </div>

              {error && (
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: '#e74c3c', marginBottom: 16, padding: '10px 14px', borderLeft: '2px solid #e74c3c', background: 'rgba(231,76,60,0.06)' }}>
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-outline" onClick={() => setStep(4)}>← BACK</button>
                <button className="btn-primary" disabled={includeFoamRoll === null || loading} onClick={generateRoutine}>
                  {loading ? 'GENERATING…' : 'GENERATE ROUTINE →'}
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </>
  )
}