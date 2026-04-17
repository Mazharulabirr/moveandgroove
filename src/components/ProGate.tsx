'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getIsPro } from '@/lib/profiles'

const UC = 'uppercase' as const

type ProGateProps = {
  children: React.ReactNode
  title?: string
  description?: string
  features?: string[]
}

export default function ProGate({
  children,
  title = 'PRO FEATURE',
  description = 'Upgrade to unlock programmes, score history, and a deeper planning view.',
  features = ['Unlimited AI routines', 'Training programmes + calendar', 'Extended score history'],
}: ProGateProps) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [isAuthed, setIsAuthed] = useState(false)
  const [isPro, setIsPro] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadAccess() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return

      if (!session) {
        setIsAuthed(false)
        setLoading(false)
        return
      }

      setIsAuthed(true)
      const nextIsPro = await getIsPro(supabase as never, session.user.id)
      if (!mounted) return

      setIsPro(nextIsPro)
      setLoading(false)
    }

    loadAccess()
    return () => {
      mounted = false
    }
  }, [supabase])

  if (loading) {
    return (
      <div style={{ background: 'var(--black2)', border: '1px solid var(--border)', padding: '48px 40px', textAlign: 'center' }}>
        <div className="loading-ring" />
        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 11, letterSpacing: 4, color: 'var(--silver3)', textTransform: UC }}>
          CHECKING ACCESS
        </div>
      </div>
    )
  }

  if (isPro) return <>{children}</>

  return (
    <div style={{
      background: 'linear-gradient(180deg, rgba(0,180,216,0.06) 0%, rgba(8,8,8,0.94) 28%, var(--black2) 100%)',
      border: '1px solid rgba(0,180,216,0.18)',
      padding: '48px 40px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(0,180,216,0.14), transparent 42%)', pointerEvents: 'none' }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 4, color: 'var(--cyan)', textTransform: UC, marginBottom: 14 }}>
          {'// '}{title}
        </div>
        <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 'clamp(24px,4vw,40px)', fontWeight: 700, letterSpacing: 3, color: 'var(--white)', lineHeight: 1.15, marginBottom: 16 }}>
          UNLOCK<br />MOVE&GROOVE PRO
        </div>
        <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, color: 'var(--silver2)', lineHeight: 1.75, maxWidth: 560, marginBottom: 24 }}>
          {description}
        </div>

        <div className="mg-grid-3" style={{ gap: 1, background: 'var(--border)', border: '1px solid var(--border)', marginBottom: 28 }}>
          {features.map((feature) => (
            <div key={feature} style={{ background: 'var(--black3)', padding: '22px 20px' }}>
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 2, color: 'var(--cyan)', textTransform: UC, marginBottom: 8 }}>
                Pro
              </div>
              <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 15, color: 'var(--silver)', lineHeight: 1.6 }}>
                {feature}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/upgrade" className="btn-primary">UPGRADE NOW</Link>
          {isAuthed ? (
            <button className="btn-outline" onClick={() => router.push('/dashboard')}>BACK TO DASHBOARD</button>
          ) : (
            <button className="btn-outline" onClick={() => router.push('/auth')}>SIGN IN</button>
          )}
        </div>
      </div>
    </div>
  )
}
