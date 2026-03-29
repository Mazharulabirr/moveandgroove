'use client'
import Link from 'next/link'
import Header from '@/components/Header'

export default function HomePage() {
  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'url(https://images.unsplash.com/photo-1526506118085-60ce8714f8c5?w=1920&q=80&fit=crop&crop=center)',
        backgroundSize: 'cover', backgroundPosition: 'center', opacity: 1,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.65) 40%,rgba(0,0,0,0.82) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <section style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', textAlign: 'center',
          minHeight: 'calc(100vh - 64px)', padding: '80px 40px',
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
          }}>
            MOVE<span style={{ color: 'var(--cyan)' }}>&</span>GROOVE
          </h1>

          <p style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 'clamp(18px, 2.5vw, 24px)',
            fontStyle: 'italic', fontWeight: 300,
            color: 'var(--silver3)', letterSpacing: 3,
            marginBottom: 60,
            animation: 'fadeUp 0.8s 0.5s both',
          }}>
            Trusted by Elite Athletes, Crafted for You
          </p>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 12, marginBottom: 60,
            animation: 'fadeUp 0.8s 0.65s both',
            flexWrap: 'wrap', justifyContent: 'center',
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
                    padding: '14px 24px', border: `1px solid ${item.border}`,
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
            <Link href="/auth" className="btn-primary">GET STARTED</Link>
            <Link href="/quiz" className="btn-outline">TRY DEMO</Link>
          </div>
        </section>
      </main>
    </>
  )
}