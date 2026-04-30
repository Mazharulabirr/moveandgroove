'use client'

import { useRouter } from 'next/navigation'
import Header from '@/components/Header'

const UC = 'uppercase' as const

export default function UpgradePage() {
  const router = useRouter()

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          backgroundImage: 'url(https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80&fit=crop&crop=center)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to bottom,rgba(0,0,0,0.86) 0%,rgba(0,0,0,0.76) 45%,rgba(0,0,0,0.95) 100%)',
          }}
        />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <div className="mg-page-shell">
          <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
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
                fontSize: 'clamp(36px,7vw,68px)',
                fontWeight: 700,
                letterSpacing: 4,
                color: 'var(--white)',
                lineHeight: 1.05,
                marginBottom: 18,
              }}
            >
              UNLIMITED ROUTINES
              <br />
              COMING SOON
            </div>
            <div
              style={{
                maxWidth: 680,
                margin: '0 auto 28px',
                fontFamily: "'DM Sans',sans-serif",
                fontSize: 18,
                color: 'var(--silver2)',
                lineHeight: 1.8,
              }}
            >
              Premium is not live yet. For now we are keeping the spotlight on making the Basic routine flow reliable,
              clinically sound, and easy to use.
            </div>

            <div
              style={{
                background: 'linear-gradient(180deg, rgba(0,180,216,0.08), rgba(8,8,8,0.96))',
                border: '1px solid rgba(0,180,216,0.18)',
                padding: '36px 32px',
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  fontFamily: "'Cormorant Garamond',serif",
                  fontSize: 34,
                  fontWeight: 600,
                  color: 'var(--white)',
                  marginBottom: 12,
                }}
              >
                Premium features are on hold for now
              </div>
              <div
                style={{
                  maxWidth: 620,
                  margin: '0 auto',
                  fontFamily: "'DM Sans',sans-serif",
                  fontSize: 16,
                  color: 'var(--silver2)',
                  lineHeight: 1.8,
                }}
              >
                When Premium returns, it will be built on top of a polished Basic product instead of a half-finished
                teaser.
              </div>
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
