export const DEMO_EMAIL = 'demo@moveandgroove.com'
export const DEMO_PASSWORD = 'Demo@12345'

const DEMO_SESSION_KEY = 'mg_demo_session'

export function isDemoSessionActive() {
  return typeof window !== 'undefined' && window.localStorage.getItem(DEMO_SESSION_KEY) === 'true'
}

export function startDemoSession() {
  window.localStorage.setItem(DEMO_SESSION_KEY, 'true')
}

export function endDemoSession() {
  window.localStorage.removeItem(DEMO_SESSION_KEY)
}
