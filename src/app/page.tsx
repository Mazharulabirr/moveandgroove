'use client'
import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const trustedByLogos = [
    {
      src: 'https://i.logos-download.com/6681/1492-s1280-103d896656e86b8e16ba2769b8b47945.png/Brisbane_Lions_Logo_2010-s1280.png',
      alt: 'Brisbane Lions',
      maxHeight: 88,
    },
    {
      src: 'https://wp.logos-download.com/wp-content/uploads/2024/04/Cricket_Australia_Logo-1958x3000.png',
      alt: 'Cricket Australia',
      maxHeight: 104,
    },
    {
      src: 'https://images.seeklogo.com/logo-png/52/1/queensland-bulls-logo-png_seeklogo-522388.png',
      alt: 'Queensland Bulls',
      maxHeight: 92,
    },
    { src: '/trusted-by-bullets.avif', alt: 'Brisbane Bullets', maxHeight: 88 },
    { src: '/trusted-by-logo.jpg', alt: 'Partner logo', maxHeight: 88 },
    { src: '/trusted-by-heat.png', alt: 'Brisbane Heat', maxHeight: 88 },
  ]

  useEffect(() => {
    if (typeof window === 'undefined') return

    async function forwardRecoverySession() {
      const hash = window.location.hash
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')

      if (hashParams.get('type') !== 'recovery' || !accessToken) return

      if (refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        router.replace('/auth/reset')
        return
      }

      router.replace(`/auth/reset${hash}`)
    }

    void forwardRecoverySession()
  }, [router, supabase])

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'url(https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&q=80&fit=crop&crop=center)',
        backgroundSize: 'cover', backgroundPosition: 'center', opacity: 1,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.76) 40%,rgba(0,0,0,0.9) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <section style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center',
          minHeight: 'calc(100vh - 64px)', padding: '80px clamp(18px, 5vw, 40px)',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            fontFamily: "'Syncopate', sans-serif",
            fontSize: 'clamp(120px, 22vw, 300px)',
            fontWeight: 700, letterSpacing: -4,
            color: 'rgba(0,180,216,0.03)',
            pointerEvents: 'none', userSelect: 'none',
            whiteSpace: 'nowrap', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
          }}>
            MOBILITY
          </div>

          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 5,
            color: 'var(--cyan)', textTransform: 'uppercase', marginBottom: 28,
            animation: 'fadeUp 0.8s 0.2s both',
          }}>
            Evidence-Based Joint Mobility
          </div>

          <h1 style={{
            fontFamily: "'Syncopate', sans-serif",
            fontSize: 'clamp(48px, 10vw, 120px)',
            fontWeight: 700, letterSpacing: 8, lineHeight: 1,
            color: 'var(--white)', marginBottom: 12,
            animation: 'fadeUp 0.8s 0.35s both',
          }} className="mg-hero-mobile-title">
            MOVE<span style={{ color: 'var(--cyan)' }}>&</span>GROOVE
          </h1>

          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(18px, 2.5vw, 24px)',
            fontStyle: 'italic', fontWeight: 300,
            color: 'var(--silver3)', letterSpacing: 3,
            marginBottom: 60,
            animation: 'fadeUp 0.8s 0.5s both',
          }} className="mg-hero-mobile-tagline">
            Trusted by Elite Athletes, Crafted for You
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 60,
            animation: 'fadeUp 0.8s 0.65s both',
            flexWrap: 'wrap', justifyContent: 'center',
            width: '100%',
            maxWidth: 920,
          }}>
            {[
              { label: 'RELEASE',    sub: 'Flexibility',        color: 'var(--silver2)', border: 'var(--silver4)',        bg: 'linear-gradient(135deg,var(--black3),var(--black4))' },
              { op: '+' },
              { label: 'ACTIVATION', sub: 'Strength Endurance', color: 'var(--white)',   border: 'rgba(200,205,212,0.3)', bg: 'linear-gradient(135deg,var(--black4),var(--black3))' },
              { op: '+' },
              { label: 'RANGE',      sub: 'End Range Control',  color: 'var(--cyan)',    border: 'rgba(0,180,216,0.4)',   bg: 'linear-gradient(135deg,rgba(0,180,216,0.08),rgba(0,180,216,0.03))' },
              { op: '=' },
              { label: 'MOBILITY',   sub: '',                   color: 'var(--silver3)', border: 'var(--silver4)',        bg: 'var(--black2)' },
            ].map((item, i) => {
              if ('op' in item) return (
                <span key={i} style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: 'var(--silver4)', fontWeight: 300 }}>
                  {item.op}
                </span>
              )
              return (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{
                    fontFamily: "'Syncopate',sans-serif", fontSize: 11, fontWeight: 700,
                    letterSpacing: 3, textTransform: 'uppercase',
                    padding: '14px clamp(16px, 4vw, 24px)', border: `1px solid ${item.border}`,
                    color: item.color, background: item.bg,
                  }}>
                    {item.label}
                  </div>
                  {item.sub && (
                    <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 13, color: 'var(--silver2)', marginTop: 8 }}>
                      {item.sub}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{
            display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center',
            animation: 'fadeUp 0.8s 0.8s both',
          }}>
            <Link href="/auth" className="btn-primary">SIGN IN / SIGN UP</Link>
          </div>

          <div style={{
            width: '100%',
            maxWidth: 1100,
            marginTop: 96,
            paddingTop: 28,
            borderTop: '1px solid rgba(255,255,255,0.08)',
            animation: 'fadeUp 0.8s 0.95s both',
          }}>
            <div style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10,
              letterSpacing: 5,
              color: 'var(--cyan)',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}>
              Trusted By
            </div>
            <div style={{
              fontFamily: "'Syncopate', sans-serif",
              fontSize: 'clamp(16px,2vw,22px)',
              fontWeight: 700,
              letterSpacing: 3,
              color: 'var(--white)',
              marginBottom: 16,
            }}>
              TEAMS WHO HAVE USED OUR PROGRAM
            </div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 15,
              color: 'var(--silver2)',
              lineHeight: 1.7,
              maxWidth: 760,
              margin: '0 auto 28px',
            }}>
              Built with athletes in mind and already used across high-performance environments.
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))',
              gap: 16,
            }}>
              {trustedByLogos.map((logo) => (
                <div
                  key={logo.src}
                  style={{
                    minHeight: 150,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '22px',
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(8,10,14,0.96) 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <img
                    src={logo.src}
                    alt={logo.alt}
                    style={{
                      maxWidth: '100%',
                      maxHeight: logo.maxHeight,
                      objectFit: 'contain',
                      filter: 'drop-shadow(0 10px 26px rgba(0,0,0,0.25))',
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  )
}
