'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

const UC = 'uppercase' as const

export default function ProgramsPage() {
  const router = useRouter()

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: 'url(https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1920&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.76) 45%,rgba(0,0,0,0.95) 100%)',
          }}
        />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div className="mg-page-shell">
          <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
            <div
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                letterSpacing: 4,
                color: 'var(--cyan)',
                marginBottom: 16,
                textTransform: UC,
              }}
            >
              {'// Premium Coming Soon'}
            </div>
            <div
              style={{
                fontFamily: "'Syncopate',sans-serif",
                fontSize: 'clamp(34px,7vw,64px)',
                fontWeight: 700,
                letterSpacing: 3,
                color: 'var(--white)',
                lineHeight: 1.05,
                marginBottom: 18,
              }}
            >
              PROGRAMS
              <br />
              COMING SOON
            </div>
            <div
              style={{
                maxWidth: 620,
                margin: '0 auto 32px',
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 17,
                color: 'var(--silver2)',
                lineHeight: 1.8,
              }}
            >
              Multi-week plans and calendar tooling are being held back until the Basic experience feels polished end
              to end.
            </div>
            <button className="btn-primary" onClick={() => router.push('/dashboard')}>
              BACK TO DASHBOARD
            </button>
          </div>
        </div>
      </main>
    </>
  )
}
