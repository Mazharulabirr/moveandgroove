'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { IconRecovery, IconRoutine } from '@/components/Icons'
import { createClient } from '@/lib/supabase/client'

const UC = 'uppercase' as const
const DURATIONS = [15, 20, 30]

export default function RecoveryPage() {
  const router = useRouter()
  const supabase = createClient()
  const [duration, setDuration] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function generateRecoverySession() {
    setLoading(true)
    setError('')

    const { data: { session } } = await supabase.auth.getSession()

    try {
      const response = await fetch('/api/routines/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session?.user?.id || null,
          mode: 'area',
          sport: null,
          areas: ['hips', 'shoulders', 'spine'],
          duration,
          goal: 'flexibility',
          includeFoamRoll: true,
        }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`Server error ${response.status}: ${text}`)
      }

      const routine = await response.json()
      if (routine.error) {
        throw new Error(routine.error)
      }

      localStorage.setItem(
        'mg_routine',
        JSON.stringify({
          routine,
          mode: 'area',
          sport: null,
          areas: ['hips', 'shoulders', 'spine'],
          duration,
          goal: 'flexibility',
          source: 'recovery',
        }),
      )

      router.push('/routine')
    } catch (err: unknown) {
      console.error('[recovery.generate]', err)
      setError(err instanceof Error ? err.message : 'Failed to generate recovery session')
      setLoading(false)
    }
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          background: '#000',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'url(/athlete-backgrounds/athletix-foam-roll.jpg)',
            backgroundSize: 'min(1200px, 84vw) auto',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center 20%',
            opacity: 0.52,
          }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.5) 0%,rgba(0,0,0,0.52) 45%,rgba(0,0,0,0.7) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div className="mg-page-shell">
          <div className="mg-split-section" style={{ alignItems: 'flex-end', marginBottom: 42, paddingBottom: 28, borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 14, textTransform: UC }}>
                {'// Recovery Builder'}
              </div>
              <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(34px,6vw,62px)', fontWeight: 700, letterSpacing: 4, color: 'var(--white)', lineHeight: 1.05, marginBottom: 14 }}>
                RECOVER
                <br />
                AND RESET
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 17, color: 'var(--silver2)', lineHeight: 1.75, maxWidth: 620 }}>
                Build a guided foam roll and release session in one tap. We use the existing routine generator with flexibility focus and foam roll prep already switched on.
              </div>
            </div>

            <button className="btn-outline" onClick={() => router.push('/dashboard')}>
              DASHBOARD
            </button>
          </div>

          <div className="mg-grid-2" style={{ gap: 24, alignItems: 'stretch' }}>
            <section style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '36px 34px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <IconRoutine size={24} color="var(--cyan)" />
                <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', textTransform: UC }}>
                  Choose Duration
                </div>
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7, marginBottom: 26 }}>
                Select the time you have and the release flow will scale to match it.
              </div>

              <div className="mg-grid-3" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 26 }}>
                {DURATIONS.map((value) => {
                  const selected = value === duration
                  return (
                    <button
                      key={value}
                      onClick={() => setDuration(value)}
                      style={{
                        background: selected ? 'var(--black3)' : 'var(--black2)',
                        border: 'none',
                        borderBottom: selected ? '3px solid var(--cyan)' : '3px solid transparent',
                        padding: '28px 18px',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 34, fontWeight: 700, color: selected ? 'var(--white)' : 'var(--silver)', lineHeight: 1, marginBottom: 8 }}>
                        {value}
                      </div>
                      <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, color: selected ? 'var(--cyan)' : 'var(--silver3)', textTransform: UC }}>
                        Minutes
                      </div>
                    </button>
                  )
                })}
              </div>

              {error && <div className="auth-error" style={{ marginBottom: 18 }}>{error}</div>}

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={generateRecoverySession} disabled={loading}>
                  {loading ? 'GENERATING...' : 'GENERATE SESSION'}
                </button>
                <button className="btn-outline" onClick={() => router.push('/quiz')}>
                  FULL BUILDER
                </button>
              </div>
            </section>

            <section style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '36px 34px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <IconRecovery size={24} color="var(--cyan)" />
                <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', textTransform: UC }}>
                  {'// Session Blueprint'}
                </div>
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 34, fontWeight: 600, color: 'var(--white)', marginBottom: 18 }}>
                Foam Roll + Release
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {['Flexibility goal', 'Prep included', 'Hips · Shoulders · Spine'].map((tag) => (
                  <span key={tag} className="meta-chip">{tag}</span>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  ['01', 'Prep', 'Foam roll work to ease tissue tension before stretching.'],
                  ['02', 'Release', 'AI-generated holds and mobility drills tuned to your chosen duration.'],
                  ['03', 'Flow', 'Balanced volume across the trunk, hips, and shoulders.'],
                ].map(([index, title, copy]) => (
                  <div key={title} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 16, padding: '18px 0', borderTop: '1px solid var(--border2)' }}>
                    <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 18, fontWeight: 700, color: 'var(--cyan)', lineHeight: 1 }}>
                      {index}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 8, textTransform: UC }}>
                        {title}
                      </div>
                      <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7 }}>
                        {copy}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  )
}

