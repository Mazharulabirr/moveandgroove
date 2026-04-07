'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import { createClient } from '@/lib/supabase/client'

const UC = 'uppercase' as const

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [status, setStatus] = useState('Checking reset link...')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [saved, setSaved] = useState(false)
  const [debugInfo, setDebugInfo] = useState<Record<string, string | boolean | null>>({})

  useEffect(() => {
    let mounted = true
    const code = searchParams.get('code')
    const tokenHash = searchParams.get('token_hash')
    const typeParam = searchParams.get('type')

    async function initRecoverySession() {
      if (typeof window !== 'undefined') {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        setDebugInfo({
          code: code ?? null,
          tokenHash: tokenHash ?? null,
          typeParam: typeParam ?? null,
          hashType: hashParams.get('type') ?? null,
          hasHashAccessToken: Boolean(hashParams.get('access_token')),
          hasHashRefreshToken: Boolean(hashParams.get('refresh_token')),
          hashFragmentPresent: Boolean(window.location.hash),
        })
      }

      if (tokenHash && typeParam === 'recovery') {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'recovery',
        })

        if (!mounted) return

        if (verifyError) {
          setReady(false)
          setStatus('This reset link could not be verified. Please request a new password reset email.')
          setError(verifyError.message)
          return
        }

        setReady(true)
        setStatus('Enter a new password for your account.')
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

        if (!mounted) return

        if (exchangeError) {
          setReady(false)
          setStatus('This reset link could not be verified. Please request a new password reset email.')
          setError(exchangeError.message)
          return
        }

        setReady(true)
        setStatus('Enter a new password for your account.')
        return
      }

      if (typeof window !== 'undefined' && window.location.hash) {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')

        if (type === 'recovery' && accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })

          if (!mounted) return

          if (sessionError) {
            setReady(false)
            setStatus('This reset link could not be verified. Please request a new password reset email.')
            setError(sessionError.message)
            return
          }

          window.history.replaceState({}, '', '/auth/reset')
          setReady(true)
          setStatus('Enter a new password for your account.')
          return
        }

        if (type === 'recovery' && accessToken) {
          setReady(false)
          setStatus('Verifying your reset link...')

          for (let attempt = 0; attempt < 8; attempt += 1) {
            await new Promise((resolve) => window.setTimeout(resolve, 300))

            const {
              data: { session },
            } = await supabase.auth.getSession()

            if (!mounted) return

            if (session) {
              setDebugInfo((current) => ({ ...current, hasSession: true }))
              setReady(true)
              setStatus('Enter a new password for your account.')
              return
            }
          }

          setReady(false)
          setStatus('This reset link is still being verified. If it does not unlock in a moment, open the link from your email again.')
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()

      if (!mounted) return

      setDebugInfo((current) => ({ ...current, hasSession: Boolean(session) }))

      if (session) {
        setReady(true)
        setStatus('Enter a new password for your account.')
      } else {
        setReady(false)
        setStatus('Open this page from your password reset email so we can verify the recovery session.')
      }
    }

    void initRecoverySession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return

      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true)
        setStatus('Enter a new password for your account.')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [searchParams, supabase])

  async function handleResetPassword() {
    setError('')

    if (!ready) {
      setError('This reset link is not active yet. Open the link from your email again.')
      return
    }

    if (password.length < 6) {
      setError('Please use a password with at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match yet.')
      return
    }

    setLoading(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSaved(true)
    setStatus('Password updated. You can now sign in with your new password.')
    setLoading(false)
  }

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
          opacity: 1,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom,rgba(0,0,0,0.75) 0%,rgba(0,0,0,0.65) 40%,rgba(0,0,0,0.82) 100%)' }} />
      </div>

      <Header />

      <main style={{ position: 'relative', zIndex: 2, paddingTop: 64 }}>
        <section
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 'calc(100vh - 64px)',
            padding: 40,
          }}
        >
          <div style={{ width: '100%', maxWidth: 440 }}>
            <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 9, letterSpacing: 4, color: 'var(--cyan3)', marginBottom: 16, textTransform: UC }}>
              {'// Password Recovery'}
            </div>

            <div style={{ fontFamily: "'Syncopate',sans-serif", fontSize: 26, fontWeight: 700, letterSpacing: 4, color: 'var(--white)', marginBottom: 20, lineHeight: 1.25, textTransform: UC }}>
              RESET YOUR
              <br />
              PASSWORD
            </div>

            <div style={{ fontFamily: "'DM Sans',sans-serif", fontSize: 16, lineHeight: 1.7, color: 'var(--silver2)', marginBottom: 36 }}>
              {status}
            </div>

            {!ready && Object.keys(debugInfo).length > 0 && (
              <div style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: 'var(--silver3)', marginBottom: 24, padding: '12px 14px', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.03)', lineHeight: 1.8 }}>
                {Object.entries(debugInfo).map(([key, value]) => (
                  <div key={key}>
                    {key}: {String(value)}
                  </div>
                ))}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                disabled={saved}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="Re-enter your new password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleResetPassword()
                  }
                }}
                disabled={saved}
              />
            </div>

            <button
              className="btn-primary"
              onClick={handleResetPassword}
              disabled={loading || saved}
              style={{ width: '100%', marginTop: 12, padding: 18 }}
            >
              {loading ? 'UPDATING...' : saved ? 'PASSWORD UPDATED' : 'SAVE NEW PASSWORD'}
            </button>

            <button
              className="btn-outline"
              onClick={() => router.push('/auth')}
              style={{ width: '100%', marginTop: 14, padding: 18 }}
            >
              BACK TO SIGN IN
            </button>

            {error && <div className="auth-error">{error}</div>}
          </div>
        </section>
      </main>
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}
