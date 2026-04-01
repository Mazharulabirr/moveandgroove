'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'
import { getIsPro } from '@/lib/profiles'

const UC = 'uppercase' as const

export default function UpgradePage() {
  const router = useRouter()
  const supabase = createClient()
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setIsPro(await getIsPro(supabase as never, session.user.id))
    }

    loadProfile()
  }, [supabase])

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'url(https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80&fit=crop&crop=center)',
        backgroundSize: 'cover', backgroundPosition: 'center',
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.86) 0%,rgba(0,0,0,0.76) 45%,rgba(0,0,0,0.95) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div className="mg-page-shell">
          <div style={{ maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 16, textTransform: UC }}>
              {'// Upgrade'}
            </div>
            <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(38px,7vw,72px)', fontWeight: 700, letterSpacing: 4, color: 'var(--white)', lineHeight: 1.05, marginBottom: 18 }}>
              MOVE&GROOVE<br />PRO
            </div>
            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 18, color: 'var(--silver2)', lineHeight: 1.8, maxWidth: 700, margin: '0 auto 34px' }}>
              Unlock planning tools, richer progress history, and the premium layer around your mobility data.
            </div>

            <div className="mg-grid-3" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 30, textAlign: 'left' }}>
              {[
                ['Programs', 'Weekly calendar view and four-week training blocks.'],
                ['Progress', 'Extended score history and trend context across assessments.'],
                ['Access', 'Room for future premium features like billing, exports, and coach tools.'],
              ].map(([title, copy]) => (
                <div key={title} style={{ background: 'var(--black2)', padding: '28px 24px' }}>
                  <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 13, fontWeight: 700, letterSpacing: 3, color: 'var(--white)', marginBottom: 10, textTransform: UC }}>
                    {title}
                  </div>
                  <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver2)', lineHeight: 1.7 }}>
                    {copy}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: 'linear-gradient(180deg, rgba(0,180,216,0.08), rgba(8,8,8,0.96))', border: '1px solid rgba(0,180,216,0.18)', padding: '40px 32px' }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', marginBottom: 10, textTransform: UC }}>
                {'// Current Status'}
              </div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 34, fontWeight: 600, color: 'var(--white)', marginBottom: 14 }}>
                {isPro ? 'Pro access is active' : 'Billing comes next'}
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.8, maxWidth: 620, margin: '0 auto 24px' }}>
                {isPro
                  ? 'Your profile is marked as Pro, so gated features are already unlocked across the app.'
                  : 'The upgrade page and gating flow are live. Payment processing is still a future roadmap item, so this page currently acts as the conversion surface and feature explainer.'}
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button className="btn-primary" onClick={() => router.push('/programs')}>
                  VIEW PRO FEATURES
                </button>
                <button className="btn-outline" onClick={() => router.push('/dashboard')}>
                  BACK TO DASHBOARD
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
