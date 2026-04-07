import { createClient as createSupabaseClient } from '@supabase/supabase-js'

let browserClient: ReturnType<typeof createSupabaseClient<any>> | null = null

export function createClient() {
  if (browserClient) {
    return browserClient
  }

  browserClient = createSupabaseClient<any>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'implicit',
        persistSession: true,
      },
    }
  )

  return browserClient
}
