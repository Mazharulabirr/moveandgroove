'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

type Tab = 'signin' | 'signup'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()

  const [tab, setTab]               = useState<Tab>('signin')
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [forgotSent, setForgotSent] = useState(false)

  const [siEmail, setSiEmail]       = useState('')
  const [siPassword, setSiPassword] = useState('')

  const [suName, setSuName]         = useState('')
  const [suEmail, setSuEmail]       = useState('')
  const [suPassword, setSuPassword] = useState('')

  async function handleSignIn() {
    setError(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPassword })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  async function handleSignUp() {
    setError(''); setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPassword,
      options: { data: { full_name: suName } },
    })
    if (error) {
      const msg = error.message.toLowerCase().includes('already')
        ? 'This email is already registered. Please sign in instead.'
        : error.message
      setError(msg); setLoading(false); return
    }

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{ id: data.user.id, is_pro: false }], { onConflict: 'id' })

      if (profileError) {
        console.warn('[auth.handleSignUp] profile upsert skipped', profileError.message)
      }
    }

    router.push('/dashboard')
  }

  async function handleForgotPassword() {
    setError('')
    if (!siEmail) {
      setError('Please enter your email address first.')
      return
    }

    setLoading(true)
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(siEmail, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })

    if (resetError) {
      setError(resetError.message)
      setLoading(false)
      return
    }

    setForgotSent(true)
    setLoading(false)
  }

  return (
    <>
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        backgroundImage: 'url(https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80&fit=crop&crop=center)',
        backgroundSize: 'cover', backgroundPosition: 'center', opacity: 1,
      }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.65) 40%,rgba(0,0,0,0.82) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <section style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: 'calc(100vh - 64px)', padding: 40,
        }}>
          <div style={{ width: '100%', maxWidth: 440 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'var(--cyan3)', marginBottom: 16, textTransform: 'uppercase' }}>
              {'// Account Access'}
            </div>
            <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: 4, color: 'var(--white)', marginBottom: 40, lineHeight: 1.25 }}>
              SIGN IN TO<br />YOUR PROGRAMME
            </div>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 36 }}>
              {(['signin', 'signup'] as Tab[]).map(t => (
                <button key={t} onClick={() => { setTab(t); setError(''); setForgotSent(false) }} style={{
                  fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: 3, textTransform: 'uppercase',
                  padding: '12px 24px 12px 0', color: tab === t ? 'var(--white)' : 'var(--silver3)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: tab === t ? '2px solid var(--cyan)' : '2px solid transparent',
                  marginBottom: -1,
                }}>
                  {t === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
                </button>
              ))}
            </div>

            {tab === 'signin' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="your@email.com"
                    value={siEmail} onChange={e => setSiEmail(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="********"
                    value={siPassword} onChange={e => setSiPassword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
                </div>
                <button className="btn-primary" onClick={handleSignIn} disabled={loading}
                  style={{ width: '100%', marginTop: 12, padding: 18 }}>
                  {loading ? 'SIGNING IN...' : 'SIGN IN'}
                </button>
                <div style={{ textAlign: 'right', marginTop: 12 }}>
                  <button className="btn-ghost" onClick={handleForgotPassword}
                    style={{ fontSize: 10, letterSpacing: 2, color: 'var(--cyan3)' }}>
                    FORGOT PASSWORD?
                  </button>
                </div>
                {error && <div className="auth-error">{error}</div>}
                {forgotSent && (
                  <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: 'var(--cyan)', marginTop: 12, padding: '10px 14px', borderLeft: '2px solid var(--cyan)', background: 'rgba(0,180,216,0.06)' }}>
                    Reset link sent - check your email.
                  </div>
                )}
              </div>
            )}

            {tab === 'signup' && (
              <div>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input className="form-input" type="text" placeholder="Your name"
                    value={suName} onChange={e => setSuName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input className="form-input" type="email" placeholder="your@email.com"
                    value={suEmail} onChange={e => setSuEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input className="form-input" type="password" placeholder="Minimum 6 characters"
                    value={suPassword} onChange={e => setSuPassword(e.target.value)} />
                </div>
                <button className="btn-primary" onClick={handleSignUp} disabled={loading}
                  style={{ width: '100%', marginTop: 12, padding: 18 }}>
                  {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
                </button>
                {error && <div className="auth-error">{error}</div>}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
